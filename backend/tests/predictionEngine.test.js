const request = require('supertest');
const { app } = require('../server');
const predictionEngine = require('../services/predictionEngine');

describe('Módulo 4: Motor de Pronóstico (Distribución de Poisson)', () => {
  test('Cálculo matemático de Poisson devuelve estructura completa', () => {
    const res = predictionEngine.calculatePrediction({
      fixtureId: 'fix_100',
      homeTeamName: 'Real Madrid CF',
      awayTeamName: 'FC Barcelona',
      homeScoredAvg: 2.2,
      homeConcededAvg: 0.8,
      awayScoredAvg: 2.0,
      awayConcededAvg: 1.0
    });

    expect(res.fixtureId).toBe('fix_100');
    expect(res.lambda.home).toBeGreaterThan(0);
    expect(res.lambda.away).toBeGreaterThan(0);
    expect(res.matrix.length).toBe(7);
    expect(res.matrix[0].length).toBe(7);

    // Suma de probabilidades debe ser cercana al 100%
    const sum = res.probabilities.homeWin + res.probabilities.draw + res.probabilities.awayWin;
    expect(Math.round(sum)).toBe(100);

    // Marcador más probable debe tener enteros válidos
    expect(Number.isInteger(res.mostLikelyScore.home)).toBe(true);
    expect(Number.isInteger(res.mostLikelyScore.away)).toBe(true);
    expect(res.mostLikelyScore.probability).toBeGreaterThan(0);

    // Over / Under 2.5
    expect(res.overUnder25.overPct + res.overUnder25.underPct).toBe(100);
  });

  test('Consumo de endpoint GET /api/predict/:fixtureId', async () => {
    const res = await request(app).get('/api/predict/fix_test_123');
    expect(res.status).toBe(200);
    expect(res.body.fixtureId).toBe('fix_test_123');
    expect(res.body).toHaveProperty('lambda');
    expect(res.body).toHaveProperty('probabilities');
    expect(res.body).toHaveProperty('mostLikelyScore');
    expect(res.body).toHaveProperty('overUnder25');
  });
});
