/**
 * Comparativa Head-to-Head entre dos clubes soportados.
 *
 * Cuatro indicadores en escala 0-100 calculados con los partidos de liga de
 * la temporada actual de cada club. Ataque y defensa se miden RELATIVOS A LA
 * MEDIA DE SU PROPIA LIGA (μ), así se pueden comparar clubes de ligas distintas.
 *
 *  Peligrosidad goleadora = min(100, 50 · GF_pp / μ)          50 = media de su liga
 *  Solidez defensiva      = max(0, 100 − 50 · GC_pp / μ)      50 = media de su liga
 *  Forma reciente         = puntos últimos 5 / puntos posibles · 100
 *  Dominio y calidad      = 0.5 · (PPG / 3 · 100) + 0.5 · clamp(50 + 25 · DG_pp)
 *                           (DG_pp = diferencia de goles por partido; +2 → 100, −2 → 0)
 */

const clamp = (v, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

const INDICATORS = [
  { key: 'scoring', label: 'Peligrosidad goleadora', description: 'Goles a favor por partido comparados con la media de su liga (50 = media).' },
  { key: 'defense', label: 'Solidez defensiva', description: 'Goles en contra por partido comparados con la media de su liga (50 = media; más alto = recibe menos).' },
  { key: 'form', label: 'Forma reciente', description: 'Porcentaje de puntos obtenidos en los últimos 5 partidos.' },
  { key: 'dominance', label: 'Dominio y calidad', description: 'Mitad puntos por partido y mitad diferencia de goles por partido.' }
];

const indicatorsFor = (analysis) => {
  if (!analysis || analysis.played === 0) return null;
  const { overall, league, formPoints } = analysis;
  const mu = league.avgGoalsPerTeamGame;
  const gfpg = overall.goalsFor / overall.played;
  const gapg = overall.goalsAgainst / overall.played;
  const gdpg = overall.goalDifference / overall.played;
  return {
    scoring: Math.round(clamp(50 * (gfpg / mu))),
    defense: Math.round(clamp(100 - 50 * (gapg / mu))),
    form: Math.round(clamp((formPoints.points / formPoints.max) * 100)),
    dominance: Math.round(0.5 * clamp((overall.ppg / 3) * 100) + 0.5 * clamp(50 + 25 * gdpg))
  };
};

/**
 * @param {{club, analysis}} a
 * @param {{club, analysis}} b
 * @param {Array} meetings partidos entre ambos esta temporada (normalizados)
 */
const compareClubs = (a, b, meetings = []) => {
  const ia = indicatorsFor(a.analysis);
  const ib = indicatorsFor(b.analysis);

  const rows = INDICATORS.map((ind) => {
    const va = ia ? ia[ind.key] : null;
    const vb = ib ? ib[ind.key] : null;
    let leader = null;
    if (va != null && vb != null && va !== vb) leader = va > vb ? a.club.id : b.club.id;
    return { ...ind, values: { [a.club.id]: va, [b.club.id]: vb }, leader };
  });

  const wins = { [a.club.id]: 0, [b.club.id]: 0 };
  rows.forEach((r) => { if (r.leader) wins[r.leader]++; });

  let verdict;
  if (!ia || !ib) verdict = 'No hay partidos suficientes de ambos clubes para comparar.';
  else if (wins[a.club.id] === wins[b.club.id]) verdict = 'Comparativa equilibrada: cada club lidera la misma cantidad de indicadores.';
  else {
    const leader = wins[a.club.id] > wins[b.club.id] ? a.club : b.club;
    verdict = `${leader.shortName} lidera ${Math.max(...Object.values(wins))} de 4 indicadores esta temporada.`;
  }

  return {
    clubs: [a.club, b.club],
    sameLeague: a.club.league === b.club.league,
    indicators: rows,
    indicatorWins: wins,
    verdict,
    meetings
  };
};

module.exports = { compareClubs, indicatorsFor, INDICATORS };
