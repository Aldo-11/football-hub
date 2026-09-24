const jwt = require('jsonwebtoken');
const config = require('../config/env');
const logger = require('../config/logger');
const User = require('../models/User');

/** Exige un access token JWT válido en la cabecera Authorization: Bearer. */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso no autorizado: token no proporcionado', code: 'NO_TOKEN' });
  }

  let decoded;
  try {
    decoded = jwt.verify(authHeader.slice(7), config.jwtAccessSecret, { algorithms: ['HS256'] });
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
    return res.status(401).json({ error: code === 'TOKEN_EXPIRED' ? 'Token expirado' : 'Token inválido', code });
  }

  try {
    const user = await User.findById(decoded.id).select('-passwordHash -totpSecret -refreshToken');
    if (!user) {
      return res.status(401).json({ error: 'Sesión no válida', code: 'USER_NOT_FOUND' });
    }
    req.user = user;
    return next();
  } catch (error) {
    logger.error(`Error de autenticación: ${error.message}`);
    return res.status(500).json({ error: 'Error de autenticación', code: 'AUTH_ERROR' });
  }
};

module.exports = requireAuth;
