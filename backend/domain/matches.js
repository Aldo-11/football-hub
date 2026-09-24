/**
 * Reglas para clasificar partidos de un club.
 *
 *  - Pasado:   la fuente lo marca como FINISHED (terminado de verdad).
 *  - En juego: IN_PLAY.
 *  - Futuro:   SCHEDULED y con fecha/hora posterior a "ahora".
 *  - Aplazados/cancelados se reportan aparte y no cuentan como jugados.
 *
 * No se fuerza ninguna cantidad: si solo hay 4 partidos jugados, se devuelven 4.
 */

const byDateAsc = (a, b) => new Date(a.utcDate) - new Date(b.utcDate);

const splitMatches = (matches = [], now = new Date()) => {
  const nowMs = now.getTime();
  const unique = [...new Map(matches.map((m) => [m.fixtureId, m])).values()];

  const past = unique.filter((m) => m.status === 'FINISHED').sort(byDateAsc).reverse();
  const live = unique.filter((m) => m.status === 'IN_PLAY').sort(byDateAsc);
  const upcoming = unique
    .filter((m) => m.status === 'SCHEDULED' && new Date(m.utcDate).getTime() > nowMs)
    .sort(byDateAsc);
  const postponed = unique.filter((m) => m.status === 'POSTPONED' || m.status === 'CANCELLED').sort(byDateAsc);

  return { past, live, upcoming, next: upcoming[0] || null, postponed };
};

/** Resultado desde la perspectiva del club: 'W' | 'D' | 'L' | null */
const resultFor = (match, espnId) => {
  if (match.status !== 'FINISHED' || match.score.home == null || match.score.away == null) return null;
  const isHome = match.homeTeam.espnId === String(espnId);
  const isAway = match.awayTeam.espnId === String(espnId);
  if (!isHome && !isAway) return null;
  const gf = isHome ? match.score.home : match.score.away;
  const ga = isHome ? match.score.away : match.score.home;
  if (gf > ga) return 'W';
  if (gf < ga) return 'L';
  return 'D';
};

/** Resumen por partido desde la perspectiva del club (orden cronológico). */
const clubPerspective = (matches, espnId) => matches
  .filter((m) => resultFor(m, espnId))
  .sort(byDateAsc)
  .map((m) => {
    const isHome = m.homeTeam.espnId === String(espnId);
    const gf = isHome ? m.score.home : m.score.away;
    const ga = isHome ? m.score.away : m.score.home;
    const result = resultFor(m, espnId);
    return {
      fixtureId: m.fixtureId,
      utcDate: m.utcDate,
      isHome,
      opponent: isHome ? m.awayTeam : m.homeTeam,
      goalsFor: gf,
      goalsAgainst: ga,
      result,
      points: result === 'W' ? 3 : result === 'D' ? 1 : 0
    };
  });

module.exports = { splitMatches, resultFor, clubPerspective };
