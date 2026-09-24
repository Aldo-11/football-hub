const P = require('../../domain/poisson');

const row = (name, pj, gf, ga) => ({ team: { espnId: name, name, shortName: name }, playedGames: pj, goalsFor: gf, goalsAgainst: ga });

describe('Poisson — matemáticas', () => {
  test('PMF coincide con la fórmula λ^k e^-λ / k!', () => {
    expect(P.poissonPmf(0, 1.5)).toBeCloseTo(Math.exp(-1.5), 12);
    expect(P.poissonPmf(2, 1.5)).toBeCloseTo((1.5 ** 2 * Math.exp(-1.5)) / 2, 12);
    expect(P.poissonPmf(0, 0)).toBe(1);
  });

  test('la matriz normalizada suma 1', () => {
    const total = P.scoreMatrix(1.7, 1.1).flat().reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 12);
  });

  test('Under 2.5 = P(Poisson(λh+λa) ≤ 2) (suma de Poisson independientes)', () => {
    const s = P.summarizeMatrix(P.scoreMatrix(1.5, 1.0));
    const lt = 2.5;
    const expected = Math.exp(-lt) * (1 + lt + lt ** 2 / 2);
    expect(s.under25).toBeCloseTo(expected, 6);
    expect(s.under25 + s.over25).toBeCloseTo(1, 12);
  });

  test('equipos idénticos sin ventaja de local → P(local) = P(visitante)', () => {
    const s = P.summarizeMatrix(P.scoreMatrix(1.3, 1.3));
    expect(s.home).toBeCloseTo(s.away, 12);
    expect(s.home + s.draw + s.away).toBeCloseTo(1, 12);
  });

  test('redondeo por mayor resto conserva el 100 %', () => {
    const r = P.roundToTotal([33.3333, 33.3333, 33.3334]);
    expect(r.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
    expect(P.roundToTotal([48.26, 25.87, 25.87]).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });
});

describe('Poisson — fuerzas y goles esperados', () => {
  const table = [row('A', 5, 15, 3), row('B', 5, 5, 10), row('C', 5, 7, 7), row('D', 5, 3, 10)];

  test('media de la liga = goles / partidos jugados por equipo', () => {
    expect(P.leagueAverageGoals(table)).toBeCloseTo(30 / 20, 12);
    expect(P.leagueAverageGoals([row('X', 0, 0, 0)])).toBeNull();
  });

  test('fuerza con suavizado: un equipo promedio tiene ataque = defensa = 1', () => {
    const mu = 1.5;
    const s = P.teamStrength(row('M', 6, 9, 9), mu);
    expect(s.attack).toBeCloseTo(1, 12);
    expect(s.defense).toBeCloseTo(1, 12);
  });

  test('λ = ataque · defensa rival · μ · h (local) y / h (visitante)', () => {
    const l = P.expectedGoals({ attack: 1.2, defense: 0.8 }, { attack: 0.9, defense: 1.1 }, 1.4, 1.12);
    expect(l.home).toBeCloseTo(1.2 * 1.1 * 1.4 * 1.12, 12);
    expect(l.away).toBeCloseTo(0.9 * 0.8 * 1.4 / 1.12, 12);
  });

  test('predicción completa coherente con sus propios λ', () => {
    const p = P.predictMatch(table[0], table[3], table);
    const s = P.summarizeMatrix(P.scoreMatrix(p.expectedGoals.home, p.expectedGoals.away));
    expect(p.probabilities.homeWin + p.probabilities.draw + p.probabilities.awayWin).toBeCloseTo(100, 10);
    expect(p.probabilities.homeWin).toBeCloseTo(s.home * 100, 0);
    expect(p.overUnder.under + p.overUnder.over).toBeCloseTo(100, 10);
    expect(p.probabilities.homeWin).toBeGreaterThan(p.probabilities.awayWin);
    expect(p.conclusion.favorite).toBe('HOME');
    expect(p.reliability.lowSample).toBe(false);
    expect(p.topScores).toHaveLength(5);
  });

  test('marca muestra pequeña con menos de 5 partidos', () => {
    const t = [row('A', 2, 4, 1), row('B', 2, 1, 3)];
    expect(P.predictMatch(t[0], t[1], t).reliability.lowSample).toBe(true);
  });

  test('sin partidos jugados en la liga no hay predicción (no inventa)', () => {
    const t = [row('A', 0, 0, 0), row('B', 0, 0, 0)];
    expect(P.predictMatch(t[0], t[1], t)).toBeNull();
  });
});
