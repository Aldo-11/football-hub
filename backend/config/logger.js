const winston = require('winston');
const config = require('./env');

const logger = winston.createLogger({
  level: config.nodeEnv === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'football-hub-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, source, ...meta }) => {
          const sourceTag = source ? ` [SOURCE: ${source}]` : '';
          const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level}${sourceTag}: ${message}${metaStr}`;
        })
      )
    })
  ]
});

// Helper para auditar fuentes de datos
logger.auditSource = (source, endpoint, details = {}) => {
  logger.info(`Football data served for ${endpoint}`, { source, ...details });
};

module.exports = logger;
