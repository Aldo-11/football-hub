/**
 * Temporada deportiva actual.
 *
 * Las ligas europeas corren de julio a junio. La temporada se calcula a partir
 * de la fecha actual en lugar de estar escrita a mano:
 *   - julio..diciembre de 2026  -> temporada 2026-2027
 *   - enero..junio de 2027      -> temporada 2026-2027
 *
 * SEASON_START_YEAR permite fijarla manualmente (p. ej. para revisar una
 * temporada pasada), pero por defecto se deriva del reloj.
 */
const SEASON_START_MONTH = 6; // julio (0-indexado)

const seasonStartYearFor = (date = new Date()) => {
  const year = date.getUTCFullYear();
  return date.getUTCMonth() >= SEASON_START_MONTH ? year : year - 1;
};

const getCurrentSeason = (now = new Date()) => {
  const override = parseInt(process.env.SEASON_START_YEAR, 10);
  const startYear = Number.isInteger(override) ? override : seasonStartYearFor(now);

  return {
    startYear,
    label: `${startYear}-${startYear + 1}`,
    // ESPN identifica la temporada 2026-2027 como "2026" (año de inicio)
    espnSeason: startYear,
    // Ventana de fechas válida para partidos de liga de esta temporada (UTC)
    startsAt: new Date(Date.UTC(startYear, SEASON_START_MONTH, 1)),
    endsAt: new Date(Date.UTC(startYear + 1, SEASON_START_MONTH, 1))
  };
};

const isWithinSeason = (isoDate, season = getCurrentSeason()) => {
  const t = new Date(isoDate).getTime();
  if (Number.isNaN(t)) return false;
  return t >= season.startsAt.getTime() && t < season.endsAt.getTime();
};

module.exports = { getCurrentSeason, isWithinSeason, seasonStartYearFor };
