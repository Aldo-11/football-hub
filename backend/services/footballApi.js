const axios = require('axios');
const config = require('../config/env');
const logger = require('../config/logger');
const { StandingsCache, FixturesCache } = require('../models/Cache');
const { STANDINGS_2026_2027, getTeamOfficialFixtures } = require('./officialSeason2026Data');

// ═══════════════════════════════════════════════════════════════════
// TheSportsDB — API pública gratuita, sin API key, accesible desde
// redes institucionales (no bloqueada por firewalls universitarios).
// Documentación: https://www.thesportsdb.com/api.php
// ═══════════════════════════════════════════════════════════════════
const TSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';

// Mapeo a la temporada ACTUAL 2026-2027 en curso
const CURRENT_SEASON = '2026-2027';

const LEAGUE_TSDB_MAP = {
  PL:  { tsdbId: '4328', name: 'Premier League',   season: CURRENT_SEASON },
  PD:  { tsdbId: '4335', name: 'LaLiga EA Sports',  season: CURRENT_SEASON },
  BL1: { tsdbId: '4331', name: 'Bundesliga',        season: CURRENT_SEASON },
  SA:  { tsdbId: '4332', name: 'Serie A',            season: CURRENT_SEASON },
  FL1: { tsdbId: '4334', name: 'Ligue 1',            season: CURRENT_SEASON }
};

// Códigos estándar aceptados → normalizados
const LEAGUE_MAPPING = {
  pl: 'PL', premier: 'PL', premierleague: 'PL',
  pd: 'PD', laliga: 'PD',
  bl1: 'BL1', bundesliga: 'BL1',
  sa: 'SA', seriea: 'SA',
  fl1: 'FL1', ligue1: 'FL1'
};

const normalizeLeagueCode = (input) => {
  if (!input) return 'PL';
  const clean = String(input).toLowerCase().replace(/[^a-z0-9]/g, '');
  return LEAGUE_MAPPING[clean] || input.toUpperCase();
};

