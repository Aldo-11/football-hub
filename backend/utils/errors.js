/**
 * Errores tipados. `expose` indica si el mensaje puede mostrarse al cliente;
 * los detalles internos (stack, mensajes de librerías) nunca se envían.
 */
class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL_ERROR', expose = status < 500 } = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.expose = expose;
  }
}

/** Fallo de una fuente externa (API caída, timeout, rate limit, formato). */
class UpstreamError extends AppError {
  constructor(message, code = 'UPSTREAM_ERROR', { status = 503 } = {}) {
    super(message, { status, code, expose: true });
    this.name = 'UpstreamError';
  }
}

const notFound = (message = 'Recurso no encontrado') => new AppError(message, { status: 404, code: 'NOT_FOUND' });
const badRequest = (message) => new AppError(message, { status: 400, code: 'BAD_REQUEST' });

/** Envuelve controladores async para delegar errores al manejador global. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { AppError, UpstreamError, notFound, badRequest, asyncHandler };
