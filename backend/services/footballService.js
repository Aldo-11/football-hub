/**
 * Servicio de datos de fútbol: combina el cliente ESPN, la caché y los
 * normalizadores. Toda la aplicación obtiene datos deportivos desde aquí.
 *
 * Temporada: siempre se pide explícitamente la temporada actual
 * (`season=<año de inicio>`), nunca la que ESPN considere por defecto.
 */
const espn = require('./espnClient');
const TtlCache = require('../utils/ttlCache');
const logger = require('../config/logger');
const { getCurrentSeason } = require('../config/season');
const { getClub, getLeague, getClubByEspnId, LEAGUES } = require('../config/clubs');
const { notFound, UpstreamError } = require('../utils/errors');
const norm = require('./espnNormalizers');

const MINUTE = 60 * 1000;
const TTL = {
  standings: 15 * MINUTE,
  schedule: 10 * MINUTE,
  leagueFixtures: 60 * MINUTE,
  detailFinished: 12 * 60 * MINUTE,
  detailOther: 2 * MINUTE,
  roster: 6 * 60 * MINUTE,
  news: 30 * MINUTE
};

const cache = new TtlCache();

const meta = (result) => ({
  source: 'ESPN',
  fetchedAt: result.fetchedAt,
  cache: result.cache,
  stale: result.stale
});

const requireLeague = (code) => {
  const league = getLeague(code);
  if (!league) throw notFound('Liga no soportada');
  return league;
};

const requireClub = (clubId) => {
  const club = getClub(clubId);
  if (!club) throw notFound('Club no soportado');
  return club;
};

const wrapNormalizerError = (fn) => {
  try {
    return fn();
  } catch (error) {
    if (error.code === 'SEASON_MISMATCH') {
      logger.warn(`Temporada incorrecta recibida de la fuente: ${error.message}`);
      throw new UpstreamError('La fuente devolvió datos de otra temporada; no se muestran para no mezclar temporadas.', 'SEASON_MISMATCH', { status: 502 });
    }
    if (error.code === 'UPSTREAM_BAD_FORMAT') {
      throw new UpstreamError('La fuente de datos devolvió un formato inesperado.', 'UPSTREAM_BAD_FORMAT', { status: 502 });
    }
    throw error;
  }
};

const yyyymmdd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');

// ───────────────────────── Clasificación ─────────────────────────
const getStandings = async (leagueCode) => {
  const league = requireLeague(leagueCode);
  const season = getCurrentSeason();

  const result = await cache.wrap(`standings:${league.code}:${season.espnSeason}`, TTL.standings, async () => {
    const raw = await espn.getJson('standings', `/${league.espnSlug}/standings`, { season: season.espnSeason });
    const parsed = wrapNormalizerError(() => norm.normalizeStandings(raw, season.espnSeason));
    if (parsed.rows.length < 2) {
      throw new UpstreamError('La clasificación recibida está incompleta.', 'UPSTREAM_INCOMPLETE', { status: 502 });
    }
    return parsed;
  });

  return {
    league: { code: league.code, name: league.name, zones: league.zones, expectedTeams: league.teams },
    season: season.label,
    complete: result.data.rows.length === league.teams,
    rows: result.data.rows.map((r) => ({ ...r, clubId: getClubByEspnId(r.team.espnId)?.id || null })),
    meta: meta(result)
  };
};

// ───────────────────────── Partidos de un club ─────────────────────────
const fetchTeamSchedule = async (league, espnId, season) => {
  // ESPN separa resultados (schedule) y próximos partidos (schedule?fixture=true)
  const [results, fixtures] = await Promise.allSettled([
    espn.getJson('site', `/${league.espnSlug}/teams/${espnId}/schedule`, { season: season.espnSeason }),
    espn.getJson('site', `/${league.espnSlug}/teams/${espnId}/schedule`, { season: season.espnSeason, fixture: true })
  ]);
  if (results.status === 'rejected' && fixtures.status === 'rejected') throw results.reason;

  const events = [
    ...(results.status === 'fulfilled' ? results.value.events || [] : []),
    ...(fixtures.status === 'fulfilled' ? fixtures.value.events || [] : [])
  ];
  return {
    matches: norm.normalizeEvents(events, { season, leagueName: league.name, leagueCode: league.code }),
    partial: results.status === 'rejected' || fixtures.status === 'rejected'
  };
};

const getClubMatches = async (clubId) => {
  const club = requireClub(clubId);
  const league = LEAGUES[club.league];
  const season = getCurrentSeason();

  const result = await cache.wrap(`schedule:${club.espnId}:${season.espnSeason}`, TTL.schedule,
    () => fetchTeamSchedule(league, club.espnId, season));

  return { club, league, season: season.label, matches: result.data.matches, partial: result.data.partial, meta: meta(result) };
};

