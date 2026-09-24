jest.mock('../../models/User', () => require('../helpers/fakeModels').makeUserModel());
jest.mock('../../models/PredictionLeagueScore', () => require('../helpers/fakeModels').makeScoreModel());
jest.mock('../../models/Prediction', () => require('../helpers/fakeModels').makePredictionModel());
jest.mock('../../services/espnClient', () => require('../helpers/fakeEspn'));

const request = require('supertest');
const fakeEspn = require('../helpers/fakeEspn');
const football = require('../../services/footballService');
const { useFixedClock } = require('../helpers/fixedClock');
const { loadApp, registerAndLogin } = require('../helpers/app');

const app = loadApp();
let token;
const get = (url) => request(app).get(url).set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
  useFixedClock();
  ({ token } = await registerAndLogin(app));
});
afterAll(() => jest.useRealTimers());
beforeEach(() => {
  fakeEspn.state.failAll = false;
  fakeEspn.state.calls.length = 0;
  football._cache.clear();
});

describe('Datos de fútbol', () => {
  test('requieren autenticación', async () => {
    expect((await request(app).get('/api/clubs')).status).toBe(401);
  });

  test('lista exactamente los 10 clubes', async () => {
    const res = await get('/api/clubs');
    expect(res.status).toBe(200);
    expect(res.body.clubs).toHaveLength(10);
  });

  test('valida parámetros: club, liga y partido', async () => {
    expect((await get('/api/clubs/elche/matches')).status).toBe(400);
    expect((await get('/api/leagues/XX/standings')).status).toBe(400);
    expect((await get('/api/matches/PL/abc')).status).toBe(400);
    expect((await get('/api/clubs/arsenal/simulation?simulations=5')).status).toBe(400);
  });

  test('clasificación: pide la temporada actual y marca "Tu club"', async () => {
    const res = await get('/api/leagues/pl/standings');
    expect(res.status).toBe(200);
    expect(res.body.season).toBe('2026-2027');
    expect(fakeEspn.state.calls[0].params).toEqual({ season: 2026 });
    expect(res.body.rows[0]).toMatchObject({ position: 1, points: 6, clubId: 'arsenal' });
    expect(res.body.rows.find((r) => r.team.name === 'Rival Uno').clubId).toBeNull();
  });

  test('partidos: separa pasados/próximos y excluye la temporada anterior', async () => {
    const res = await get('/api/clubs/arsenal/matches');
    expect(res.status).toBe(200);
    expect(res.body.past.map((m) => m.fixtureId)).toEqual(['1003', '1001']);
    expect(res.body.upcoming.map((m) => m.fixtureId)).toEqual(['1005', '1008']);
    expect(res.body.next.fixtureId).toBe('1005');
    expect(JSON.stringify(res.body)).not.toContain('"900"');
  });

  test('análisis del equipo con índice y alertas', async () => {
    const res = await get('/api/clubs/arsenal/analysis');
    expect(res.status).toBe(200);
    expect(res.body.analysis.overall).toMatchObject({ played: 2, points: 6, goalsFor: 5, goalsAgainst: 1 });
    expect(res.body.analysis.index.score).toBeGreaterThan(50);
    expect(res.body.alerts.map((a) => a.id)).toContain('LOW_SAMPLE');
    expect(res.body.standing).toMatchObject({ position: 1, of: 4 });
  });

  test('pronóstico Poisson del próximo partido calculado en el servidor', async () => {
    const res = await get('/api/clubs/arsenal/prediction');
    expect(res.status).toBe(200);
    expect(res.body.match.fixtureId).toBe('1005');
    const p = res.body.prediction.probabilities;
    expect(p.homeWin + p.draw + p.awayWin).toBeCloseTo(100, 5);
  });

  test('simulación Monte Carlo reproducible', async () => {
    const a = await get('/api/clubs/arsenal/simulation?simulations=300&seed=9');
    football._cache.clear();
    const b = await get('/api/clubs/arsenal/simulation?simulations=300&seed=9');
    expect(a.status).toBe(200);
    expect(a.body.teams).toHaveLength(4);
    expect(a.body.remainingMatches).toBe(4);
    expect(a.body.teams).toEqual(b.body.teams);
  });

  test('comparativa H2H entre dos clubes soportados', async () => {
    const res = await get('/api/compare?a=arsenal&b=chelsea');
    expect(res.status).toBe(200);
    expect(res.body.indicators).toHaveLength(4);
    expect(res.body.meetings.map((m) => m.fixtureId)).toEqual(['1005']);
    expect((await get('/api/compare?a=arsenal&b=arsenal')).status).toBe(400);
  });

  test('detalle de partido sin alineaciones publicadas → no disponible (sin inventar)', async () => {
    const res = await get('/api/matches/PL/1001');
    expect(res.status).toBe(200);
    expect(res.body.availability).toEqual({ lineups: false, statistics: false, events: false });
    expect(res.body.match.score).toEqual({ home: 3, away: 1 });
  });

  test('plantilla, noticias e historia', async () => {
    expect((await get('/api/clubs/arsenal/squad')).body.total).toBe(1);
    const news = await get('/api/clubs/arsenal/news');
    expect(news.body.articles[0].url).toMatch(/^https:\/\/www\.espn\.com\/soccer\/story/);
    const profile = await get('/api/clubs/arsenal');
    expect(profile.body.history).toMatchObject({ founded: 1886, cutoff: expect.any(String) });
  });

  test('API externa caída sin caché → 503 con mensaje claro y sin detalles internos', async () => {
    fakeEspn.state.failAll = true;
    const res = await get('/api/leagues/PL/standings');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'La fuente de datos no está disponible en este momento.', code: 'UPSTREAM_UNAVAILABLE' });
  });

  test('API externa caída con caché previa → datos marcados como stale', async () => {
    await get('/api/leagues/PL/standings');
    // Forzar expiración de la entrada
    football._cache.store.forEach((e) => { e.expiresAt = 0; });
    fakeEspn.state.failAll = true;
    const res = await get('/api/leagues/PL/standings');
    expect(res.status).toBe(200);
    expect(res.body.meta.stale).toBe(true);
  });
});

describe('Club favorito', () => {
  test('solo acepta clubes del catálogo', async () => {
    const bad = await request(app).put('/api/clubs/favorite').set('Authorization', `Bearer ${token}`).send({ clubId: 'elche' });
    expect(bad.status).toBe(400);
    const ok = await request(app).put('/api/clubs/favorite').set('Authorization', `Bearer ${token}`).send({ clubId: 'bayern' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.favoriteTeamId).toBe('bayern');
  });
});
