const norm = require('../../services/espnNormalizers');
const { getCurrentSeason } = require('../../config/season');
const { standingsEntry, standingsResponse, event } = require('../helpers/espnFixtures');

const season = getCurrentSeason(new Date('2026-09-24T12:00:00Z'));

describe('normalizeStandings', () => {
  const raw = standingsResponse([
    standingsEntry(1, 'B', { pj: 5, w: 3, d: 1, l: 1, gf: 9, ga: 4 }),
    standingsEntry(2, 'A', { pj: 5, w: 3, d: 1, l: 1, gf: 10, ga: 4 }),
    standingsEntry(3, 'C', { pj: 5, w: 4, d: 0, l: 1, gf: 8, ga: 5 })
  ]);

  test('ordena por puntos, diferencia y goles a favor y asigna posición', () => {
    const { rows } = norm.normalizeStandings(raw, 2026);
    expect(rows.map((r) => r.team.name)).toEqual(['C', 'A', 'B']);
    expect(rows[0]).toMatchObject({ position: 1, points: 12, playedGames: 5, won: 4, draw: 0, lost: 1, goalsFor: 8, goalsAgainst: 5, goalDifference: 3 });
    expect(rows[0]).not.toHaveProperty('rank');
  });

  test('respeta el rank oficial de la fuente (desempates propios de la liga)', () => {
    const ranked = standingsResponse([
      standingsEntry(1, 'X', { pj: 2, w: 1, d: 0, l: 1, gf: 2, ga: 2, rank: 2 }),
      standingsEntry(2, 'Y', { pj: 2, w: 1, d: 0, l: 1, gf: 2, ga: 2, rank: 1 })
    ]);
    expect(norm.normalizeStandings(ranked, 2026).rows.map((r) => r.team.name)).toEqual(['Y', 'X']);
  });

  test('rechaza una clasificación de otra temporada (no mezcla temporadas)', () => {
    const old = standingsResponse([standingsEntry(1, 'A', { pj: 38, w: 20, d: 10, l: 8, gf: 60, ga: 40 })], 2025);
    expect(() => norm.normalizeStandings(old, 2026)).toThrow(expect.objectContaining({ code: 'SEASON_MISMATCH' }));
  });

  test('formato inesperado produce error controlado', () => {
    expect(() => norm.normalizeStandings({ foo: 1 }, 2026)).toThrow(expect.objectContaining({ code: 'UPSTREAM_BAD_FORMAT' }));
  });
});

describe('normalizeEvents', () => {
  const ctx = { season, leagueName: 'Premier League', leagueCode: 'PL' };

  test('estados: terminado, programado, aplazado; marcador solo si se jugó', () => {
    const events = [
      event({ id: 1, date: '2026-08-22T14:00Z', home: [359, 'Arsenal'], away: [1, 'Rival'], homeScore: 2, awayScore: 0 }),
      event({ id: 2, date: '2026-10-03T14:00Z', home: [2, 'Otro'], away: [359, 'Arsenal'], state: 'pre', completed: false }),
      event({ id: 3, date: '2026-09-27T14:00Z', home: [3, 'X'], away: [359, 'Arsenal'], state: 'post', completed: false, statusName: 'STATUS_POSTPONED' })
    ];
    const out = norm.normalizeEvents(events, ctx);
    expect(out.map((m) => [m.fixtureId, m.status])).toEqual([['1', 'FINISHED'], ['3', 'POSTPONED'], ['2', 'SCHEDULED']]);
    expect(out[0].score).toEqual({ home: 2, away: 0 });
    expect(out[2].score).toEqual({ home: null, away: null });
    expect(out[0].utcDate).toBe('2026-08-22T14:00:00.000Z');
  });

  test('descarta partidos de la temporada anterior y duplicados', () => {
    const events = [
      event({ id: 10, date: '2026-05-19T15:00Z', home: [359, 'Arsenal'], away: [1, 'R'], homeScore: 2, awayScore: 1, season: 2025 }),
      event({ id: 11, date: '2026-08-30T15:00Z', home: [359, 'Arsenal'], away: [1, 'R'], homeScore: 1, awayScore: 1 }),
      event({ id: 11, date: '2026-08-30T15:00Z', home: [359, 'Arsenal'], away: [1, 'R'], homeScore: 1, awayScore: 1 })
    ];
    const out = norm.normalizeEvents(events, ctx);
    expect(out.map((m) => m.fixtureId)).toEqual(['11']);
  });

  test('ignora eventos sin competidores o sin fecha válida', () => {
    expect(norm.normalizeEvents([{ id: 1, competitions: [{ date: 'x', competitors: [] }] }], ctx)).toEqual([]);
  });
});

