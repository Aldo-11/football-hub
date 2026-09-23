const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Acceso no autorizado: Token no proporcionado', code: 'NO_TOKEN' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, config.jwtAccessSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Token inválido', code: 'TOKEN_INVALID' });
    }

    const user = await User.findById(decoded.id).select('-passwordHash -totpSecret');
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error de autenticación', details: error.message });
  }
};

module.exports = requireAuth;
