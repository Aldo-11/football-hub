const path = require('path');
const dotenv = require('dotenv');

// Cargar .env desde la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGO_URI,
  footballDataKey: process.env.FOOTBALL_DATA_KEY || '',
  rapidApiKey: process.env.RAPIDAPI_KEY || '',
  rapidApiHost: process.env.RAPIDAPI_HOST || 'sportapi7.p.rapidapi.com',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_for_dev_32char_min',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_for_dev_32char_min',
  jwtAccessExpiresIn: '15m',
  jwtRefreshExpiresIn: '7d',
  newsApiKey: process.env.NEWSAPI_KEY || '',
  gnewsKey: process.env.GNEWS_KEY || '',
  bcryptRounds: 12
};

module.exports = config;
