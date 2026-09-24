/**
 * Manejo centralizado de fechas.
 *
 * El backend SIEMPRE entrega fechas ISO 8601 en UTC (terminadas en "Z").
 * Aquí se muestran en la zona horaria del navegador del usuario usando Intl,
 * indicando explícitamente cuál es. Ningún componente debe formatear fechas
 * por su cuenta.
 */
const LOCALE = 'es-ES';

export const userTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const toDate = (iso) => {
  if (iso === null || iso === undefined || iso === '') return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const fmt = (iso, options, timeZone = userTimeZone()) => {
  const d = toDate(iso);
  return d ? new Intl.DateTimeFormat(LOCALE, { timeZone, ...options }).format(d) : '—';
};

/** "sáb, 03 oct 2026" */
export const formatMatchDate = (iso, timeZone) =>
  fmt(iso, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }, timeZone);

/** "03 oct" */
export const formatShortDate = (iso, timeZone) => fmt(iso, { day: '2-digit', month: 'short' }, timeZone);

/** "16:00" (24 h) */
export const formatTime = (iso, timeZone) => fmt(iso, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, timeZone);

/** Abreviatura de la zona horaria, p. ej. "GMT-6" o "CEST" */
export const timeZoneName = (iso, timeZone = userTimeZone()) => {
  const d = toDate(iso) || new Date();
  const part = new Intl.DateTimeFormat(LOCALE, { timeZone, timeZoneName: 'short' })
    .formatToParts(d).find((p) => p.type === 'timeZoneName');
  return part ? part.value : timeZone;
};

/** "hace 3 h", "hace 2 d" — para noticias */
export const formatRelative = (iso, now = new Date()) => {
  const d = toDate(iso);
  if (!d) return null;
  const minutes = Math.round((now - d) / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return formatShortDate(iso);
};
