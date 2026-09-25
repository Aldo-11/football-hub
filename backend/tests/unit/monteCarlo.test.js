const { simulateSeason, createRng, poissonSample } = require('../../domain/monteCarlo');

const row = (id, pos, pj, pts, gf, ga) => ({ position: pos, team: { espnId: id, name: id }, playedGames: pj, points: pts, goalsFor: gf, goalsAgainst: ga });

// Liga de 4 equipos a doble vuelta (6 jornadas); se han jugado 2 jornadas
const table = [
  row('A', 1, 2, 6, 6, 1),
  row('B', 2, 2, 3, 3, 3),
  row('C', 3, 2, 3, 2, 3),
  row('D', 4, 2, 0, 1, 5)
];
const pairs = [['A', 'D'], ['B', 'C'], ['D', 'B'], ['C', 'A'], ['A', 'B'], ['C', 'D'], ['B', 'A'], ['D', 'C']];
const fixtures = pairs.map(([homeId, awayId]) => ({ homeId, awayId }));
const zones = { championsLeague: 1, relegation: 1 };

describe('Monte Carlo', () => {
  test('reproducible con la misma semilla y distinto con otra', () => {
    const a = simulateSeason(table, fixtures, { simulations: 500, seed: 1, zones });
    const b = simulateSeason(table, fixtures, { simulations: 500, seed: 1, zones });
    const c = simulateSeason(table, fixtures, { simulations: 500, seed: 2, zones });
    expect(a.teams).toEqual(b.teams);
    expect(a.teams).not.toEqual(c.teams);
  });

  test('probabilidades coherentes: cada distribución suma 100 % y cada posición suma 100 %', () => {
    const r = simulateSeason(table, fixtures, { simulations: 2000, seed: 7, zones });
    r.teams.forEach((t) => expect(t.positionDistribution.reduce((x, y) => x + y, 0)).toBeCloseTo(100, 0));
    for (let pos = 0; pos < 4; pos++) {
      expect(r.teams.reduce((acc, t) => acc + t.positionDistribution[pos], 0)).toBeCloseTo(100, 0);
    }
    const titles = r.teams.reduce((acc, t) => acc + t.probabilities.title, 0);
    expect(titles).toBeCloseTo(100, 0);
  });

  test('el mejor equipo tiene más opciones de título y el peor más de descenso', () => {
    const r = simulateSeason(table, fixtures, { simulations: 3000, seed: 3, zones });
    const byId = Object.fromEntries(r.teams.map((t) => [t.team.espnId, t]));
    expect(byId.A.probabilities.title).toBeGreaterThan(byId.D.probabilities.title);
    expect(byId.D.probabilities.relegation).toBeGreaterThan(byId.A.probabilities.relegation);
    // Hay variabilidad real: el favorito no gana el 100 % de las veces
    expect(byId.A.probabilities.title).toBeLessThan(100);
    expect(byId.A.pointsRange.p90).toBeGreaterThan(byId.A.pointsRange.p10);
  });

  test('posición proyectada 1..N ordenada por posición media', () => {
    const r = simulateSeason(table, fixtures, { simulations: 500, seed: 11, zones });
    expect(r.teams.map((t) => t.projectedPosition)).toEqual([1, 2, 3, 4]);
    r.teams.slice(1).forEach((t, i) => expect(t.averagePosition).toBeGreaterThanOrEqual(r.teams[i].averagePosition));
  });

  test('más simulaciones mantienen al líder y al colista claros; solo pueden alternar equipos muy parejos', () => {
    const small = simulateSeason(table, fixtures, { simulations: 2000, seed: 1, zones });
    const big = simulateSeason(table, fixtures, { simulations: 20000, seed: 2, zones });
    expect(big.teams[0].team.espnId).toBe(small.teams[0].team.espnId);
    expect(big.teams[3].team.espnId).toBe(small.teams[3].team.espnId);
    // B y C (mismos puntos hoy) terminan con posiciones medias casi iguales
    const avg = (r, id) => r.teams.find((t) => t.team.espnId === id).averagePosition;
    expect(Math.abs(avg(big, 'B') - avg(big, 'C'))).toBeLessThan(0.5);
    // La probabilidad de título converge: diferencia pequeña entre 2 000 y 20 000 simulaciones
    const title = (r, id) => r.teams.find((t) => t.team.espnId === id).probabilities.title;
    expect(Math.abs(title(big, 'A') - title(small, 'A'))).toBeLessThan(4);
  });

  test('puntos esperados ≥ puntos actuales y ≤ máximo alcanzable', () => {
    const r = simulateSeason(table, fixtures, { simulations: 500, seed: 5, zones });
    r.teams.forEach((t) => {
      expect(t.expectedPoints).toBeGreaterThanOrEqual(t.currentPoints);
      expect(t.expectedPoints).toBeLessThanOrEqual(t.currentPoints + 3 * 4);
    });
  });

  test('valida que el calendario pendiente esté completo', () => {
    expect(simulateSeason(table, fixtures, { simulations: 100, zones }).fixturesComplete).toBe(true);
    expect(simulateSeason(table, fixtures.slice(1), { simulations: 100, zones }).fixturesComplete).toBe(false);
  });

  test('limita el número de simulaciones a un rango razonable', () => {
    expect(simulateSeason(table, fixtures, { simulations: 5, zones }).simulations).toBe(100);
    expect(simulateSeason(table, fixtures, { simulations: 10 ** 9, zones }).simulations).toBe(20000);
  });

  test('sin partidos jugados en la liga lanza error (no inventa fuerzas)', () => {
    const empty = table.map((t) => ({ ...t, playedGames: 0, points: 0, goalsFor: 0, goalsAgainst: 0 }));
    expect(() => simulateSeason(empty, fixtures, { zones })).toThrow();
  });

  test('muestreo de Poisson: media empírica ≈ λ', () => {
    const rng = createRng(42);
    let total = 0;
    for (let i = 0; i < 20000; i++) total += poissonSample(1.6, rng);
    expect(total / 20000).toBeCloseTo(1.6, 1);
  });
});
