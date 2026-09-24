/**
 * Modelo de Poisson para pronosticar un partido (modelo tipo Maher/Dixon-Coles
 * simplificado, sin corrección de marcadores bajos).
 *
 * 1. Media de la liga (μ): goles marcados por equipo y partido en la temporada
 *        μ = Σ goles a favor / Σ partidos jugados
 * 2. Fuerza ofensiva y defensiva con "suavizado" hacia la media de la liga
 *    (evita valores extremos con pocos partidos; K = partidos ficticios de media):
 *        ataque_i  = ((GF_i + K·μ) / (PJ_i + K)) / μ      (1 = promedio de la liga)
 *        defensa_i = ((GC_i + K·μ) / (PJ_i + K)) / μ      (>1 = recibe más que el promedio)
 * 3. Goles esperados (λ), con ventaja de local h:
 *        λ_local  = ataque_local  · defensa_visit · μ · h
 *        λ_visit  = ataque_visit  · defensa_local · μ / h
 * 4. Goles de cada equipo ~ Poisson(λ), independientes. Se calcula la matriz
 *    de marcadores 0..MAX_GOALS y se normaliza por su masa total.
 * 5. P(local), P(empate), P(visitante), Under/Over 2.5 y marcador más probable
 *    salen de sumar celdas de la matriz.
 */

const MODEL = {
  SHRINKAGE_MATCHES: 3,
  // Ventaja de local: h² ≈ 1.25 ≈ cociente histórico goles local/visitante
  // en las grandes ligas europeas. Es un parámetro del modelo, no un dato.
  HOME_ADVANTAGE: 1.12,
  MAX_GOALS: 10,
  MIN_RELIABLE_MATCHES: 5
};

const poissonPmf = (k, lambda) => {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  // Cálculo en logaritmos para estabilidad numérica
  let logFact = 0;
  for (let i = 2; i <= k; i++) logFact += Math.log(i);
  return Math.exp(k * Math.log(lambda) - lambda - logFact);
};

/** Media de goles por equipo y partido de la liga, a partir de la clasificación. */
const leagueAverageGoals = (standings) => {
  const totals = standings.reduce(
    (acc, r) => ({ goals: acc.goals + (r.goalsFor || 0), played: acc.played + (r.playedGames || 0) }),
    { goals: 0, played: 0 }
  );
  return totals.played > 0 ? totals.goals / totals.played : null;
};

const teamStrength = (row, mu, k = MODEL.SHRINKAGE_MATCHES) => {
  const played = row.playedGames || 0;
  return {
    attack: ((row.goalsFor || 0) + k * mu) / (played + k) / mu,
    defense: ((row.goalsAgainst || 0) + k * mu) / (played + k) / mu,
    played
  };
};

const expectedGoals = (home, away, mu, h = MODEL.HOME_ADVANTAGE) => ({
  home: home.attack * away.defense * mu * h,
  away: away.attack * home.defense * mu / h
});

/**
 * Redondeo a 1 decimal que conserva la suma exacta (método del mayor resto).
 * Evita que 1X2 sume 99.9 o 100.1.
 */
const roundToTotal = (values, total = 100, decimals = 1) => {
  const factor = 10 ** decimals;
  const scaled = values.map((v) => v * factor);
  const floors = scaled.map(Math.floor);
  let remainder = Math.round(total * factor) - floors.reduce((a, b) => a + b, 0);
  const order = scaled.map((v, i) => [v - floors[i], i]).sort((a, b) => b[0] - a[0]);
  for (let j = 0; j < order.length && remainder > 0; j++, remainder--) floors[order[j][1]] += 1;
  return floors.map((v) => v / factor);
};

const scoreMatrix = (lambdaHome, lambdaAway, maxGoals = MODEL.MAX_GOALS) => {
  const ph = Array.from({ length: maxGoals + 1 }, (_, k) => poissonPmf(k, lambdaHome));
  const pa = Array.from({ length: maxGoals + 1 }, (_, k) => poissonPmf(k, lambdaAway));
  const matrix = ph.map((x) => pa.map((y) => x * y));
  const mass = matrix.flat().reduce((a, b) => a + b, 0);
  return matrix.map((row) => row.map((v) => v / mass));
};

const summarizeMatrix = (matrix) => {
  let home = 0; let draw = 0; let away = 0; let under25 = 0; let btts = 0;
  let best = { home: 0, away: 0, p: -1 };
  matrix.forEach((row, h) => row.forEach((p, a) => {
    if (h > a) home += p; else if (h === a) draw += p; else away += p;
    if (h + a <= 2) under25 += p;
    if (h > 0 && a > 0) btts += p;
    if (p > best.p) best = { home: h, away: a, p };
  }));
  return { home, draw, away, under25, over25: 1 - under25, btts, best };
};