describe('normalizeMatchDetail', () => {
  const base = {
    header: {
      id: '99', season: { year: 2026 },
      competitions: [event({ id: 99, date: '2026-09-20T15:00Z', home: [359, 'Arsenal'], away: [1, 'Rival'], homeScore: 2, awayScore: 1 }).competitions[0]]
    }
  };

  test('sin alineaciones ni estadísticas publicadas → marca no disponible (no inventa)', () => {
    const d = norm.normalizeMatchDetail(base, { season });
    expect(d.availability).toEqual({ lineups: false, statistics: false, events: false });
    expect(d.lineups).toEqual({ home: null, away: null });
    expect(d.statistics).toEqual([]);
  });

  test('usa alineaciones, estadísticas y eventos reales cuando existen', () => {
    const player = (id, name, starter, pos, extra = {}) => ({ starter, jersey: String(id), athlete: { id: String(id), displayName: name }, position: { abbreviation: pos }, ...extra });
    const raw = {
      ...base,
      rosters: [
        { homeAway: 'home', formation: '4-3-3', roster: [player(1, 'Portero', true, 'G'), player(2, 'Suplente', false, 'F', { subbedIn: true })] },
        { homeAway: 'away', formation: { name: '4-4-2' }, roster: [player(3, 'Otro', true, 'G')] }
      ],
      boxscore: { teams: [
        { team: { id: '359' }, statistics: [{ name: 'possessionPct', displayValue: '58.2' }, { name: 'shotsOnTarget', displayValue: '6' }] },
        { team: { id: '1' }, statistics: [{ name: 'possessionPct', displayValue: '41.8' }, { name: 'shotsOnTarget', displayValue: '2' }] }
      ] },
      keyEvents: [
        { type: { type: 'goal', text: 'Goal' }, clock: { displayValue: "23'" }, team: { id: '359' }, participants: [{ athlete: { displayName: 'Portero' } }] },
        { type: { type: 'kickoff', text: 'Kickoff' } }
      ]
    };
    const d = norm.normalizeMatchDetail(raw, { season });
    expect(d.lineups.home.formation).toBe('4-3-3');
    expect(d.lineups.away.formation).toBe('4-4-2');
    expect(d.lineups.home.starters.map((p) => p.name)).toEqual(['Portero']);
    expect(d.lineups.home.bench[0]).toMatchObject({ name: 'Suplente', subbedIn: true });
    expect(d.statistics.find((s) => s.key === 'possessionPct')).toMatchObject({ home: 58.2, away: 41.8 });
    expect(d.events).toEqual([{ type: 'goal', minute: "23'", side: 'home', players: ['Portero'] }]);
  });
});

describe('normalizeRoster', () => {
  test('agrupa por posición, elimina duplicados y acepta listas agrupadas', () => {
    const raw = { season: { year: 2026 }, athletes: [
      { id: '1', displayName: 'GK Uno', jersey: '1', position: { abbreviation: 'G' } },
      { id: '1', displayName: 'GK Uno', jersey: '1', position: { abbreviation: 'G' } },
      { items: [{ id: '2', displayName: 'Def', jersey: '4', position: { abbreviation: 'CD' } }] },
      { id: '3', displayName: 'Del', jersey: '9', position: { name: 'Forward' } },
      { id: '4', displayName: 'Medio', jersey: '8', position: { abbreviation: 'CM' } }
    ] };
    const r = norm.normalizeRoster(raw);
    expect(r.total).toBe(4);
    expect(r.groups.map((g) => g.key)).toEqual(['GK', 'DF', 'MF', 'FW']);
  });
});

test('posiciones: DM es centrocampista (no defensa) y CD-L es defensa', () => {
  expect(norm.positionGroupOf({ abbreviation: 'DM' })).toBe('MF');
  expect(norm.positionGroupOf({ abbreviation: 'CD-L' })).toBe('DF');
  expect(norm.positionGroupOf({ abbreviation: 'CF-R' })).toBe('FW');
  expect(norm.positionGroupOf({ abbreviation: 'G' })).toBe('GK');
  expect(norm.positionGroupOf({ name: 'Defender' })).toBe('DF');
  expect(norm.positionGroupOf({})).toBe('OT');
});

describe('normalizeNews', () => {
  test('solo artículos con enlace directo; imagen opcional; ordena por fecha', () => {
    const raw = { articles: [
      { id: 1, headline: 'Antigua', published: '2026-09-20T10:00:00Z', links: { web: { href: 'https://www.espn.com/soccer/story/_/id/1/a' } } },
      { id: 2, headline: 'Nueva', published: '2026-09-23T10:00:00Z', links: { web: { href: 'https://www.espn.com/soccer/story/_/id/2/b' } }, images: [{ url: 'https://img/x.jpg' }] },
      { id: 3, headline: 'Portada', links: { web: { href: 'https://www.espn.com/' } } },
      { id: 4, headline: 'Sin enlace' },
      { id: 5, headline: 'Inseguro', links: { web: { href: 'javascript:alert(1)' } } }
    ] };
    const out = norm.normalizeNews(raw);
    expect(out.map((n) => n.title)).toEqual(['Nueva', 'Antigua']);
    expect(out[0].imageUrl).toBe('https://img/x.jpg');
    expect(out[1].imageUrl).toBeNull();
  });
});
