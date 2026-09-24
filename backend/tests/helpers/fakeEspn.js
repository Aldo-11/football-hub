/**
 * Simula la API de ESPN para una "liga de prueba" de 4 equipos
 * (Arsenal 359, Chelsea 363, y dos rivales). Datos de PRUEBA, no reales.
 */
const { standingsEntry, standingsResponse, event } = require('./espnFixtures');
const { UpstreamError } = require('../../utils/errors');

const ARS = [359, 'Arsenal'];
const CHE = [363, 'Chelsea'];
const R1 = [901, 'Rival Uno'];
const R2 = [902, 'Rival Dos'];

const standings = standingsResponse([
  standingsEntry(359, 'Arsenal', { pj: 2, w: 2, d: 0, l: 0, gf: 5, ga: 1 }),
  standingsEntry(363, 'Chelsea', { pj: 2, w: 1, d: 1, l: 0, gf: 3, ga: 2 }),
  standingsEntry(901, 'Rival Uno', { pj: 2, w: 0, d: 1, l: 1, gf: 2, ga: 4 }),
  standingsEntry(902, 'Rival Dos', { pj: 2, w: 0, d: 0, l: 2, gf: 1, ga: 4 })
]);

const all = [
  event({ id: 1001, date: '2026-08-22T14:00Z', home: ARS, away: R1, homeScore: 3, awayScore: 1 }),
  event({ id: 1002, date: '2026-08-22T16:30Z', home: CHE, away: R2, homeScore: 2, awayScore: 1 }),
  event({ id: 1003, date: '2026-08-29T14:00Z', home: R2, away: ARS, homeScore: 0, awayScore: 2 }),
  event({ id: 1004, date: '2026-08-29T16:30Z', home: R1, away: CHE, homeScore: 1, awayScore: 1 }),
  event({ id: 1005, date: '2026-10-03T14:00Z', home: ARS, away: CHE, state: 'pre', completed: false }),
  event({ id: 1006, date: '2026-10-03T16:30Z', home: R1, away: R2, state: 'pre', completed: false }),
  event({ id: 1007, date: '2026-10-10T14:00Z', home: CHE, away: R1, state: 'pre', completed: false }),
  event({ id: 1008, date: '2026-10-10T16:30Z', home: R2, away: ARS, state: 'pre', completed: false }),
  // Partido de la temporada anterior que la fuente podría colar: debe descartarse
  event({ id: 900, date: '2026-05-19T15:00Z', home: ARS, away: R1, homeScore: 2, awayScore: 1, season: 2025 })
];
const involves = (id) => (e) => e.competitions[0].competitors.some((c) => c.team.id === String(id));
const finished = (e) => e.competitions[0].status.type.completed;

const state = { failAll: false, calls: [] };

const getJson = async (base, path, params = {}) => {
  state.calls.push({ base, path, params });
  if (state.failAll) throw new UpstreamError('La fuente de datos no está disponible en este momento.', 'UPSTREAM_UNAVAILABLE');

  if (path.endsWith('/standings')) return standings;
  const sched = path.match(/\/teams\/(\d+)\/schedule$/);
  if (sched) {
    const events = all.filter(involves(sched[1])).filter((e) => (params.fixture ? !finished(e) : finished(e)));
    return { events };
  }
  if (path.endsWith('/scoreboard')) return { events: all };
  if (path.endsWith('/summary')) {
    const e = all.find((x) => x.id === String(params.event));
    if (!e) throw new UpstreamError('La fuente de datos no tiene este recurso.', 'UPSTREAM_NOT_FOUND', { status: 404 });
    return { header: { id: e.id, season: e.season, competitions: e.competitions } };
  }
  if (path.endsWith('/roster')) {
    return { season: { year: 2026 }, athletes: [{ id: '1', displayName: 'Portero Prueba', jersey: '1', position: { abbreviation: 'G' } }] };
  }
  if (path.endsWith('/news')) {
    return { articles: [{ id: 1, headline: 'Noticia de prueba', published: '2026-09-23T10:00:00Z', links: { web: { href: 'https://www.espn.com/soccer/story/_/id/1/prueba' } } }] };
  }
  if (path.endsWith('/teams')) return { sports: [] };
  throw new Error(`Ruta no simulada: ${path}`);
};

module.exports = { getJson, state };