/** Conclusión en lenguaje sencillo a partir de umbrales fijos y documentados. */
const conclude = ({ probabilities, overUnder }, names) => {
  const outcomes = [
    { key: 'HOME', label: `Victoria de ${names.home}`, p: probabilities.homeWin },
    { key: 'DRAW', label: 'Empate', p: probabilities.draw },
    { key: 'AWAY', label: `Victoria de ${names.away}`, p: probabilities.awayWin }
  ].sort((a, b) => b.p - a.p);
  const margin = +(outcomes[0].p - outcomes[1].p).toFixed(1);

  // Umbrales de margen entre el resultado más probable y el segundo
  let strength;
  if (margin >= 25) strength = { level: 'CLEAR', text: 'favorito claro' };
  else if (margin >= 10) strength = { level: 'SLIGHT', text: 'ligera ventaja' };
  else strength = { level: 'BALANCED', text: 'partido equilibrado' };

  let goals;
  if (overUnder.under >= 55) goals = { level: 'UNDER', text: 'se esperan pocos goles (Under 2.5)' };
  else if (overUnder.over >= 55) goals = { level: 'OVER', text: 'se esperan 3 o más goles (Over 2.5)' };
  else goals = { level: 'UNCERTAIN', text: 'número de goles incierto' };

  const summary = strength.level === 'BALANCED'
    ? `Partido equilibrado (diferencia de ${margin} pts porcentuales); ${goals.text}.`
    : `${outcomes[0].label} como resultado más probable (${outcomes[0].p}%), ${strength.text} de ${margin} pts porcentuales; ${goals.text}.`;

  return { favorite: outcomes[0].key, margin, strength: strength.level, goals: goals.level, summary };
};

/**
 * @param {object} homeRow fila de clasificación del local
 * @param {object} awayRow fila de clasificación del visitante
 * @param {Array} standings clasificación completa de la liga
 */
const predictMatch = (homeRow, awayRow, standings) => {
  const mu = leagueAverageGoals(standings);
  if (!mu || !homeRow || !awayRow) return null;

  const home = teamStrength(homeRow, mu);
  const away = teamStrength(awayRow, mu);
  const lambda = expectedGoals(home, away, mu);
  const matrix = scoreMatrix(lambda.home, lambda.away);
  const s = summarizeMatrix(matrix);

  const [homeWin, draw, awayWin] = roundToTotal([s.home * 100, s.draw * 100, s.away * 100]);
  const [under, over] = roundToTotal([s.under25 * 100, s.over25 * 100]);
  const names = { home: homeRow.team.shortName || homeRow.team.name, away: awayRow.team.shortName || awayRow.team.name };
  const probabilities = { homeWin, draw, awayWin };
  const overUnder = { under, over, line: 2.5 };

  return {
    teams: names,
    model: {
      leagueAvgGoals: +mu.toFixed(3),
      homeAdvantage: MODEL.HOME_ADVANTAGE,
      shrinkageMatches: MODEL.SHRINKAGE_MATCHES
    },
    strengths: {
      home: { attack: +home.attack.toFixed(2), defense: +home.defense.toFixed(2), played: home.played },
      away: { attack: +away.attack.toFixed(2), defense: +away.defense.toFixed(2), played: away.played }
    },
    expectedGoals: { home: +lambda.home.toFixed(2), away: +lambda.away.toFixed(2) },
    probabilities,
    overUnder,
    bothTeamsScore: +(s.btts * 100).toFixed(1),
    mostLikelyScore: { home: s.best.home, away: s.best.away, probability: +(s.best.p * 100).toFixed(1) },
    conclusion: conclude({ probabilities, overUnder }, names),
    reliability: {
      lowSample: home.played < MODEL.MIN_RELIABLE_MATCHES || away.played < MODEL.MIN_RELIABLE_MATCHES,
      minMatches: MODEL.MIN_RELIABLE_MATCHES
    },
    topScores: matrix
      .flatMap((row, h) => row.map((p, a) => ({ home: h, away: a, probability: +(p * 100).toFixed(1) })))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5)
  };
};

module.exports = {
  MODEL,
  poissonPmf,
  leagueAverageGoals,
  teamStrength,
  expectedGoals,
  roundToTotal,
  scoreMatrix,
  summarizeMatrix,
  predictMatch
};
