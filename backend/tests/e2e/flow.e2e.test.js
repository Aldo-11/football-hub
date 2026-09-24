/**
 * Flujo completo contra MongoDB REAL: registro → login → club favorito →
 * pronóstico → resolución automática → ranking.
 * ESPN se simula para no depender de datos externos cambiantes.
 */
jest.mock('../../services/espnClient', () => require('../helpers/fakeEspn'));

const request = require('supertest');
const mongoose = require('mongoose');
const connectDB = require('../../config/db');
const User = require('../../models/User');
const Prediction = require('../../models/Prediction');
const PredictionLeagueScore = require('../../models/PredictionLeagueScore');
const { resolvePendingPredictions } = require('../../jobs/resolvePredictions');
const { useFixedClock } = require('../helpers/fixedClock');
const { app } = require('../../server');

const email = `e2e_${Date.now()}@footballhub.test`;
const agent = request.agent(app);
let token;

beforeAll(async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI es obligatorio para las pruebas e2e');
  useFixedClock();
  await connectDB();
});

afterAll(async () => {
  const user = await User.findOne({ email });
  if (user) {
    await Prediction.deleteMany({ userId: user._id });
    await PredictionLeagueScore.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });
  }
  await mongoose.connection.close();
  jest.useRealTimers();
});

describe('Flujo e2e con MongoDB', () => {
  test('registro con contraseña débil rechazado; fuerte aceptado', async () => {
    expect((await agent.post('/api/auth/register').send({ email, password: '12345678' })).status).toBe(400);
    const res = await agent.post('/api/auth/register').send({ email, password: 'Segura#2026' });
    expect(res.status).toBe(201);
    token = res.body.accessToken;
    const stored = await User.findOne({ email });
    expect(stored.passwordHash).not.toBe('Segura#2026');
  });

  test('refresh con cookie httpOnly (agente conserva cookies)', async () => {
    const res = await agent.post('/api/auth/refresh');
    expect(res.status).toBe(200);
    token = res.body.accessToken;
  });

  test('club favorito, pronóstico y resolución automática', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    expect((await agent.put('/api/clubs/favorite').set(auth).send({ clubId: 'arsenal' })).status).toBe(200);
    expect((await agent.post('/api/predictions').set(auth).send({ clubId: 'arsenal', fixtureId: '1005', predictedHome: 2, predictedAway: 0 })).status).toBe(201);

    const { resolvedCount } = await resolvePendingPredictions({
      now: new Date('2026-10-04T00:00:00Z'),
      getResult: async () => ({ home: 2, away: 0 })
    });
    expect(resolvedCount).toBeGreaterThanOrEqual(1);

    const board = await agent.get('/api/leaderboard').set(auth);
    const me = board.body.leaderboard.find((r) => r.isMe);
    expect(me).toMatchObject({ totalPoints: 3, exactHits: 1 });
  });
});
