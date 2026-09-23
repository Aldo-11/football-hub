const rateLimit = require('express-rate-limit');

// Límite para intentos de autenticación: máx 10 peticiones cada 15 minutos por IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos de acceso desde esta IP. Por favor espera 15 minutos.'
  }
});

// Límite general de API: 120 peticiones por minuto
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Límite de peticiones de API excedido. Intenta más tarde.'
  }
});

module.exports = {
  authLimiter,
  apiLimiter
};
