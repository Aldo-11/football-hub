const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const matchesController = require('./controllers/matchesController');
const { startPredictionsCron } = require('./jobs/resolvePredictions');

const app = express();

// 1. Seguridad HTTP con Helmet
app.use(helmet());

// 2. CORS restringido al frontend
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Middlewares de parseo
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// 4. Rate Limiter global para API
app.use('/api', apiLimiter);

// 5. Logging de peticiones HTTP
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug(`${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`);
  });
  next();
});

// 6. Rutas de salud del servidor y diagnósticos
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health/football', matchesController.getFootballHealth);

// 7. Rutas principales
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/teams', require('./routes/teamsRoutes'));
app.use('/api/matches', require('./routes/matchesRoutes'));
app.use('/api/predict', require('./routes/predictionEngineRoutes'));
app.use('/api/news', require('./routes/newsRoutes'));
app.use('/api/predictions', require('./routes/predictionsRoutes'));
app.use('/api/leaderboard', require('./routes/leaderboardRoutes'));

// 8. Manejo de rutas inexistentes (404)
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// 9. Manejador de errores global
app.use((err, req, res, next) => {
  logger.error('Error no controlado en Express:', err.stack);
  res.status(err.status || 500).json({
    error: 'Error interno del servidor',
    message: config.nodeEnv === 'development' ? err.message : undefined
  });
});

// 10. Inicialización
const startServer = async () => {
  try {
    await connectDB();
    startPredictionsCron();
    const server = app.listen(config.port, () => {
      logger.info(`Football Hub Backend corriendo en http://localhost:${config.port} [${config.nodeEnv}]`);
    });
    return server;
  } catch (error) {
    logger.error('Error fatal al iniciar servidor:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