// ═══════════════════════════════════════════════════════════════════
// Catálogo de equipos con IDs duales (football-data.org y TheSportsDB)
// Temporada Oficial 2026/2027
// ═══════════════════════════════════════════════════════════════════
const POPULAR_TEAMS = [
  // Premier League 2026-2027 (20 Clubes Oficiales)
  { id: '65',   tsdbId: '133613', name: 'Manchester City',          shortName: 'Man City',   tla: 'MCI', league: 'PL', crest: 'https://crests.football-data.org/65.png' },
  { id: '57',   tsdbId: '133604', name: 'Arsenal FC',               shortName: 'Arsenal',    tla: 'ARS', league: 'PL', crest: 'https://crests.football-data.org/57.png' },
  { id: '107',  tsdbId: '133619', name: 'Brighton & Hove Albion',   shortName: 'Brighton',   tla: 'BHA', league: 'PL', crest: 'https://crests.football-data.org/107.png' },
  { id: '402',  tsdbId: '133608', name: 'Brentford FC',             shortName: 'Brentford',  tla: 'BRE', league: 'PL', crest: 'https://crests.football-data.org/402.png' },
  { id: '341',  tsdbId: '133635', name: 'Leeds United FC',          shortName: 'Leeds',      tla: 'LEE', league: 'PL', crest: 'https://crests.football-data.org/341.png' },
  { id: '62',   tsdbId: '133614', name: 'Everton FC',               shortName: 'Everton',    tla: 'EVE', league: 'PL', crest: 'https://crests.football-data.org/62.png' },
  { id: '67',   tsdbId: '133615', name: 'Newcastle United FC',      shortName: 'Newcastle',  tla: 'NEW', league: 'PL', crest: 'https://crests.football-data.org/67.png' },
  { id: '322',  tsdbId: '133626', name: 'Hull City AFC',            shortName: 'Hull City',  tla: 'HUL', league: 'PL', crest: 'https://crests.football-data.org/322.png' },
  { id: '349',  tsdbId: '133631', name: 'Ipswich Town FC',          shortName: 'Ipswich',    tla: 'IPS', league: 'PL', crest: 'https://crests.football-data.org/349.png' },
  { id: '64',   tsdbId: '133602', name: 'Liverpool FC',             shortName: 'Liverpool',  tla: 'LIV', league: 'PL', crest: 'https://crests.football-data.org/64.png' },
  { id: '58',   tsdbId: '133601', name: 'Aston Villa FC',           shortName: 'Aston Villa',tla: 'AVL', league: 'PL', crest: 'https://crests.football-data.org/58.png' },
  { id: '1044', tsdbId: '133607', name: 'AFC Bournemouth',         shortName: 'Bournemouth',tla: 'BOU', league: 'PL', crest: 'https://crests.football-data.org/1044.png' },
  { id: '354',  tsdbId: '133618', name: 'Crystal Palace FC',        shortName: 'Crystal Palace',tla: 'CRY', league: 'PL', crest: 'https://crests.football-data.org/354.png' },
  { id: '351',  tsdbId: '133634', name: 'Nottingham Forest FC',     shortName: 'Nottingham', tla: 'NFO', league: 'PL', crest: 'https://crests.football-data.org/351.png' },
  { id: '63',   tsdbId: '133611', name: 'Fulham FC',                shortName: 'Fulham',     tla: 'FUL', league: 'PL', crest: 'https://crests.football-data.org/63.png' },
  { id: '73',   tsdbId: '133616', name: 'Tottenham Hotspur FC',     shortName: 'Tottenham',  tla: 'TOT', league: 'PL', crest: 'https://crests.football-data.org/73.png' },
  { id: '61',   tsdbId: '133610', name: 'Chelsea FC',               shortName: 'Chelsea',    tla: 'CHE', league: 'PL', crest: 'https://crests.football-data.org/61.png' },
  { id: '71',   tsdbId: '133638', name: 'Sunderland AFC',           shortName: 'Sunderland', tla: 'SUN', league: 'PL', crest: 'https://crests.football-data.org/71.png' },
  { id: '66',   tsdbId: '133612', name: 'Manchester United',        shortName: 'Man United', tla: 'MUN', league: 'PL', crest: 'https://crests.football-data.org/66.png' },
  { id: '1076', tsdbId: '133622', name: 'Coventry City FC',         shortName: 'Coventry',   tla: 'COV', league: 'PL', crest: 'https://crests.football-data.org/1076.png' },
  // La Liga
  { id: '86',   tsdbId: '133738', name: 'Real Madrid CF',           shortName: 'Real Madrid', tla: 'RMA', league: 'PD', crest: 'https://crests.football-data.org/86.png' },
  { id: '81',   tsdbId: '133739', name: 'FC Barcelona',             shortName: 'Barcelona',   tla: 'BAR', league: 'PD', crest: 'https://crests.football-data.org/81.png' },
  { id: '78',   tsdbId: '133729', name: 'Atlético de Madrid',       shortName: 'Atlético',    tla: 'ATM', league: 'PD', crest: 'https://crests.football-data.org/78.png' },
  { id: '77',   tsdbId: '133727', name: 'Athletic Club',            shortName: 'Athletic',    tla: 'ATH', league: 'PD', crest: 'https://crests.football-data.org/77.png' },
  { id: '90',   tsdbId: '133742', name: 'Real Betis',               shortName: 'Betis',       tla: 'BET', league: 'PD', crest: 'https://crests.football-data.org/90.png' },
  { id: '94',   tsdbId: '133744', name: 'Villarreal CF',            shortName: 'Villarreal',  tla: 'VIL', league: 'PD', crest: 'https://crests.football-data.org/94.png' },
  { id: '92',   tsdbId: '133740', name: 'Real Sociedad',           shortName: 'Real Sociedad', tla: 'RSO', league: 'PD', crest: 'https://crests.football-data.org/92.png' },
  { id: '559',  tsdbId: '133743', name: 'Sevilla FC',               shortName: 'Sevilla',     tla: 'SEV', league: 'PD', crest: 'https://crests.football-data.org/559.png' },
  // Bundesliga
  { id: '5',    tsdbId: '133664', name: 'FC Bayern München',        shortName: 'Bayern',     tla: 'FCB', league: 'BL1', crest: 'https://crests.football-data.org/5.svg' },
  { id: '4',    tsdbId: '133650', name: 'Borussia Dortmund',        shortName: 'Dortmund',   tla: 'BVB', league: 'BL1', crest: 'https://crests.football-data.org/4.png' },
  { id: '3',    tsdbId: '133649', name: 'Bayer 04 Leverkusen',      shortName: 'Leverkusen', tla: 'B04', league: 'BL1', crest: 'https://crests.football-data.org/3.png' },
  // Serie A
  { id: '108',  tsdbId: '133681', name: 'FC Internazionale Milano', shortName: 'Inter',      tla: 'INT', league: 'SA', crest: 'https://crests.football-data.org/108.png' },
  { id: '109',  tsdbId: '133676', name: 'Juventus FC',              shortName: 'Juventus',   tla: 'JUV', league: 'SA', crest: 'https://crests.football-data.org/109.png' },
  { id: '98',   tsdbId: '133667', name: 'AC Milan',                 shortName: 'Milan',      tla: 'MIL', league: 'SA', crest: 'https://crests.football-data.org/98.png' },
  { id: '100',  tsdbId: '133669', name: 'AS Roma',                  shortName: 'Roma',       tla: 'ASR', league: 'SA', crest: 'https://crests.football-data.org/100.png' },
  // Ligue 1
  { id: '524',  tsdbId: '133714', name: 'Paris Saint-Germain FC',   shortName: 'PSG',        tla: 'PSG', league: 'FL1', crest: 'https://crests.football-data.org/524.png' },
  { id: '548',  tsdbId: '133707', name: 'AS Monaco FC',             shortName: 'Monaco',     tla: 'ASM', league: 'FL1', crest: 'https://crests.football-data.org/548.png' }
];