// ───────────────────── Partidos pendientes de una liga ─────────────────────
const getLeagueFixtures = async (leagueCode, standingsRows) => {
  const league = requireLeague(leagueCode);
  const season = getCurrentSeason();
  const n = standingsRows.length;
  const expectedTotal = n * (n - 1);

  const result = await cache.wrap(`leagueFixtures:${league.code}:${season.espnSeason}`, TTL.leagueFixtures, async () => {
    let matches = [];
    let method = 'scoreboard';
    try {
      const raw = await espn.getJson('site', `/${league.espnSlug}/scoreboard`, {
        dates: `${yyyymmdd(season.startsAt)}-${yyyymmdd(new Date(season.endsAt.getTime() - 1))}`,
        limit: 1000
      });
      matches = norm.normalizeEvents(raw.events || [], { season, leagueName: league.name, leagueCode: league.code });
    } catch (error) {
      logger.warn(`Scoreboard de ${league.code} no disponible: ${error.code || error.message}`);
    }

    // Validación: una liga a doble vuelta tiene N·(N−1) partidos. Si el
    // calendario completo no llegó, se reconstruye con el calendario de cada equipo.
    if (matches.length < expectedTotal) {
      method = 'team-schedules';
      const byId = new Map(matches.map((m) => [m.fixtureId, m]));
      const settled = await Promise.allSettled(
        standingsRows.map((r) => fetchTeamSchedule(league, r.team.espnId, season))
      );
      settled.forEach((s) => {
        if (s.status === 'fulfilled') s.value.matches.forEach((m) => byId.set(m.fixtureId, m));
      });
      matches = [...byId.values()];
    }
    if (matches.length === 0) {
      throw new UpstreamError('No se pudo obtener el calendario de la liga.', 'UPSTREAM_UNAVAILABLE');
    }
    return { matches, method };
  });

  return { ...result.data, expectedTotal, meta: meta(result) };
};

// ───────────────────────── Detalle de partido ─────────────────────────
const getMatchDetail = async (leagueCode, fixtureId) => {
  const league = requireLeague(leagueCode);
  const season = getCurrentSeason();
  const key = `detail:${league.code}:${fixtureId}`;
  const previous = cache.peek(key);
  const ttl = previous?.value?.match?.status === 'FINISHED' ? TTL.detailFinished : TTL.detailOther;

  const result = await cache.wrap(key, ttl, async () => {
    const raw = await espn.getJson('site', `/${league.espnSlug}/summary`, { event: fixtureId });
    return wrapNormalizerError(() => norm.normalizeMatchDetail(raw, { season, leagueName: league.name, leagueCode: league.code }));
  });
  return { ...result.data, meta: meta(result) };
};

// ───────────────────────── Plantilla ─────────────────────────
const getSquad = async (clubId) => {
  const club = requireClub(clubId);
  const league = LEAGUES[club.league];
  const season = getCurrentSeason();

  const result = await cache.wrap(`roster:${club.espnId}:${season.espnSeason}`, TTL.roster, async () => {
    const raw = await espn.getJson('site', `/${league.espnSlug}/teams/${club.espnId}/roster`, { season: season.espnSeason });
    const roster = norm.normalizeRoster(raw);
    if (roster.season != null && roster.season !== season.espnSeason) {
      throw new UpstreamError('La plantilla recibida corresponde a otra temporada.', 'SEASON_MISMATCH', { status: 502 });
    }
    return roster;
  });

  return { club: club.id, season: season.label, ...result.data, meta: meta(result) };
};

// ───────────────────────── Noticias ─────────────────────────
const getNews = async (clubId) => {
  const club = requireClub(clubId);
  const league = LEAGUES[club.league];
  const result = await cache.wrap(`news:${club.espnId}`, TTL.news, async () => {
    const raw = await espn.getJson('site', `/${league.espnSlug}/news`, { team: club.espnId, limit: 30 });
    return norm.normalizeNews(raw);
  });
  return { club: club.id, articles: result.data, meta: meta(result) };
};

const healthCheck = async () => {
  try {
    await espn.getJson('site', `/${LEAGUES.PL.espnSlug}/teams`, {}, (d) => Array.isArray(d?.sports));
    return { provider: 'ESPN', reachable: true, cachedEntries: cache.size() };
  } catch (error) {
    return { provider: 'ESPN', reachable: false, error: error.code || 'UPSTREAM_ERROR', cachedEntries: cache.size() };
  }
};

module.exports = {
  getStandings,
  getClubMatches,
  getLeagueFixtures,
  getMatchDetail,
  getSquad,
  getNews,
  healthCheck,
  _cache: cache,
  TTL
};
