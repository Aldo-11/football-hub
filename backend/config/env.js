const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Cargar .env desde la raíz del proyecto (nunca se versiona; ver .env.example)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Limpia valores pegados en paneles de hosting: espacios y comillas
 * sobrantes al inicio o al final (p. ej. `...w=majority"`).
 */
const clean = (value) => (typeof value === 'string'
  ? value.trim().replace(/^["'\s]+|["'\s]+$/g, '')
  : value);
const cleanUrl = (value) => (clean(value) || '').replace(/\/+$/, '') || undefined;

const nodeEnv = clean(process.env.NODE_ENV) || 'development';
const isProduction = nodeEnv === 'production';

/**
 * Los secretos JWT son obligatorios en producción (mínimo 32 caracteres).
 * En desarrollo/test, si faltan, se genera uno aleatorio por proceso: las
 * sesiones no sobreviven a un reinicio, pero nunca hay un secreto conocido
 * escrito en el código.
 */
const resolveSecret = (name) => {
  const value = clean(process.env[name]);
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

/**
 * Número de proxies delante de la app (Hostinger, Nginx, Cloudflare…).
 * Necesario para que Express obtenga la IP real del cliente y el límite de
 * peticiones sea por usuario y no global. Por defecto: 1 en producción.
 */
const resolveTrustProxy = () => {
  const v = process.env.TRUST_PROXY;
  if (v === undefined || v === '') return isProduction ? 1 : false;
  if (v === 'true') return true;
  if (v === 'false') return false;
  const n = parseInt(v, 10);
  return Number.isInteger(n) ? n : v;
};

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv,
  isProduction,
  frontendUrl: cleanUrl(process.env.FRONTEND_URL) || 'http://localhost:5173',
  mongoUri: clean(process.env.MONGO_URI) || undefined,
  jwtAccessSecret: resolveSecret('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: resolveSecret('JWT_REFRESH_SECRET'),
  jwtAccessExpiresIn: '15m',
  jwtRefreshExpiresIn: '7d',
  refreshCookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  bcryptRounds: 12,
  enableCron: process.env.ENABLE_CRON !== 'false',
  trustProxy: resolveTrustProxy()
};

module.exports = config;
module.exports.clean = clean;
module.exports.cleanUrl = cleanUrl;
