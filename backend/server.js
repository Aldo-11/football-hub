const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const { connectWithRetry, dbStatus } = require('./config/db');
const logger = require('./config/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { AppError } = require('./utils/errors');
const footballController = require('./controllers/footballController');
const { startPredictionsCron } = require('./jobs/resolvePredictions');

const app = express();

// 1. Cabeceras de seguridad (CSP, HSTS, X-Content-Type-Options, etc.)
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
// CSP sin comodines ni 'unsafe-inline': fuentes y estilos se sirven desde el
// propio sitio y las únicas imágenes externas son escudos y fotos de ESPN.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'https://*.espncdn.com'],
      styleSrc: ["'self'"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  // 'credentialless' aísla el documento sin romper las imágenes de ESPN,
  // que no envían Cross-Origin-Resource-Policy.
  crossOriginEmbedderPolicy: { policy: 'credentialless' }
}));
// Desactiva APIs del navegador que la app no usa.
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  next();
});

// 2. CORS restringido al origen del frontend
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Parseo con límite de tamaño
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// 4. Límite de peticiones para toda la API
app.use('/api', apiLimiter);

// 5. Registro de peticiones
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => logger.debug(`${req.method} ${req.originalUrl} [${res.statusCode}] ${Date.now() - start}ms`));
  next();
});

// 6. Salud
app.get('/api/health', (req, res) => {
  const db = dbStatus();
  res.status(db.state === 'conectada' ? 200 : 503).json({
    status: db.state === 'conectada' ? 'ok' : 'degraded',
    database: db,
    environment: config.nodeEnv,
    timestamp: new Date().toISOString()
  });
});
app.get('/api/health/football', footballController.footballHealth);

// 7. Rutas
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/clubs', require('./routes/clubsRoutes'));
app.use('/api', require('./routes/footballRoutes'));
app.use('/api/predictions', require('./routes/predictionsRoutes'));
app.use('/api/leaderboard', require('./routes/leaderboardRoutes'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada', code: 'NOT_FOUND' }));

// 8. Si existe el frontend compilado (npm run build), el backend también lo sirve
const distDir = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada', code: 'NOT_FOUND' }));

// 9. Manejador global: nunca expone stack ni mensajes internos al cliente
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON mal formado', code: 'BAD_JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Petición demasiado grande', code: 'PAYLOAD_TOO_LARGE' });
  }
  if (err instanceof AppError && err.expose) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  logger.error(`Error no controlado en ${req.method} ${req.originalUrl}: ${err.stack || err.message}`);
  return res.status(500).json({ error: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
});

let server = null;

const startServer = () => {
  // Idempotente: puede llamarse desde server.js de la raíz y desde este archivo
  if (server) return server;
  // El servidor escucha de inmediato; MongoDB se conecta (y reintenta) en segundo plano
  server = app.listen(config.port, () => {
    logger.info(`Football Hub escuchando en el puerto ${config.port} [${config.nodeEnv}]`);
  });
  connectWithRetry();
  if (config.enableCron) startPredictionsCron();
  return server;
};

// Arranca si se ejecuta directamente (node backend/server.js) o si lo carga
// Phusion Passenger, el gestor de apps Node de hostings como Hostinger
// (con Passenger, require.main no es este archivo).
if (require.main === module || typeof globalThis.PhusionPassenger !== 'undefined') {
  startServer();
}

module.exports = { app, startServer };
