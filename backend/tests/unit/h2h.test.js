const { compareClubs, indicatorsFor } = require('../../domain/h2h');
const { analyzeTeam } = require('../../domain/teamAnalysis');

const g = (result, gf, ga, i) => ({ fixtureId: String(i), utcDate: `2026-08-1${i}T15:00:00Z`, isHome: i % 2 === 0, opponent: { name: 'R' }, goalsFor: gf, goalsAgainst: ga, result, points: result === 'W' ? 3 : result === 'D' ? 1 : 0 });
const club = (id) => ({ id, shortName: id.toUpperCase(), league: 'PL' });

describe('H2H', () => {
  const strong = analyzeTeam([g('W', 3, 0, 0), g('W', 2, 1, 1), g('D', 1, 1, 2)], 1.4);
  const weak = analyzeTeam([g('L', 0, 2, 0), g('D', 1, 1, 1), g('L', 1, 3, 2)], 1.4);

  test('indicadores en 0-100 con las fórmulas documentadas', () => {
    const i = indicatorsFor(strong);
    // GF/pp = 2, μ = 1.4 → min(100, 50·2/1.4) = 71
    expect(i.scoring).toBe(Math.round(50 * (2 / 1.4)));
    // GC/pp = 2/3 → 100 − 50·(0.667/1.4) = 76
    expect(i.defense).toBe(Math.round(100 - 50 * ((2 / 3) / 1.4)));
    expect(i.form).toBe(Math.round((7 / 9) * 100));
    Object.values(i).forEach((v) => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); });
  });

  test('el club con mejores números lidera los indicadores', () => {
    const r = compareClubs({ club: club('a'), analysis: strong }, { club: club('b'), analysis: weak });
    expect(r.indicatorWins).toEqual({ a: 4, b: 0 });
    expect(r.verdict).toMatch(/A lidera 4 de 4/);
  });

  test('sin partidos de uno de los clubes no inventa comparación', () => {
    const r = compareClubs({ club: club('a'), analysis: strong }, { club: club('b'), analysis: analyzeTeam([], 1.4) });
    expect(r.indicators.every((x) => x.values.b === null)).toBe(true);
    expect(r.verdict).toMatch(/No hay partidos suficientes/);
  });
});
