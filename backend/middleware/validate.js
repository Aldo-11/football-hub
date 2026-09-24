/**
 * Valida y normaliza `req[source]` con un esquema zod.
 * Los datos validados reemplazan a los originales (se descartan campos extra).
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    return res.status(400).json({
      error: 'Error de validación',
      code: 'VALIDATION_ERROR',
      details: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
  }
  if (source === 'query') {
    // En Express 4 req.query es un getter; se guarda aparte para no depender de él
    req.validatedQuery = result.data;
  } else {
    req[source] = result.data;
  }
  return next();
};

module.exports = validate;
