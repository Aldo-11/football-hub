/**
 * Análisis del Equipo — lógica propia de Football Hub.
 *
 * Entrada: partidos TERMINADOS de liga del club (perspectiva del club) y la
 * media de goles de su liga (μ, goles por equipo y partido).
 *
 * Índice de Rendimiento del Equipo (0-100), media ponderada de 4 componentes:
 *
 *   Puntos  (35 %) = PPG / 3 · 100
 *   Ataque  (25 %) = min(100, 50 · GF_pp / μ)          → 50 = media de la liga
 *   Defensa (25 %) = max(0, 100 − 50 · GC_pp / μ)      → 50 = media de la liga
 *   Forma   (15 %) = puntos últimos N / (3·N) · 100     (N = hasta 5 partidos)
 *
 *   Índice = 0.35·Puntos + 0.25·Ataque + 0.25·Defensa + 0.15·Forma
 *
 * Bandas de lectura: 0-39 bajo · 40-69 medio · 70-100 alto.
 * Consistencia = 100 · (1 − σ(puntos por partido) / 1.5); 1.5 es la σ máxima
 * posible (alternar victorias y derrotas).
 */

const WEIGHTS = { points: 0.35, attack: 0.25, defense: 0.25, form: 0.15 };
const FORM_WINDOW = 5;
const BANDS = [
  { min: 70, level: 'HIGH', label: 'Alto' },
  { min: 40, level: 'MEDIUM', label: 'Medio' },
  { min: 0, level: 'LOW', label: 'Bajo' }
];

const clamp = (v, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const round = (v, d = 2) => (v == null || !Number.isFinite(v) ? null : +v.toFixed(d));
const sum = (arr, f) => arr.reduce((acc, x) => acc + f(x), 0);

const splitStats = (games) => {
  const n = games.length;
  if (n === 0) return { played: 0, ppg: null, goalsForPerGame: null, goalsAgainstPerGame: null };
  return {
    played: n,
    wins: games.filter((g) => g.result === 'W').length,
    draws: games.filter((g) => g.result === 'D').length,
    losses: games.filter((g) => g.result === 'L').length,
    ppg: round(sum(games, (g) => g.points) / n),
    goalsForPerGame: round(sum(games, (g) => g.goalsFor) / n),
    goalsAgainstPerGame: round(sum(games, (g) => g.goalsAgainst) / n)
  };
};

const stdDev = (values) => {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
};

const bandFor = (score) => BANDS.find((b) => score >= b.min);

/** Racha actual al final de la secuencia (más reciente al final). */
const currentStreak = (games) => {
  if (games.length === 0) return null;
  const last = games[games.length - 1].result;
  let unbeaten = 0; let winless = 0; let same = 0;
  for (let i = games.length - 1; i >= 0; i--) { if (games[i].result === last) same++; else break; }
  for (let i = games.length - 1; i >= 0 && games[i].result !== 'L'; i--) unbeaten++;
  for (let i = games.length - 1; i >= 0 && games[i].result !== 'W'; i--) winless++;
  return { result: last, length: same, unbeaten, winless };
};

const computePerformanceIndex = ({ ppg, gfpg, gapg, formRatio, mu }) => {
  if (ppg == null || !mu) return null;
  const components = {
    points: clamp((ppg / 3) * 100),
    attack: clamp(50 * (gfpg / mu)),
    defense: clamp(100 - 50 * (gapg / mu)),
    form: clamp(formRatio * 100)
  };
  const score = Object.entries(WEIGHTS).reduce((acc, [k, w]) => acc + w * components[k], 0);
  const band = bandFor(score);
  return {
    score: Math.round(score),
    level: band.level,
    label: band.label,
    components: Object.fromEntries(Object.entries(components).map(([k, v]) => [k, Math.round(v)])),
    weights: WEIGHTS
  };
};

/** Evolución jornada a jornada (sin metas arbitrarias). */
const buildProgression = (games) => {
  let points = 0; let gd = 0;
  return games.map((g, i) => {
    points += g.points;
    gd += g.goalsFor - g.goalsAgainst;
    return {
      match: i + 1,
      utcDate: g.utcDate,
      opponent: g.opponent.shortName || g.opponent.name,
      isHome: g.isHome,
      score: `${g.goalsFor}-${g.goalsAgainst}`,
      result: g.result,
      points: g.points,
      cumulativePoints: points,
      cumulativeGoalDifference: gd,
      ppg: round(points / (i + 1))
    };
  });
};

/**
 * @param {Array} games partidos terminados en perspectiva del club, orden cronológico
 * @param {number} mu media de goles por equipo y partido en la liga
 * @param {number} totalMatches partidos totales de la temporada de liga
 */
const analyzeTeam = (games, mu, totalMatches = null) => {
  const overall = splitStats(games);
  if (overall.played === 0) {
    return { played: 0, overall, index: null, form: [], progression: [], home: splitStats([]), away: splitStats([]), consistency: null, projection: null, streak: null };
  }

  const formGames = games.slice(-FORM_WINDOW);
  const formPoints = sum(formGames, (g) => g.points);
  const goalsFor = sum(games, (g) => g.goalsFor);
  const goalsAgainst = sum(games, (g) => g.goalsAgainst);
  const sd = stdDev(games.map((g) => g.points));

  const index = computePerformanceIndex({
    ppg: overall.ppg,
    gfpg: goalsFor / overall.played,
    gapg: goalsAgainst / overall.played,
    formRatio: formPoints / (3 * formGames.length),
    mu
  });

  const points = sum(games, (g) => g.points);
  return {
    played: overall.played,
    overall: {
      ...overall,
      points,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      cleanSheets: games.filter((g) => g.goalsAgainst === 0).length,
      failedToScore: games.filter((g) => g.goalsFor === 0).length
    },
    league: { avgGoalsPerTeamGame: round(mu, 3) },
    ratios: {
      attackVsLeague: mu ? round((goalsFor / overall.played) / mu) : null,
      defenseVsLeague: mu ? round((goalsAgainst / overall.played) / mu) : null
    },
    form: formGames.map((g) => ({ result: g.result, opponent: g.opponent.shortName || g.opponent.name, score: `${g.goalsFor}-${g.goalsAgainst}`, isHome: g.isHome, utcDate: g.utcDate })),
    formPoints: { points: formPoints, max: 3 * formGames.length },
    home: splitStats(games.filter((g) => g.isHome)),
    away: splitStats(games.filter((g) => !g.isHome)),
    consistency: { stdDevPoints: round(sd), score: Math.round(clamp(100 * (1 - sd / 1.5))) },
    streak: currentStreak(games),
    index,
    progression: buildProgression(games),
    // Proyección lineal: si mantiene su ritmo actual (PPG) el resto de la temporada
    projection: totalMatches
      ? { method: 'PPG × partidos totales', totalMatches, points: Math.round(overall.ppg * totalMatches) }
      : null
  };
};

module.exports = { analyzeTeam, computePerformanceIndex, currentStreak, splitStats, buildProgression, WEIGHTS, BANDS, FORM_WINDOW };
