/**
 * Servicio de análisis: une los datos obtenidos (footballService) con la
 * lógica propia (domain/*). Aquí no se inventa ningún dato: si falta
 * información, se devuelve null o un error explícito.
 */
const football = require('./footballService');
const TtlCache = require('../utils/ttlCache');
const { getClub, LEAGUES, toPublicClub } = require('../config/clubs');
const { splitMatches, clubPerspective } = require('../domain/matches');
const { analyzeTeam } = require('../domain/teamAnalysis');
const { evaluateAlerts, buildRecommendations } = require('../domain/alerts');
const { predictMatch, leagueAverageGoals } = require('../domain/poisson');
const { simulateSeason } = require('../domain/monteCarlo');
const { compareClubs } = require('../domain/h2h');
const { AppError, notFound } = require('../utils/errors');

const simulationCache = new TtlCache({ maxEntries: 50 });

const rowFor = (rows, espnId) => rows.find((r) => r.team.espnId === String(espnId)) || null;

/** Partidos del club separados en pasados / próximos, más el siguiente. */
const getClubFixtures = async (clubId, now = new Date()) => {
  const data = await football.getClubMatches(clubId);
  const split = splitMatches(data.matches, now);
  return {
    club: toPublicClub(data.club),
    season: data.season,
    ...split,
    partial: data.partial,
    meta: data.meta
  };
};

const buildAnalysis = async (clubId, now = new Date()) => {
  const club = getClub(clubId);
  if (!club) throw notFound('Club no soportado');
  const [standings, matches] = await Promise.all([
    football.getStandings(club.league),
    football.getClubMatches(clubId)
  ]);
  const mu = leagueAverageGoals(standings.rows);
  const { past } = splitMatches(matches.matches, now);
  const games = clubPerspective(past, club.espnId);
  const totalMatches = 2 * (standings.rows.length - 1);
  const analysis = analyzeTeam(games, mu, totalMatches);
  return { club, standings, matches, analysis };
};

const getTeamAnalysis = async (clubId, now = new Date()) => {
  const { club, standings, analysis } = await buildAnalysis(clubId, now);
  const alerts = evaluateAlerts(analysis);
  const row = rowFor(standings.rows, club.espnId);
  return {
    club: toPublicClub(club),
    season: standings.season,
    standing: row ? { position: row.position, points: row.points, played: row.playedGames, of: standings.rows.length } : null,
    analysis,
    alerts,
    recommendations: buildRecommendations(alerts),
    meta: standings.meta
  };
};

/** Pronóstico Poisson para un partido próximo del club (el siguiente por defecto). */
const getMatchPrediction = async (clubId, fixtureId = null, now = new Date()) => {
  const club = getClub(clubId);
  if (!club) throw notFound('Club no soportado');
  const [standings, fixtures] = await Promise.all([
    football.getStandings(club.league),
    getClubFixtures(clubId, now)
  ]);
  const match = fixtureId ? fixtures.upcoming.find((m) => m.fixtureId === String(fixtureId)) : fixtures.next;
  if (!match) throw notFound('No hay un partido próximo disponible para pronosticar');

  const home = rowFor(standings.rows, match.homeTeam.espnId);
  const away = rowFor(standings.rows, match.awayTeam.espnId);
  if (!home || !away) {
    throw new AppError('Uno de los equipos no aparece en la clasificación de la liga; el modelo no puede calcularse.', { status: 422, code: 'PREDICTION_UNAVAILABLE' });
  }
  const prediction = predictMatch(home, away, standings.rows);
  if (!prediction) {
    throw new AppError('Aún no hay partidos jugados en la liga para estimar la fuerza de los equipos.', { status: 422, code: 'PREDICTION_UNAVAILABLE' });
  }
  return { match, prediction, season: standings.season, meta: standings.meta };
};

const getHeadToHead = async (clubA, clubB, now = new Date()) => {
  if (clubA === clubB) throw new AppError('Elige dos clubes distintos.', { status: 400, code: 'BAD_REQUEST' });
  const [a, b] = await Promise.all([buildAnalysis(clubA, now), buildAnalysis(clubB, now)]);
  const meetings = a.matches.matches
    .filter((m) => [m.homeTeam.espnId, m.awayTeam.espnId].includes(b.club.espnId))
    .sort((x, y) => new Date(x.utcDate) - new Date(y.utcDate));

  return {
    season: a.standings.season,
    ...compareClubs(
      { club: toPublicClub(a.club), analysis: a.analysis },
      { club: toPublicClub(b.club), analysis: b.analysis },
      meetings
    )
  };
};

const getSeasonSimulation = async (clubId, { simulations, seed } = {}) => {
  const club = getClub(clubId);
  if (!club) throw notFound('Club no soportado');
  const league = LEAGUES[club.league];
  const standings = await football.getStandings(league.code);
  const fixtures = await football.getLeagueFixtures(league.code, standings.rows);

  const pending = fixtures.matches
    .filter((m) => m.status !== 'FINISHED' && m.status !== 'CANCELLED')
    .map((m) => ({ homeId: m.homeTeam.espnId, awayId: m.awayTeam.espnId }));

  const key = `${league.code}:${standings.meta.fetchedAt}:${pending.length}:${simulations}:${seed}`;
  const result = await simulationCache.wrap(key, 10 * 60 * 1000, async () => {
    try {
      return simulateSeason(standings.rows, pending, { simulations, seed, zones: league.zones });
    } catch (error) {
      throw new AppError(error.message, { status: 422, code: 'SIMULATION_UNAVAILABLE' });
    }
  });

  return {
    club: toPublicClub(club),
    league: { code: league.code, name: league.name },
    season: standings.season,
    fixtureSource: fixtures.method,
    ...result.data,
    teams: result.data.teams.map((t) => ({ ...t, clubId: standings.rows.find((r) => r.team.espnId === t.team.espnId)?.clubId || null })),
    meta: standings.meta
  };
};

module.exports = { getClubFixtures, getTeamAnalysis, getMatchPrediction, getHeadToHead, getSeasonSimulation };
