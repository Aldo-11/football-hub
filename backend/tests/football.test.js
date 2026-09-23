const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const connectDB = require('../config/db');
const User = require('../models/User');
const { StandingsCache, FixturesCache } = require('../models/Cache');

let userToken = '';
let testUser;

beforeAll(async () => {
  await connectDB();
  testUser = await User.create({
    email: `football_tester_${Date.now()}@footballhub.test`,
    passwordHash: 'dummyhash123'
  });
  const jwt = require('jsonwebtoken');
  const config = require('../config/env');
  userToken = jwt.sign({ id: testUser._id, email: testUser.email }, config.jwtAccessSecret, { expiresIn: '15m' });
});

afterAll(async () => {
  if (testUser) await User.deleteOne({ _id: testUser._id });
  await mongoose.connection.close();
});

describe('Módulo 3: Servicio de Fútbol con Caché y Health Check', () => {
  test('Obtener equipos disponibles para selección', async () => {
    const res = await request(app).get('/api/teams');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.teams)).toBe(true);
    expect(res.body.teams.length).toBeGreaterThan(0);
    expect(res.body.teams[0]).toHaveProperty('id');
    expect(res.body.teams[0]).toHaveProperty('name');
  });

  test('Guardar equipo favorito para usuario autenticado', async () => {
    const res = await request(app)
      .put('/api/teams/favorite')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ teamId: '65' });

    expect(res.status).toBe(200);
    expect(res.body.user.favoriteTeamId).toBe('65');
  });

  test('Obtener tabla de posiciones y guardar en caché TTL', async () => {
    // Limpiar caché previo de PL
    await StandingsCache.deleteOne({ leagueId: 'PL' });

    const res1 = await request(app).get('/api/matches/standings/PL');
    expect(res1.status).toBe(200);
    expect(res1.body).toHaveProperty('data');
    expect(res1.body.data.standings.length).toBeGreaterThan(0);

    // Segundo llamado debe venir de caché
    const res2 = await request(app).get('/api/matches/standings/PL');
    expect(res2.status).toBe(200);
    expect(res2.body.source).toBe('cache');
  });

  test('Obtener próximos y últimos partidos con caché en MongoDB', async () => {
    const resNext = await request(app).get('/api/matches/next/65');
    expect(resNext.status).toBe(200);
    expect(Array.isArray(resNext.body.data)).toBe(true);

    const resLast = await request(app).get('/api/matches/last/65');
    expect(resLast.status).toBe(200);
    expect(Array.isArray(resLast.body.data)).toBe(true);
  });

  test('Endpoint de salud /api/health/football reporta estado y caché', async () => {
    const res = await request(app).get('/api/health/football');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body).toHaveProperty('primarySource');
    expect(res.body).toHaveProperty('secondarySource');
    expect(res.body).toHaveProperty('cache');
    expect(res.body.cache.standingsCachedCount).toBeGreaterThan(0);
  });
});
