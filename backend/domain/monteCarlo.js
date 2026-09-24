/**
 * Simulación Monte Carlo del resto de la temporada de una liga.
 *
 * Para cada simulación:
 *  1. Se parte de la clasificación REAL actual (puntos, GF, GC).
 *  2. A cada equipo se le asigna una fuerza ofensiva/defensiva (modelo de
 *     Poisson, ver poisson.js) multiplicada por un factor aleatorio lognormal:
 *         factor = exp(N(0, σ_i)),   σ_i = σ_base · √(K / (PJ_i + K))
 *     Representa la incertidumbre sobre el nivel real del equipo: con pocos
 *     partidos jugados la incertidumbre es mayor. Así las simulaciones no son
 *     todas "el mismo torneo con ruido de marcador".
 *  3. Cada partido PENDIENTE real se juega sorteando goles ~ Poisson(λ).
 *  4. Se ordena la tabla (puntos, diferencia, goles a favor, sorteo) y se
 *     anota la posición final de cada equipo.
 *
 * Resultado: probabilidad de cada posición, de ser campeón, de plazas de
 * Champions y de descenso, y puntos esperados. Con la misma semilla el
 * resultado es idéntico (reproducible).
 */
const { leagueAverageGoals, teamStrength, expectedGoals, MODEL } = require('./poisson');

const SIM = {
  DEFAULT_SIMULATIONS: 5000,
  MIN_SIMULATIONS: 100,
  MAX_SIMULATIONS: 20000,
  STRENGTH_SIGMA: 0.2,
  DEFAULT_SEED: 20262027
};

/** Generador pseudoaleatorio con semilla (mulberry32). */
const createRng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const normalSample = (rng) => {
  // Box-Muller
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/** Muestreo de Poisson (algoritmo de Knuth; adecuado para λ < 10). */
const poissonSample = (lambda, rng) => {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
};

const percentile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

/**
 * @param {Array} standings filas de clasificación (team.espnId, points, goalsFor, goalsAgainst, playedGames)
 * @param {Array<{homeId:string, awayId:string}>} fixtures partidos pendientes de la liga
 * @param {{simulations?:number, seed?:number, zones?:{championsLeague:number, relegation:number}}} options
 */
const simulateSeason = (standings, fixtures, options = {}) => {
  const simulations = Math.min(SIM.MAX_SIMULATIONS, Math.max(SIM.MIN_SIMULATIONS,
    parseInt(options.simulations, 10) || SIM.DEFAULT_SIMULATIONS));
  const seed = Number.isInteger(options.seed) ? options.seed : SIM.DEFAULT_SEED;
  const zones = options.zones || { championsLeague: 4, relegation: 3 };
  const rng = createRng(seed);

  const mu = leagueAverageGoals(standings);
  if (!mu) throw new Error('La liga no tiene partidos jugados: no se puede estimar la fuerza de los equipos');

  const n = standings.length;
  const ids = standings.map((r) => r.team.espnId);
  const indexOf = new Map(ids.map((id, i) => [id, i]));
  const base = standings.map((r) => ({ ...teamStrength(r, mu), points: r.points, gf: r.goalsFor, ga: r.goalsAgainst }));
  const sigma = base.map((b) => SIM.STRENGTH_SIGMA * Math.sqrt(MODEL.SHRINKAGE_MATCHES / (b.played + MODEL.SHRINKAGE_MATCHES)));

  const validFixtures = fixtures
    .map((f) => [indexOf.get(String(f.homeId)), indexOf.get(String(f.awayId))])
    .filter(([h, a]) => h !== undefined && a !== undefined && h !== a);

  const positionCounts = Array.from({ length: n }, () => new Array(n).fill(0));
  const pointsSamples = Array.from({ length: n }, () => new Array(simulations));

  const pts = new Array(n); const gd = new Array(n); const gf = new Array(n);
  const att = new Array(n); const def = new Array(n); const tiebreak = new Array(n);
  const order = ids.map((_, i) => i);

  for (let s = 0; s < simulations; s++) {
    for (let i = 0; i < n; i++) {
      pts[i] = base[i].points; gf[i] = base[i].gf; gd[i] = base[i].gf - base[i].ga;
      att[i] = base[i].attack * Math.exp(normalSample(rng) * sigma[i]);
      def[i] = base[i].defense * Math.exp(normalSample(rng) * sigma[i]);
      tiebreak[i] = rng();
    }

    for (const [h, a] of validFixtures) {
      const lambda = expectedGoals({ attack: att[h], defense: def[h] }, { attack: att[a], defense: def[a] }, mu);
      const gh = poissonSample(lambda.home, rng);
      const ga = poissonSample(lambda.away, rng);
      gf[h] += gh; gf[a] += ga; gd[h] += gh - ga; gd[a] += ga - gh;
      if (gh > ga) pts[h] += 3; else if (gh < ga) pts[a] += 3; else { pts[h] += 1; pts[a] += 1; }
    }

    order.sort((x, y) => (pts[y] - pts[x]) || (gd[y] - gd[x]) || (gf[y] - gf[x]) || (tiebreak[y] - tiebreak[x]));
    order.forEach((teamIdx, pos) => { positionCounts[teamIdx][pos]++; });
    for (let i = 0; i < n; i++) pointsSamples[i][s] = pts[i];
  }

  const pct = (count) => +((count / simulations) * 100).toFixed(1);
  const teams = standings.map((row, i) => {
    const sorted = pointsSamples[i].slice().sort((a, b) => a - b);
    const counts = positionCounts[i];
    const avgPosition = counts.reduce((acc, c, pos) => acc + c * (pos + 1), 0) / simulations;
    const sumRange = (from, to) => counts.slice(from, to).reduce((a, b) => a + b, 0);
    return {
      team: row.team,
      currentPosition: row.position,
      currentPoints: row.points,
      played: row.playedGames,
      expectedPoints: +(sorted.reduce((a, b) => a + b, 0) / simulations).toFixed(1),
      pointsRange: { p10: percentile(sorted, 0.1), p90: percentile(sorted, 0.9) },
      averagePosition: +avgPosition.toFixed(2),
      probabilities: {
        title: pct(counts[0]),
        championsLeague: pct(sumRange(0, zones.championsLeague)),
        relegation: pct(sumRange(n - zones.relegation, n))
      },
      positionDistribution: counts.map(pct)
    };
  }).sort((a, b) => a.averagePosition - b.averagePosition);

  const expectedRemaining = standings.reduce((acc, r) => acc + (2 * (n - 1) - r.playedGames), 0) / 2;

  return {
    simulations,
    seed,
    zones,
    remainingMatches: validFixtures.length,
    expectedRemainingMatches: expectedRemaining,
    fixturesComplete: validFixtures.length === expectedRemaining,
    model: { strengthSigma: SIM.STRENGTH_SIGMA, leagueAvgGoals: +mu.toFixed(3), homeAdvantage: MODEL.HOME_ADVANTAGE },
    teams
  };
};

module.exports = { simulateSeason, createRng, poissonSample, SIM };
