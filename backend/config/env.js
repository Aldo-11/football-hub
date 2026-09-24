const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Cargar .env desde la raíz del proyecto (nunca se versiona; ver .env.example)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

/**
 * Los secretos JWT son obligatorios en producción (mínimo 32 caracteres).
 * En desarrollo/test, si faltan, se genera uno aleatorio por proceso: las
 * sesiones no sobreviven a un reinicio, pero nunca hay un secreto conocido
 * escrito en el código.
 */
const resolveSecret = (name) => {
  const value = process.env[name];
  if (value && value.length >= 32) return value;
  if (isProduction) {
    throw new Error(`${name} debe definirse con al menos 32 caracteres en producción.`);
  }
  if (value) {
    // eslint-disable-next-line no-console
    console.warn(`[config] ${name} tiene menos de 32 caracteres; se usará un secreto aleatorio temporal.`);
  }
  return crypto.randomBytes(48).toString('hex');
};

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv,
  isProduction,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGO_URI,
  jwtAccessSecret: resolveSecret('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: resolveSecret('JWT_REFRESH_SECRET'),
  jwtAccessExpiresIn: '15m',
  jwtRefreshExpiresIn: '7d',
  refreshCookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  bcryptRounds: 12,
  enableCron: process.env.ENABLE_CRON !== 'false'
};

module.exports = config;
