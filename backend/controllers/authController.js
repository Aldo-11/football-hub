const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const PredictionLeagueScore = require('../models/PredictionLeagueScore');
const config = require('../config/env');
const logger = require('../config/logger');
const { asyncHandler } = require('../utils/errors');

/**
 * Autenticación:
 *  - Contraseñas con bcrypt (coste 12). La política de robustez se valida con
 *    zod en la ruta (validation/schemas.js), independiente del frontend.
 *  - Access token JWT (15 min) en memoria del cliente.
 *  - Refresh token JWT (7 días) en cookie httpOnly + SameSite=Strict; en BD
 *    solo se guarda su hash SHA-256 y se rota en cada uso (detecta reutilización).
 *  - 2FA opcional con TOTP.
 */

const JWT_ALGORITHM = 'HS256';
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Hash ficticio para igualar el tiempo de respuesta cuando el usuario no existe
// (evita enumerar correos midiendo tiempos).
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), config.bcryptRounds);

const cookieOptions = () => ({
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'strict',
  path: '/api/auth'
});

const issueTokens = async (user, res) => {
  const accessToken = jwt.sign({ id: user._id }, config.jwtAccessSecret, {
    expiresIn: config.jwtAccessExpiresIn, algorithm: JWT_ALGORITHM
  });
  // jti aleatorio: dos refresh emitidos en el mismo segundo nunca coinciden
  const refreshToken = jwt.sign({ id: user._id, jti: crypto.randomUUID() }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn, algorithm: JWT_ALGORITHM
  });
  user.refreshToken = hashToken(refreshToken);
  await user.save();
  res.cookie('refreshToken', refreshToken, { ...cookieOptions(), maxAge: config.refreshCookieMaxAgeMs });
  return accessToken;
};

const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (await User.exists({ email })) {
    return res.status(409).json({ error: 'El correo electrónico ya está registrado.', code: 'EMAIL_IN_USE' });
  }

  const user = new User({ email, passwordHash: await bcrypt.hash(password, config.bcryptRounds) });
  const accessToken = await issueTokens(user, res);
  await PredictionLeagueScore.create({ userId: user._id });

  logger.info(`Usuario registrado: ${user._id}`);
  return res.status(201).json({ message: 'Usuario registrado', user: user.toPublicJSON(), accessToken });
});

const login = asyncHandler(async (req, res) => {
  const { email, password, totpCode } = req.body;
  const user = await User.findOne({ email });

  const validPassword = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !validPassword) {
    return res.status(401).json({ error: 'Credenciales inválidas.', code: 'INVALID_CREDENTIALS' });
  }

  if (user.totpEnabled) {
    if (!totpCode) {
      return res.status(200).json({ requires2FA: true, message: 'Introduce el código de tu app de autenticación.' });
    }
    const ok = speakeasy.totp.verify({ secret: user.totpSecret, encoding: 'base32', token: totpCode, window: 1 });
    if (!ok) return res.status(401).json({ error: 'Código 2FA incorrecto o expirado.', code: 'INVALID_2FA' });
  }

  const accessToken = await issueTokens(user, res);
  return res.json({ message: 'Inicio de sesión correcto', user: user.toPublicJSON(), accessToken });
});

const refreshToken = asyncHandler(async (req, res) => {
  const incoming = req.cookies?.refreshToken;
  if (!incoming) return res.status(401).json({ error: 'Sesión no iniciada.', code: 'NO_REFRESH_TOKEN' });

  let decoded;
  try {
    decoded = jwt.verify(incoming, config.jwtRefreshSecret, { algorithms: [JWT_ALGORITHM] });
  } catch (err) {
    res.clearCookie('refreshToken', cookieOptions());
    return res.status(401).json({ error: 'La sesión expiró.', code: 'REFRESH_INVALID' });
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.refreshToken) {
    res.clearCookie('refreshToken', cookieOptions());
    return res.status(401).json({ error: 'Sesión no válida.', code: 'SESSION_INVALID' });
  }

  if (user.refreshToken !== hashToken(incoming)) {
    // Un refresh token ya rotado se volvió a usar: se invalida la sesión completa
    user.refreshToken = null;
    await user.save();
    res.clearCookie('refreshToken', cookieOptions());
    logger.warn(`Reutilización de refresh token detectada para el usuario ${user._id}`);
    return res.status(403).json({ error: 'Sesión invalidada por seguridad. Inicia sesión de nuevo.', code: 'REFRESH_REUSE' });
  }

  const accessToken = await issueTokens(user, res);
  return res.json({ accessToken, user: user.toPublicJSON() });
});

const logout = asyncHandler(async (req, res) => {
  const incoming = req.cookies?.refreshToken;
  if (incoming) {
    try {
      const decoded = jwt.verify(incoming, config.jwtRefreshSecret, { algorithms: [JWT_ALGORITHM] });
      await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
    } catch (e) {
      // Token inválido o expirado: igualmente se borra la cookie
    }
  }
  res.clearCookie('refreshToken', cookieOptions());
  return res.json({ message: 'Sesión finalizada.' });
});

const getMe = (req, res) => res.json({ user: req.user.toPublicJSON() });

const setup2FA = asyncHandler(async (req, res) => {
  if (req.user.totpEnabled) {
    return res.status(409).json({ error: 'La autenticación en dos pasos ya está activa.', code: '2FA_ALREADY_ENABLED' });
  }
  const secret = speakeasy.generateSecret({ name: `Football Hub (${req.user.email})` });
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
  // El secreto queda pendiente hasta que el usuario lo verifique con un código
  await User.findByIdAndUpdate(req.user._id, { totpSecret: secret.base32, totpEnabled: false });
  return res.json({ secret: secret.base32, qrCodeUrl });
});

const verify2FA = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user?.totpSecret) {
    return res.status(400).json({ error: 'Inicia primero la configuración de 2FA.', code: '2FA_NOT_STARTED' });
  }
  const ok = speakeasy.totp.verify({ secret: user.totpSecret, encoding: 'base32', token: req.body.token, window: 1 });
  if (!ok) return res.status(400).json({ error: 'Código de verificación incorrecto.', code: 'INVALID_2FA' });

  user.totpEnabled = true;
  await user.save();
  return res.json({ message: '2FA activado.', totpEnabled: true });
});

module.exports = { register, login, refreshToken, logout, getMe, setup2FA, verify2FA };
