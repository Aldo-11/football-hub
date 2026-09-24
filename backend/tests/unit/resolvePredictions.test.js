jest.mock('../../models/Prediction', () => require('../helpers/fakeModels').makePredictionModel());
jest.mock('../../models/PredictionLeagueScore', () => require('../helpers/fakeModels').makeScoreModel());

const Prediction = require('../../models/Prediction');
const Score = require('../../models/PredictionLeagueScore');
const { evaluateMatchPrediction, resolvePendingPredictions } = require('../../jobs/resolvePredictions');

describe('Puntuación de pronósticos', () => {
  test.each([
    [[2, 1], [2, 1], 3],
    [[1, 0], [3, 1], 1],
    [[1, 1], [0, 0], 1],
    [[0, 2], [1, 0], 0]
  ])('pronóstico %j con resultado %j → %i puntos', (pred, real, pts) => {
    expect(evaluateMatchPrediction(pred[0], pred[1], real[0], real[1]).points).toBe(pts);
  });
});

describe('Resolución automática', () => {
  beforeEach(() => { Prediction._reset(); Score._reset(); });

  const add = (fixtureId, userId, h, a, kickoff) => Prediction._all().push({ _id: `${fixtureId}-${userId}`, fixtureId, userId, leagueCode: 'PL', predictedHome: h, predictedAway: a, kickoff: new Date(kickoff), resolved: false });

  test('resuelve solo partidos terminados y no suma dos veces', async () => {
    add('1', 'u1', 2, 1, '2026-09-20T15:00:00Z');
    add('2', 'u1', 0, 0, '2026-09-21T15:00:00Z');
    add('3', 'u1', 1, 1, '2026-10-01T15:00:00Z'); // futuro: no se consulta
    const getResult = jest.fn(async (league, id) => (id === '1' ? { home: 2, away: 1 } : null));
    const now = new Date('2026-09-24T12:00:00Z');

    expect(await resolvePendingPredictions({ now, getResult })).toEqual({ resolvedCount: 1 });
    expect(getResult).toHaveBeenCalledTimes(2);
    expect(Score._all()[0]).toMatchObject({ totalPoints: 3, exactHits: 1 });

    await resolvePendingPredictions({ now, getResult });
    expect(Score._all()[0].totalPoints).toBe(3);
  });

  test('un fallo de la API no detiene el resto', async () => {
    add('1', 'u1', 2, 1, '2026-09-20T15:00:00Z');
    add('2', 'u2', 0, 1, '2026-09-20T15:00:00Z');
    const getResult = jest.fn(async (league, id) => { if (id === '1') throw new Error('caída'); return { home: 0, away: 2 }; });
    expect(await resolvePendingPredictions({ now: new Date('2026-09-24T00:00:00Z'), getResult })).toEqual({ resolvedCount: 1 });
  });
});
