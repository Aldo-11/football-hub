const rateLimit = require('express-rate-limit');

const envInt = (name, fallback) => parseInt(process.env[name], 10) || fallback;

// Intentos de autenticación: máx. 10 cada 15 minutos por IP (fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: envInt('AUTH_RATE_LIMIT_MAX', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos desde esta IP. Espera 15 minutos.', code: 'RATE_LIMITED' }
});

// Límite general de la API: 120 peticiones por minuto por IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: envInt('API_RATE_LIMIT_MAX', 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Límite de peticiones excedido. Intenta más tarde.', code: 'RATE_LIMITED' }
});

module.exports = { authLimiter, apiLimiter };