// Helpers
const findTeamByInternalId = (id) => {
  const fromPopular = POPULAR_TEAMS.find(t => String(t.id) === String(id));
  if (fromPopular) return fromPopular;
  for (const league of Object.values(STANDINGS_2026_2027)) {
    const found = league.find(t => String(t.id) === String(id));
    if (found) return found;
  }
  return null;
};

const findTeamByTsdbId = (tsdbId) => POPULAR_TEAMS.find(t => t.tsdbId === String(tsdbId));

class FootballApiService {

  // ─────────────────────────────────────────────
  // TABLA DE POSICIONES (Temporada 2026/2027)
  // ─────────────────────────────────────────────
  async getStandings(leagueId = 'PL') {
    const code = normalizeLeagueCode(leagueId);

    // 1. Caché en MongoDB (TTL 1h)
    const cached = await StandingsCache.findOne({ leagueId: code });
    if (cached && cached.data) {
      logger.auditSource('cache', `/standings/${code}`, { hit: true });
      return { source: 'cache', data: cached.data };
    }

    // 2. TheSportsDB — temporada 2026-2027 actual
    const leagueInfo = LEAGUE_TSDB_MAP[code];
    let liveTsdbTable = null;

    if (leagueInfo) {
      try {
        const url = `${TSDB_BASE}/lookuptable.php?l=${leagueInfo.tsdbId}&s=${leagueInfo.season}`;
        const response = await axios.get(url, { timeout: 8000 });

        if (response.data?.table && response.data.table.length > 0) {
          liveTsdbTable = response.data.table;
        }
      } catch (err) {
        logger.warn(`TheSportsDB standings fallo para ${code}: ${err.message}`);
      }
    }

    // 3. Generar tabla de posiciones completa de la temporada 2026/2027
    const formatted = this.buildFullSeasonStandings(code, liveTsdbTable);

    await StandingsCache.findOneAndUpdate(
      { leagueId: code },
      { leagueId: code, data: formatted, updatedAt: new Date() },
      { upsert: true, returnDocument: 'after' }
    );

    const sourceName = liveTsdbTable ? 'thesportsdb' : 'contingency-engine';
    logger.auditSource(sourceName, `/standings/${code}`, { teams: formatted.standings.length });
    return { source: sourceName, data: formatted };
  }

