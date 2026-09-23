const mongoose = require('mongoose');
const config = require('./env');
const logger = require('./logger');

const connectDB = async () => {
  try {
    if (!config.mongoUri) {
      throw new Error('MONGO_URI no está configurada en las variables de entorno.');
    }

    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 8000
    });

    logger.info(`MongoDB Atlas conectado: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error('Error al conectar con MongoDB Atlas:', error.message);
    throw error;
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('Conexión con MongoDB perdida. Reintentando...');
});

mongoose.connection.on('error', (err) => {
  logger.error('Error de MongoDB:', err.message);
});

module.exports = connectDB;
