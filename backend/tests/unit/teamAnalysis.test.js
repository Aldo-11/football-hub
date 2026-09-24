const { analyzeTeam, computePerformanceIndex, currentStreak } = require('../../domain/teamAnalysis');
const { evaluateAlerts, buildRecommendations } = require('../../domain/alerts');

const g = (result, gf, ga, isHome = true, i = 0) => ({
  fixtureId: String(i), utcDate: `2026-08-${String(10 + i).padStart(2, '0')}T15:00:00Z`, isHome,
  opponent: { name: `Rival ${i}`, shortName: `R${i}` }, goalsFor: gf, goalsAgainst: ga, result,
  points: result === 'W' ? 3 : result === 'D' ? 1 : 0
});
const seq = (spec) => spec.map(([r, gf, ga, home], i) => g(r, gf, ga, home, i));

describe('Índice de Rendimiento del Equipo', () => {
  test('fórmula documentada: 0.35·Puntos + 0.25·Ataque + 0.25·Defensa + 0.15·Forma', () => {
    const idx = computePerformanceIndex({ ppg: 2, gfpg: 2, gapg: 1, formRatio: 0.6, mu: 1.5 });
    const points = (2 / 3) * 100;
    const attack = Math.min(100, 50 * (2 / 1.5));
    const defense = 100 - 50 * (1 / 1.5);
    const expected = 0.35 * points + 0.25 * attack + 0.25 * defense + 0.15 * 60;
    expect(idx.score).toBe(Math.round(expected));
    expect(idx.components).toEqual({ points: 67, attack: 67, defense: 67, form: 60 });
  });

  test('equipo en la media de su liga con 1.5 PPG queda en banda media', () => {
    const idx = computePerformanceIndex({ ppg: 1.5, gfpg: 1.4, gapg: 1.4, formRatio: 0.5, mu: 1.4 });
    expect(idx.score).toBe(50);
    expect(idx.level).toBe('MEDIUM');
  });

  test('componentes acotados a 0-100', () => {
    const idx = computePerformanceIndex({ ppg: 3, gfpg: 6, gapg: 0, formRatio: 1, mu: 1.2 });
    expect(idx.score).toBe(100);
    const low = computePerformanceIndex({ ppg: 0, gfpg: 0, gapg: 5, formRatio: 0, mu: 1.2 });
    expect(low.score).toBe(0);
    expect(low.level).toBe('LOW');
  });
});

describe('analyzeTeam', () => {
  const games = seq([['W', 3, 0, true], ['D', 1, 1, false], ['L', 0, 2, false], ['W', 2, 1, true]]);

  test('métricas básicas, local/visitante y progresión acumulada', () => {
    const a = analyzeTeam(games, 1.4, 38);
    expect(a.overall).toMatchObject({ played: 4, wins: 2, draws: 1, losses: 1, points: 7, goalsFor: 6, goalsAgainst: 4, goalDifference: 2, cleanSheets: 1, failedToScore: 1 });
    expect(a.overall.ppg).toBe(1.75);
    expect(a.home).toMatchObject({ played: 2, ppg: 3 });
    expect(a.away).toMatchObject({ played: 2, ppg: 0.5 });
    expect(a.progression.map((p) => p.cumulativePoints)).toEqual([3, 4, 4, 7]);
    expect(a.projection.points).toBe(Math.round(1.75 * 38));
    expect(a.form).toHaveLength(4);
  });

  test('sin partidos no calcula índice (no inventa)', () => {
    const a = analyzeTeam([], 1.4, 38);
    expect(a.played).toBe(0);
    expect(a.index).toBeNull();
  });

  test('racha actual', () => {
    expect(currentStreak(seq([['W', 1, 0], ['L', 0, 1], ['D', 0, 0], ['L', 0, 2]]))).toMatchObject({ result: 'L', length: 1, winless: 3, unbeaten: 0 });
  });
});

describe('Alertas', () => {
  test('mala racha, vulnerabilidad defensiva y muestra pequeña', () => {
    const a = analyzeTeam(seq([['L', 0, 3], ['D', 1, 1], ['L', 1, 4]]), 1.4, 38);
    const ids = evaluateAlerts(a).map((x) => x.id);
    expect(ids).toEqual(expect.arrayContaining(['WINLESS_STREAK', 'DEFENSE_WEAK', 'LOW_SAMPLE']));
    expect(buildRecommendations(evaluateAlerts(a)).length).toBeGreaterThan(0);
  });

  test('caída de rendimiento: PPG de los últimos 3 ≤ PPG temporada − 0.75', () => {
    const a = analyzeTeam(seq([['W', 2, 0], ['W', 2, 0], ['W', 2, 0], ['W', 2, 0], ['L', 0, 1], ['D', 1, 1], ['L', 0, 1]]), 1.4, 38);
    // PPG temporada = 13/7 = 1.86; últimos 3 = 1/3 = 0.33
    expect(evaluateAlerts(a).map((x) => x.id)).toContain('PERFORMANCE_DROP');
  });

  test('racha de victorias y fortaleza ofensiva', () => {
    const a = analyzeTeam(seq([['W', 3, 0], ['W', 4, 1], ['W', 3, 1]]), 1.4, 38);
    const ids = evaluateAlerts(a).map((x) => x.id);
    expect(ids).toEqual(expect.arrayContaining(['WIN_STREAK', 'ATTACK_STRONG']));
    expect(ids).not.toContain('WINLESS_STREAK');
  });

  test('cada alerta documenta su regla', () => {
    const a = analyzeTeam(seq([['L', 0, 3], ['L', 0, 3], ['L', 0, 3]]), 1.4, 38);
    evaluateAlerts(a).forEach((x) => expect(x.rule).toEqual(expect.any(String)));
  });

  test('sin datos → alerta informativa', () => {
    expect(evaluateAlerts(analyzeTeam([], 1.4, 38))[0].id).toBe('NO_DATA');
  });
});