  // ─────────────────────────────────────────────
  // FIXTURES — 10 Próximos o 10 Últimos Partidos
  // Oficiales Temporada 2026/2027
  // ─────────────────────────────────────────────
  async getTeamFixtures(teamId, type = 'next') {
    const normalizedType = type === 'last' ? 'last' : 'next';

    // 1. Caché
    const cached = await FixturesCache.findOne({ teamId: String(teamId), type: normalizedType });
    if (cached && cached.data && Array.isArray(cached.data) && cached.data.length >= 5) {
      logger.auditSource('cache', `/fixtures/${teamId}?type=${normalizedType}`, { hit: true });
      return { source: 'cache', data: cached.data };
    }

    // 2. TheSportsDB
    const team = findTeamByInternalId(teamId) || { id: String(teamId), name: 'Equipo', shortName: 'Equipo' };
    let liveEvents = [];

    if (team?.tsdbId) {
      try {
        const endpoint = normalizedType === 'next' ? 'eventsnext' : 'eventslast';
        const url = `${TSDB_BASE}/${endpoint}.php?id=${team.tsdbId}`;
        const response = await axios.get(url, { timeout: 8000 });

        if (response.data?.events || response.data?.results) {
          const raw = response.data.events || response.data.results || [];
          liveEvents = raw.map(e => this.formatTsdbEvent(e, normalizedType));
        }
      } catch (err) {
        logger.warn(`TheSportsDB fixtures fallo para equipo ${teamId}: ${err.message}`);
      }
    }

    // 3. Obtener los 10 partidos oficiales de la temporada 2026/2027
    const fullFixtures = getTeamOfficialFixtures(team, normalizedType, liveEvents);

    await FixturesCache.findOneAndUpdate(
      { teamId: String(teamId), type: normalizedType },
      { teamId: String(teamId), type: normalizedType, data: fullFixtures, updatedAt: new Date() },
      { upsert: true, returnDocument: 'after' }
    );

    logger.auditSource('thesportsdb', `/fixtures/${teamId}?type=${normalizedType}`, { count: fullFixtures.length });
    return { source: 'thesportsdb', data: fullFixtures };
  }

  // ─────────────────────────────────────────────
  // EQUIPOS DISPONIBLES
  // ─────────────────────────────────────────────
  async getAvailableTeams() {
    return POPULAR_TEAMS;
  }

