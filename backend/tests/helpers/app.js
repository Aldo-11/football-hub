/**
 * Carga la app Express con ESPN y los modelos de MongoDB simulados.
 * Debe requerirse DESPUÉS de declarar los jest.mock en cada archivo de prueba.
 */
const request = require('supertest');

const loadApp = () => require('../../server').app;

const registerAndLogin = async (app, email = `fan_${Date.now()}_${Math.random().toString(16).slice(2)}@test.dev`) => {
  const res = await request(app).post('/api/auth/register').send({ email, password: 'Segura#2026' });
  return { token: res.body.accessToken, user: res.body.user, cookie: res.headers['set-cookie']?.[0], email };
};

module.exports = { loadApp, registerAndLogin };
