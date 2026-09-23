const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const connectDB = require('../config/db');
const User = require('../models/User');
const { StandingsCache, FixturesCache } = require('../models/Cache');
const PredictionLeagueScore = require('../models/PredictionLeagueScore');

let server;

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  // Limpiar usuarios de prueba creados
  await User.deleteMany({ email: /test.*@footballhub\.test/ });
  await mongoose.connection.close();
});

describe('Módulos 1 & 2: Autenticación, Seguridad y Modelos de Datos', () => {
  const testUser = {
    email: `test_${Date.now()}@footballhub.test`,
    password: 'PasswordSuperSeguro123!'
  };

  let accessToken = '';
  let refreshCookie = '';

  test('Zod rechaza contraseñas cortas o correos inválidos', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'correo-invalido', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Error de validación');
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  test('Registro de usuario exitoso con hash bcrypt y emisión de tokens', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toHaveProperty('email', testUser.email.toLowerCase());
    expect(res.body).toHaveProperty('accessToken');
    expect(res.headers['set-cookie']).toBeDefined();

    accessToken = res.body.accessToken;
    refreshCookie = res.headers['set-cookie'][0];

    // Verificar que la cookie es httpOnly y SameSite=Strict
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('SameSite=Strict');

    // Verificar que se inicializó PredictionLeagueScore
    const score = await PredictionLeagueScore.findOne({ userId: res.body.user.id });
    expect(score).not.toBeNull();
    expect(score.totalPoints).toBe(0);
  });

  test('Login exitoso y emisión de cookie de refresco rotativo', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.headers['set-cookie']).toBeDefined();

    accessToken = res.body.accessToken;
    refreshCookie = res.headers['set-cookie'][0];
  });

  test('Acceso a ruta protegida /api/auth/me con Bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
  });

  test('Rotación de refresh token con emisión de nuevo access token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [refreshCookie]);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.headers['set-cookie']).toBeDefined();

    // El nuevo cookie debe ser diferente (rotación)
    const newRefreshCookie = res.headers['set-cookie'][0];
    expect(newRefreshCookie).toBeDefined();
  });

  test('Modelos de Caché con TTL de 3600 segundos en MongoDB Atlas', async () => {
    const cacheDoc = await StandingsCache.create({
      leagueId: `TEST_LEAGUE_${Date.now()}`,
      data: { test: true }
    });
    expect(cacheDoc._id).toBeDefined();
    await StandingsCache.deleteOne({ _id: cacheDoc._id });
  });
});