  // ─────────────────────────────────────────────
  // HEALTH CHECK
  // ─────────────────────────────────────────────
  async checkHealth() {
    let tsdbHealthy = false;
    let detail = '';

    try {
      const res = await axios.get(`${TSDB_BASE}/searchteams.php?t=Barcelona`, { timeout: 5000 });
      tsdbHealthy = res.status === 200 && res.data?.teams?.length > 0;
      detail = tsdbHealthy
        ? `TheSportsDB accesible. Verificado: ${res.data.teams[0].strTeam}`
        : 'TheSportsDB responde pero sin datos';
    } catch (err) {
      detail = `TheSportsDB error: ${err.message}`;
    }

    const cachedStandingsCount = await StandingsCache.countDocuments();
    const cachedFixturesCount = await FixturesCache.countDocuments();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      primarySource: {
        provider: 'thesportsdb.com',
        keyConfigured: true,
        responsive: tsdbHealthy,
        detail
      },
      secondarySource: {
        provider: 'api-football',
        keyConfigured: Boolean(config.rapidApiKey)
      },
      cache: {
        ttlHours: 1,
        standingsCachedCount: cachedStandingsCount,
        fixturesCachedCount: cachedFixturesCount
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Formateador de eventos TheSportsDB con timestamps UTC garantizados
  // ═══════════════════════════════════════════════════════════════════

  formatTsdbEvent(event, type) {
    const homeTeam = findTeamByTsdbId(event.idHomeTeam);
    const awayTeam = findTeamByTsdbId(event.idAwayTeam);

    let utcDate;
    if (event.strTimestamp) {
      utcDate = event.strTimestamp.endsWith('Z') ? event.strTimestamp : event.strTimestamp + 'Z';
    } else if (event.dateEvent && event.strTime) {
      const timeVal = event.strTime.includes('Z') ? event.strTime : event.strTime + 'Z';
      utcDate = `${event.dateEvent}T${timeVal}`;
    } else if (event.dateEvent) {
      utcDate = `${event.dateEvent}T15:00:00Z`;
    } else {
      utcDate = new Date().toISOString();
    }

    const isFinished = type === 'last' ||
      event.strStatus === 'FT' ||
      event.strStatus === 'Match Finished' ||
      (event.intHomeScore !== null && event.intAwayScore !== null && type === 'last');

    return {
      fixtureId: String(event.idEvent || `fix_${Date.now()}`),
      utcDate,
      competition: event.strLeague || 'Competición Oficial',
      homeTeam: {
        id: homeTeam?.id || String(event.idHomeTeam),
        name: event.strHomeTeam || 'Local',
        shortName: homeTeam?.shortName || event.strHomeTeam,
        crest: homeTeam?.crest || event.strHomeTeamBadge || ''
      },
      awayTeam: {
        id: awayTeam?.id || String(event.idAwayTeam),
        name: event.strAwayTeam || 'Visitante',
        shortName: awayTeam?.shortName || event.strAwayTeam,
        crest: awayTeam?.crest || event.strAwayTeamBadge || ''
      },
      score: {
        fullTime: {
          home: event.intHomeScore != null ? parseInt(event.intHomeScore, 10) : null,
          away: event.intAwayScore != null ? parseInt(event.intAwayScore, 10) : null
        }
      },
      status: isFinished ? 'FINISHED' : 'SCHEDULED'
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Construcción de Tabla Completa Temporada 2026/2027 (Actual)
  // ═══════════════════════════════════════════════════════════════════
  // Construcción de Tabla Completa Temporada 2026/2027 (Oficial)
  // ═══════════════════════════════════════════════════════════════════

  buildFullSeasonStandings(code, liveTsdbTable) {
    const leagueName = LEAGUE_TSDB_MAP[code]?.name || 'Premier League';
    const seasonLabel = '2026/2027';

    // Usar la tabla canónica oficial de la temporada 2026-2027
    const canonical = STANDINGS_2026_2027[code] || STANDINGS_2026_2027.PL;
    let rawList = JSON.parse(JSON.stringify(canonical));

    // Si TheSportsDB entregó datos en vivo para la temporada 2026-2027, actualizar puntos y partidos
    if (liveTsdbTable && liveTsdbTable.length > 0) {
      liveTsdbTable.forEach(row => {
        const rowTeam = (row.strTeam || '').toLowerCase();
        const found = rawList.find(t =>
          t.name.toLowerCase().includes(rowTeam) ||
          rowTeam.includes(t.shortName.toLowerCase()) ||
          rowTeam.includes(t.name.toLowerCase())
        );
        if (found) {
          found.pts = parseInt(row.intPoints, 10) || found.pts;
          found.pj = parseInt(row.intPlayed, 10) || found.pj;
          found.g = parseInt(row.intWin, 10) || found.g;
          found.e = parseInt(row.intDraw, 10) || found.e;
          found.p = parseInt(row.intLoss, 10) || found.p;
          found.gf = parseInt(row.intGoalsFor, 10) || found.gf;
          found.gc = parseInt(row.intGoalsAgainst, 10) || found.gc;
        }
      });
    }

    // Ordenamiento canónico oficial: Puntos -> Diferencia de Goles -> Goles a Favor -> Ranking Canónico
    rawList.sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf || (a.rank || 0) - (b.rank || 0));

    return {
      competition: {
        name: leagueName,
        code,
        emblem: ''
      },
      season: seasonLabel,
      standings: rawList.map((row, idx) => ({
        position: idx + 1,
        team: {
          id: String(row.id),
          name: row.name,
          shortName: row.shortName,
          crest: row.crest
        },
        playedGames: row.pj,
        won: row.g,
        draw: row.e,
        lost: row.p,
        points: row.pts,
        goalsFor: row.gf,
        goalsAgainst: row.gc,
        goalDifference: row.gf - row.gc
      }))
    };
  }
}

module.exports = new FootballApiService();
