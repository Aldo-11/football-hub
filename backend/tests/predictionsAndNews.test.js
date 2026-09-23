const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { app } = require('../server');
const connectDB = require('../config/db');
const User = require('../models/User');
const Prediction = require('../models/Prediction');
const PredictionLeagueScore = require('../models/PredictionLeagueScore');
const { evaluateMatchPrediction, resolvePendingPredictions } = require('../jobs/resolvePredictions');
const config = require('../config/env');

let testUser;
let userToken;

beforeAll(async () => {
  await connectDB();
  testUser = await User.create({
    email: `league_tester_${Date.now()}@footballhub.test`,
    passwordHash: 'dummyhashedpw123'
  });
  userToken = jwt.sign({ id: testUser._id, email: testUser.email }, config.jwtAccessSecret, { expiresIn: '15m' });
  await PredictionLeagueScore.create({
    userId: testUser._id,
    totalPoints: 0,
    exactHits: 0,
    resultHits: 0
  });
});

afterAll(async () => {
  if (testUser) {
    await Prediction.deleteMany({ userId: testUser._id });
    await PredictionLeagueScore.deleteOne({ userId: testUser._id });
    await User.deleteOne({ _id: testUser._id });
  }
  await mongoose.connection.close();
});

describe('Módulos 5 & 6: Feed de Noticias y Liga de Pronósticos', () => {
  test('Feed unificado de noticias para un equipo', async () => {
    const res = await request(app).get('/api/news/65');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.news)).toBe(true);
    expect(res.body.news.length).toBeGreaterThan(0);
    expect(res.body.news[0]).toHaveProperty('title');
    expect(res.body.news[0]).toHaveProperty('url');
  });

  test('Lógica pura de evaluación de pronósticos', () => {
    // 1. Marcador exacto -> 3 puntos
    const exact = evaluateMatchPrediction(2, 1, 2, 1);
    expect(exact.points).toBe(3);
    expect(exact.exactHit).toBe(1);

    // 2. Acierto de ganador (1X2) -> 1 punto
    const outcome = evaluateMatchPrediction(3, 0, 1, 0);
    expect(outcome.points).toBe(1);
    expect(outcome.resultHit).toBe(1);

    // 3. Empate acertado con distinto marcador -> 1 punto
    const draw = evaluateMatchPrediction(1, 1, 2, 2);
    expect(draw.points).toBe(1);
    expect(draw.resultHit).toBe(1);

    // 4. Falla -> 0 puntos
    const miss = evaluateMatchPrediction(2, 0, 0, 1);
    expect(miss.points).toBe(0);
  });

  test('Crear un pronóstico y consultarlo en /api/predictions/my', async () => {
    const fixtureId = `fix_test_fixture_${Date.now()}`;
    const res = await request(app)
      .post('/api/predictions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        fixtureId,
        predictedHome: 2,
        predictedAway: 1
      });

    expect(res.status).toBe(201);
    expect(res.body.prediction.predictedHome).toBe(2);
    expect(res.body.prediction.predictedAway).toBe(1);
    expect(res.body.prediction.resolved).toBe(false);

    // Consultar mis predicciones
    const myRes = await request(app)
      .get('/api/predictions/my')
      .set('Authorization', `Bearer ${userToken}`);

    expect(myRes.status).toBe(200);
    expect(myRes.body.predictions.some(p => p.fixtureId === fixtureId)).toBe(true);
  });

  test('Resolución automática de pronósticos mediante Cron y actualización de Leaderboard', async () => {
    const fixtureId = `fix_cron_test_${Date.now()}`;
    await Prediction.create({
      userId: testUser._id,
      fixtureId,
      predictedHome: 3,
      predictedAway: 1,
      resolved: false
    });

    // Simular que el partido finalizó 3-1 (acierto exacto)
    const simulated = {
      [fixtureId]: { home: 3, away: 1 }
    };

    const cronResult = await resolvePendingPredictions(simulated);
    expect(cronResult.resolvedCount).toBeGreaterThanOrEqual(1);

    // Verificar en BD que se otorgaron 3 puntos
    const resolvedPred = await Prediction.findOne({ userId: testUser._id, fixtureId });
    expect(resolvedPred.resolved).toBe(true);
    expect(resolvedPred.pointsAwarded).toBe(3);

    // Verificar Leaderboard
    const lbRes = await request(app).get('/api/leaderboard');
    expect(lbRes.status).toBe(200);
    expect(Array.isArray(lbRes.body.leaderboard)).toBe(true);

    const userEntry = lbRes.body.leaderboard.find(e => String(e.userId) === String(testUser._id));
    expect(userEntry).toBeDefined();
    expect(userEntry.totalPoints).toBeGreaterThanOrEqual(3);
    expect(userEntry.exactHits).toBeGreaterThanOrEqual(1);
    expect(userEntry.rank).toMatch(/^\d{2}$/); // Formato marcador "01", "02"...
  });
});
