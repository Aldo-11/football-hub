const mongoose = require('mongoose');
const config = require('./env');
const logger = require('./logger');

const RETRY_MS = 15000;

/**
 * Causa general del último fallo, sin detalles internos (el endpoint de
 * salud es público; el mensaje completo solo va a los logs del servidor).
 */
const classifyError = (message = '') => {
  if (/MONGO_URI no está configurada/.test(message)) return 'Falta la variable MONGO_URI';
  if (/auth|authentication|bad auth/i.test(message)) return 'Usuario o contraseña de MongoDB incorrectos';
  if (/ENOTFOUND|querySrv|ETIMEOUT|timed out|ECONNREFUSED|whitelist|IP/i.test(message)) {
    return 'No se alcanza el servidor de MongoDB (revisa la URI y Network Access en Atlas)';
  }
  return 'Error de conexión con MongoDB (ver logs)';
};

/** Estado legible de la conexión (para /api/health). */
const dbStatus = () => {
  const states = { 0: 'desconectada', 1: 'conectada', 2: 'conectando', 3: 'desconectando' };
  const state = states[mongoose.connection.readyState] || 'desconocido';
  return {
    configured: Boolean(config.mongoUri),
    state,
    problem: state !== 'conectada' && dbStatus.lastError ? classifyError(dbStatus.lastError) : null
  };
};

/** Conecta una vez. Lanza error si falla. */
const connectDB = async () => {
  if (!config.mongoUri) {
    throw new Error('MONGO_URI no está configurada en las variables de entorno.');
  }
  const conn = await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  dbStatus.lastError = null;
  logger.info(`MongoDB conectado: ${conn.connection.host}`);
  return conn;
};

/**
 * Conecta en segundo plano y reintenta cada 15 s si falla, sin tumbar el
 * servidor: así el sitio sigue respondiendo y /api/health indica la causa
 * (en un hosting, que el proceso muera se ve solo como un "503").
 */
const connectWithRetry = () => {
  connectDB().catch((error) => {
    // Nunca se registra la URI (contiene la contraseña)
    dbStatus.lastError = error.message.replace(/mongodb(\+srv)?:\/\/[^\s]+/g, 'mongodb://***');
    logger.error(`No se pudo conectar a MongoDB: ${dbStatus.lastError}. Reintento en ${RETRY_MS / 1000} s.`);
    if (config.mongoUri) setTimeout(connectWithRetry, RETRY_MS).unref();
  });
};

mongoose.connection.on('disconnected', () => logger.warn('Conexión con MongoDB perdida.'));
mongoose.connection.on('error', (err) => logger.error(`Error de MongoDB: ${err.message}`));

module.exports = connectDB;
module.exports.connectWithRetry = connectWithRetry;
module.exports.dbStatus = dbStatus;
module.exports.classifyError = classifyError;
