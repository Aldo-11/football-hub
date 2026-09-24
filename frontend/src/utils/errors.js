/** Mensaje legible a partir de un error de axios (sin detalles técnicos). */
export const errorMessage = (err, fallback = 'No se pudo completar la operación.') => {
  if (!err) return fallback;
  if (!err.response) return 'No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  const data = err.response.data || {};
  if (data.details?.length) return data.details[0].message;
  return data.error || fallback;
};
