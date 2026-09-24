jest.mock('../../models/User', () => require('../helpers/fakeModels').makeUserModel());
jest.mock('../../models/PredictionLeagueScore', () => require('../helpers/fakeModels').makeScoreModel());

const request = require('supertest');
const User = require('../../models/User');
const { loadApp } = require('../helpers/app');

const app = loadApp();

describe('API de autenticación', () => {
  beforeEach(() => User._reset());

  test.each(['12345678', 'password', 'Password1', 'password1!', 'Corta1!'])(
    'rechaza contraseña débil "%s" en el backend (400)',
    async (password) => {
      const res = await request(app).post('/api/auth/register').send({ email: 'a@test.dev', password });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.details[0].field).toBe('password');
      expect(User._all()).toHaveLength(0);
    }
  );

  test('rechaza correo inválido y campos extra (mass assignment)', async () => {
    expect((await request(app).post('/api/auth/register').send({ email: 'no-es-correo', password: 'Segura#2026' })).status).toBe(400);
    const extra = await request(app).post('/api/auth/register').send({ email: 'x@test.dev', password: 'Segura#2026', totpEnabled: true });
    expect(extra.status).toBe(400);
  });

  test('registro correcto: hash bcrypt, cookie httpOnly y sin datos sensibles en la respuesta', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'Fan@Test.dev', password: 'Segura#2026' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('fan@test.dev');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user).not.toHaveProperty('refreshToken');
    const stored = User._all()[0];
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(stored.refreshToken).toMatch(/^[a-f0-9]{64}$/); // hash, no el token
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
  });

  test('correo duplicado → 409', async () => {
    await request(app).post('/api/auth/register').send({ email: 'dup@test.dev', password: 'Segura#2026' });
    const res = await request(app).post('/api/auth/register').send({ email: 'dup@test.dev', password: 'Segura#2026' });
    expect(res.status).toBe(409);
  });

  test('login: mismo mensaje para usuario inexistente y contraseña incorrecta', async () => {
    await request(app).post('/api/auth/register').send({ email: 'u@test.dev', password: 'Segura#2026' });
    const wrongPass = await request(app).post('/api/auth/login').send({ email: 'u@test.dev', password: 'Otra#2026x' });
    const noUser = await request(app).post('/api/auth/login').send({ email: 'nadie@test.dev', password: 'Otra#2026x' });
    expect(wrongPass.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPass.body.error).toBe(noUser.body.error);
    const ok = await request(app).post('/api/auth/login').send({ email: 'u@test.dev', password: 'Segura#2026' });
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toEqual(expect.any(String));
  });

  test('rutas protegidas: sin token 401, token manipulado 401, token válido 200', async () => {
    const reg = await request(app).post('/api/auth/register').send({ email: 'p@test.dev', password: 'Segura#2026' });
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${reg.body.accessToken}x`)).status).toBe(401);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${reg.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('p@test.dev');
  });

  test('rotación de refresh token y detección de reutilización', async () => {
    const reg = await request(app).post('/api/auth/register').send({ email: 'r@test.dev', password: 'Segura#2026' });
    const first = reg.headers['set-cookie'][0].split(';')[0];

    const rotated = await request(app).post('/api/auth/refresh').set('Cookie', first);
    expect(rotated.status).toBe(200);
    const second = rotated.headers['set-cookie'][0].split(';')[0];
    expect(second).not.toBe(first);

    // Reutilizar el token viejo invalida la sesión completa
    const reuse = await request(app).post('/api/auth/refresh').set('Cookie', first);
    expect(reuse.status).toBe(403);
    const afterReuse = await request(app).post('/api/auth/refresh').set('Cookie', second);
    expect(afterReuse.status).toBe(401);
  });

  test('JSON mal formado → 400 sin detalles internos', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'JSON mal formado', code: 'BAD_JSON' });
  });

  test('cabeceras de seguridad presentes y sin X-Powered-By', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });
});
