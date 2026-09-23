const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const connectDB = require('../config/db');
const User = require('../models/User');
const Prediction = require('../models/Prediction');
const PredictionLeagueScore = require('../models/PredictionLeagueScore');

let agent;
let testUserEmail;
let userToken = '';

beforeAll(async () => {
  await connectDB();
  agent = request.agent(app); // preserva cookies httpOnly
  testUserEmail = `e2e_fan_${Date.now()}@footballhub.test`;
});

afterAll(async () => {
  const user = await User.findOne({ email: testUserEmail });
  if (user) {
    await Prediction.deleteMany({ userId: user._id });
    await PredictionLeagueScore.deleteOne({ userId: user._id });
    await User.deleteOne({ _id: user._id });
  }
  await mongoose.connection.close();
});

describe('Verificación Integral End-to-End del Sistema Football Hub', () => {
  test('1. Flujo de Registro, Emisión de Tokens y Cookie httpOnly', async () => {
    const res = await agent
      .post('/api/auth/register')
      .send({ email: testUserEmail, password: 'PasswordSuper123!' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.email).toBe(testUserEmail.toLowerCase());
    userToken = res.body.accessToken;

    // Verificar cookie de sesión
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
  });

  test('2. Selección y Persistencia de Club Favorito en MongoDB Atlas', async () => {
    const res = await agent
      .put('/api/teams/favorite')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ teamId: '65' }); // Manchester City

    expect(res.status).toBe(200);
    expect(res.body.user.favoriteTeamId).toBe('65');

    // Confirmar en perfil /me
    const meRes = await agent
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.favoriteTeamId).toBe('65');
  });

  test('3. Consulta del Matchday: Próximos Partidos y Tabla con Caché', async () => {
    const nextRes = await agent.get('/api/matches/next/65');
    expect(nextRes.status).toBe(200);
    expect(nextRes.body.data.length).toBeGreaterThan(0);

    const standingsRes = await agent.get('/api/matches/standings/PL');
    expect(standingsRes.status).toBe(200);
    expect(standingsRes.body.data.standings.length).toBeGreaterThan(0);
  });

  test('4. Motor de Pronóstico Poisson con desglose estadístico', async () => {
    const predRes = await agent.get('/api/predict/fix_test_fixture');
    expect(predRes.status).toBe(200);
    expect(predRes.body).toHaveProperty('lambda');
    expect(predRes.body).toHaveProperty('probabilities');
    expect(predRes.body.probabilities).toHaveProperty('homeWin');
    expect(predRes.body.probabilities).toHaveProperty('draw');
    expect(predRes.body.probabilities).toHaveProperty('awayWin');
    expect(predRes.body).toHaveProperty('mostLikelyScore');
    expect(predRes.body).toHaveProperty('overUnder25');
  });

  test('5. Feed Dual Unificado de Noticias', async () => {
    const newsRes = await agent.get('/api/news/65');
    expect(newsRes.status).toBe(200);
    expect(Array.isArray(newsRes.body.news)).toBe(true);
    expect(newsRes.body.news.length).toBeGreaterThan(0);
  });

  test('6. Registro en la Liga de Pronósticos y Consulta de Leaderboard', async () => {
    const submitRes = await agent
      .post('/api/predictions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        fixtureId: 'fix_e2e_game_1',
        predictedHome: 2,
        predictedAway: 1
      });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.prediction.predictedHome).toBe(2);

    const lbRes = await agent.get('/api/leaderboard');
    expect(lbRes.status).toBe(200);
    expect(Array.isArray(lbRes.body.leaderboard)).toBe(true);
    expect(lbRes.body.leaderboard.length).toBeGreaterThan(0);
  });

  test('7. Endpoint de Salud /api/health/football', async () => {
    const healthRes = await agent.get('/api/health/football');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('healthy');
  });
});
