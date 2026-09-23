const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const PredictionLeagueScore = require('../models/PredictionLeagueScore');
const config = require('../config/env');
const logger = require('../config/logger');

// Utilidad para hashear tokens de refresco
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Generadores de tokens
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    config.jwtAccessSecret,
    { expiresIn: config.jwtAccessExpiresIn }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshExpiresIn }
  );
};

const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
  });
};

// 1. Registro de Usuario
const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
    }

    // Cost factor 12 para bcrypt
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

    const newUser = new User({
      email,
      passwordHash
    });

    // Generar tokens
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);
    newUser.refreshToken = hashToken(refreshToken);

    await newUser.save();

    // Inicializar score en la liga de pronósticos
    await PredictionLeagueScore.create({
      userId: newUser._id,
      totalPoints: 0,
      exactHits: 0,
      resultHits: 0
    });

    setRefreshTokenCookie(res, refreshToken);

    logger.info(`Usuario registrado exitosamente: ${newUser.email}`);

    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser._id,
        email: newUser.email,
        favoriteTeamId: newUser.favoriteTeamId,
        totpEnabled: newUser.totpEnabled
      },
      accessToken
    });
  } catch (error) {
    logger.error('Error en registro:', error.message);
    return res.status(500).json({ error: 'Error interno al registrar usuario.' });
  }
};

// 2. Inicio de Sesión
const login = async (req, res) => {
  try {
    const { email, password, totpCode } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // Manejo de 2FA
    if (user.totpEnabled) {
      if (!totpCode) {
        return res.status(200).json({
          requires2FA: true,
          message: 'Se requiere código 2FA para completar el inicio de sesión.'
        });
      }

      const is2FAValid = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: 'base32',
        token: totpCode,
        window: 1
      });

      if (!is2FAValid) {
        return res.status(401).json({ error: 'Código 2FA incorrecto o expirado.' });
      }
    }

    // Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = hashToken(refreshToken);
    await user.save();

    setRefreshTokenCookie(res, refreshToken);

    logger.info(`Inicio de sesión exitoso: ${user.email}`);

    return res.json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: user._id,
        email: user.email,
        favoriteTeamId: user.favoriteTeamId,
        totpEnabled: user.totpEnabled
      },
      accessToken
    });
  } catch (error) {
    logger.error('Error en login:', error.message);
    return res.status(500).json({ error: 'Error interno al iniciar sesión.' });
  }
};

// 3. Rotación de Refresh Token
const refreshToken = async (req, res) => {
  try {
    const incomingRefreshToken = req.cookies?.refreshToken;
    if (!incomingRefreshToken) {
      return res.status(401).json({ error: 'Refresh token no proporcionado.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(incomingRefreshToken, config.jwtRefreshSecret);
    } catch (err) {
      res.clearCookie('refreshToken');
      return res.status(401).json({ error: 'Refresh token inválido o expirado.' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.refreshToken) {
      res.clearCookie('refreshToken');
      return res.status(401).json({ error: 'Sesión no válida.' });
    }

    // Validar token actual contra el hash almacenado
    if (user.refreshToken !== hashToken(incomingRefreshToken)) {
      // Detección de reuso de token: invalidar sesión completa por seguridad
      user.refreshToken = null;
      await user.save();
      res.clearCookie('refreshToken');
      return res.status(403).json({ error: 'Alerta de seguridad: reuso de token detectado.' });
    }

    // Rotar tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = hashToken(newRefreshToken);
    await user.save();

    setRefreshTokenCookie(res, newRefreshToken);

    return res.json({
      accessToken: newAccessToken,
      user: {
        id: user._id,
        email: user.email,
        favoriteTeamId: user.favoriteTeamId,
        totpEnabled: user.totpEnabled
      }
    });
  } catch (error) {
    logger.error('Error en refresh token:', error.message);
    return res.status(500).json({ error: 'Error al renovar sesión.' });
  }
};

// 4. Cerrar Sesión
const logout = async (req, res) => {
  try {
    const incomingRefreshToken = req.cookies?.refreshToken;
    if (incomingRefreshToken) {
      try {
        const decoded = jwt.verify(incomingRefreshToken, config.jwtRefreshSecret);
        await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
      } catch (e) {
        // Ignorar fallo de verificación al cerrar sesión
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict'
    });

    return res.json({ message: 'Sesión finalizada con éxito.' });
  } catch (error) {
    logger.error('Error en logout:', error.message);
    return res.status(500).json({ error: 'Error al cerrar sesión.' });
  }
};

// 5. Perfil de Usuario Actual
const getMe = async (req, res) => {
  return res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      favoriteTeamId: req.user.favoriteTeamId,
      totpEnabled: req.user.totpEnabled,
      createdAt: req.user.createdAt
    }
  });
};

// 6. Configuración 2FA (Generar QR y secreto)
const setup2FA = async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `Football Hub (${req.user.email})`
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Guardar temporalmente en el usuario hasta verificación
    await User.findByIdAndUpdate(req.user._id, { totpSecret: secret.base32 });

    return res.json({
      secret: secret.base32,
      qrCodeUrl,
      message: 'Escanea el código QR con tu app de autenticación (Google Authenticator, Authy, etc.).'
    });
  } catch (error) {
    logger.error('Error configurando 2FA:', error.message);
    return res.status(500).json({ error: 'No se pudo generar la clave 2FA.' });
  }
};

// 7. Verificación y activación de 2FA
const verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id);

    if (!user || !user.totpSecret) {
      return res.status(400).json({ error: 'Inicia la configuración de 2FA primero.' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (!verified) {
      return res.status(400).json({ error: 'Código de verificación incorrecto.' });
    }

    user.totpEnabled = true;
    await user.save();

    logger.info(`2FA activado con éxito para usuario ${user.email}`);

    return res.json({
      message: 'Autenticación de dos factores (2FA) activada correctamente.',
      totpEnabled: true
    });
  } catch (error) {
    logger.error('Error verificando 2FA:', error.message);
    return res.status(500).json({ error: 'Error al verificar 2FA.' });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  setup2FA,
  verify2FA
};
