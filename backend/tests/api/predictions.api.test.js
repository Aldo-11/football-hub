jest.mock('../../models/User', () => require('../helpers/fakeModels').makeUserModel());
jest.mock('../../models/PredictionLeagueScore', () => require('../helpers/fakeModels').makeScoreModel());
jest.mock('../../models/Prediction', () => require('../helpers/fakeModels').makePredictionModel());
jest.mock('../../services/espnClient', () => require('../helpers/fakeEspn'));

const request = require('supertest');
const { useFixedClock } = require('../helpers/fixedClock');
const { loadApp, registerAndLogin } = require('../helpers/app');

const app = loadApp();
let token;
const post = (body) => request(app).post('/api/predictions').set('Authorization', `Bearer ${token}`).send(body);

beforeAll(async () => {
  useFixedClock();
  ({ token } = await registerAndLogin(app));
});
afterAll(() => jest.useRealTimers());

describe('Liga de pronósticos', () => {
  test('acepta un partido próximo real del club y guarda el contexto verificado', async () => {
    const res = await post({ clubId: 'arsenal', fixtureId: '1005', predictedHome: 2, predictedAway: 1 });
    expect(res.status).toBe(201);
    expect(res.body.prediction).toMatchObject({ homeTeam: 'Arsenal', awayTeam: 'Chelsea', leagueCode: 'PL' });
    const again = await post({ clubId: 'arsenal', fixtureId: '1005', predictedHome: 1, predictedAway: 1 });
    expect(again.status).toBe(200);
  });

  test('rechaza partidos ya jugados o inexistentes (validación del servidor)', async () => {
    expect((await post({ clubId: 'arsenal', fixtureId: '1001', predictedHome: 1, predictedAway: 0 })).status).toBe(422);
    expect((await post({ clubId: 'arsenal', fixtureId: '999999', predictedHome: 1, predictedAway: 0 })).status).toBe(422);
  });

  test('rechaza marcadores inválidos', async () => {
    expect((await post({ clubId: 'arsenal', fixtureId: '1005', predictedHome: -1, predictedAway: 0 })).status).toBe(400);
    expect((await post({ clubId: 'arsenal', fixtureId: '1005', predictedHome: 1.5, predictedAway: 0 })).status).toBe(400);
    expect((await post({ clubId: 'arsenal', fixtureId: '1005', predictedHome: '2', predictedAway: 0 })).status).toBe(400);
  });

  test('ranking con correo enmascarado', async () => {
    const res = await request(app).get('/api/leaderboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.leaderboard[0].displayName).toMatch(/\*\*\*/);
  });
});
