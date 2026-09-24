/**
 * Normalizadores: transforman respuestas de ESPN al modelo interno de
 * Football Hub. Son funciones puras (sin red) para poder probarlas con
 * respuestas grabadas.
 *
 * Reglas de integridad aplicadas aquí:
 *  - Los partidos fuera de la ventana de la temporada actual se descartan
 *    (defensa adicional; la consulta ya pide la temporada correcta).
 *  - Un partido solo es FINISHED si la fuente lo marca como completado.
 *  - Nunca se rellenan valores faltantes con números inventados: se usa null.
 */
const { isWithinSeason } = require('../config/season');

const toNumber = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'object' ? Number(v.value ?? v.displayValue) : Number(v);
  return Number.isFinite(n) ? n : null;
};

const toIso = (value) => {
  const t = new Date(value);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
};

const pickLogo = (team = {}) => team.logo || team.logos?.[0]?.href || null;

const normalizeTeamRef = (team = {}) => ({
  espnId: team.id != null ? String(team.id) : null,
  name: team.displayName || team.name || null,
  shortName: team.shortDisplayName || team.displayName || team.name || null,
  abbreviation: team.abbreviation || null,
  crest: pickLogo(team)
});

// ───────────────────────── Estado del partido ─────────────────────────
const normalizeStatus = (statusType = {}) => {
  const name = String(statusType.name || '').toUpperCase();
  if (name.includes('POSTPONED')) return 'POSTPONED';
  if (name.includes('CANCELED') || name.includes('CANCELLED') || name.includes('ABANDONED')) return 'CANCELLED';
  if (statusType.completed === true) return 'FINISHED';
  if (statusType.state === 'in') return 'IN_PLAY';
  if (statusType.state === 'pre') return 'SCHEDULED';
  return 'UNKNOWN';
};

// ───────────────────────── Clasificación ─────────────────────────
const STAT_KEYS = {
  gamesPlayed: 'playedGames',
  wins: 'won',
  ties: 'draw',
  losses: 'lost',
  pointsFor: 'goalsFor',
  pointsAgainst: 'goalsAgainst',
  pointDifferential: 'goalDifference',
  points: 'points',
  rank: 'rank'
};

const extractStandingsNode = (raw) => {
  if (raw?.standings?.entries) return raw.standings;
  const child = (raw?.children || []).find((c) => c?.standings?.entries);
  return child ? child.standings : null;
};

/**
 * @returns {{season:number|null, rows:Array}} filas ordenadas con posición
 * @throws Error con code SEASON_MISMATCH si la fuente devuelve otra temporada
 */
const normalizeStandings = (raw, expectedSeason) => {
  const node = extractStandingsNode(raw);
  if (!node) {
    const err = new Error('Respuesta de clasificación sin entradas');
    err.code = 'UPSTREAM_BAD_FORMAT';
    throw err;
  }

  const season = toNumber(node.season);
  if (expectedSeason != null && season != null && season !== expectedSeason) {
    const err = new Error(`La fuente devolvió la temporada ${season} en lugar de ${expectedSeason}`);
    err.code = 'SEASON_MISMATCH';
    throw err;
  }

  const rows = node.entries.map((entry) => {
    const row = { team: normalizeTeamRef(entry.team) };
    Object.values(STAT_KEYS).forEach((k) => { row[k] = null; });
    (entry.stats || []).forEach((s) => {
      const key = STAT_KEYS[s.name] || STAT_KEYS[s.type];
      if (key) row[key] = toNumber(s.value ?? s.displayValue);
    });
    if (row.goalDifference == null && row.goalsFor != null && row.goalsAgainst != null) {
      row.goalDifference = row.goalsFor - row.goalsAgainst;
    }
    return row;
  }).filter((r) => r.team.espnId);

  // Orden oficial: puntos, diferencia de goles, goles a favor. Si la fuente
  // trae "rank" se respeta (incluye criterios de desempate propios de cada liga).
  rows.sort((a, b) => {
    if (a.rank != null && b.rank != null && a.rank !== b.rank) return a.rank - b.rank;
    return (b.points - a.points) || (b.goalDifference - a.goalDifference) || (b.goalsFor - a.goalsFor);
  });

  return {
    season,
    seasonLabel: node.seasonDisplayName || null,
    rows: rows.map((r, i) => {
      const row = { position: i + 1, ...r };
      delete row.rank;
      return row;
    })
  };
};

// ───────────────────────── Partidos ─────────────────────────
const normalizeCompetitor = (c = {}) => ({
  ...normalizeTeamRef(c.team),
  score: toNumber(c.score),
  winner: typeof c.winner === 'boolean' ? c.winner : null
});

/**
 * Convierte un evento de ESPN (schedule o scoreboard) en un partido.
 * Devuelve null si el evento no es válido para la temporada indicada.
 */
const normalizeEvent = (event, { season, leagueName, leagueCode } = {}) => {
  const comp = event?.competitions?.[0];
  if (!event?.id || !comp) return null;

  const utcDate = toIso(comp.date || event.date);
  if (!utcDate) return null;
  if (season && !isWithinSeason(utcDate, season)) return null;
  const eventSeason = toNumber(event.season?.year);
  if (season && eventSeason != null && eventSeason !== season.espnSeason) return null;

  const home = (comp.competitors || []).find((c) => c.homeAway === 'home');
  const away = (comp.competitors || []).find((c) => c.homeAway === 'away');
  if (!home || !away) return null;

  const status = normalizeStatus(comp.status?.type || event.status?.type);
  const homeTeam = normalizeCompetitor(home);
  const awayTeam = normalizeCompetitor(away);
  const hasScore = status === 'FINISHED' || status === 'IN_PLAY';

  return {
    fixtureId: String(event.id),
    utcDate,
    status,
    competition: event.league?.name || leagueName || null,
    leagueCode: leagueCode || null,
    venue: comp.venue?.fullName || null,
    homeTeam: { espnId: homeTeam.espnId, name: homeTeam.name, shortName: homeTeam.shortName, crest: homeTeam.crest },
    awayTeam: { espnId: awayTeam.espnId, name: awayTeam.name, shortName: awayTeam.shortName, crest: awayTeam.crest },
    score: {
      home: hasScore ? homeTeam.score : null,
      away: hasScore ? awayTeam.score : null
    }
  };
};

/** Normaliza, elimina duplicados por id y ordena cronológicamente. */
const normalizeEvents = (events = [], ctx = {}) => {
  const byId = new Map();
  events.forEach((e) => {
    const m = normalizeEvent(e, ctx);
    if (m) byId.set(m.fixtureId, m);
  });
  return [...byId.values()].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
};

// ───────────────────────── Detalle de partido ─────────────────────────
const STAT_LABELS = {
  possessionPct: { label: 'Posesión', unit: '%' },
  totalShots: { label: 'Tiros totales', unit: '' },
  shotsOnTarget: { label: 'Tiros a puerta', unit: '' },
  wonCorners: { label: 'Córners', unit: '' },
  foulsCommitted: { label: 'Faltas', unit: '' },
  yellowCards: { label: 'Tarjetas amarillas', unit: '' },
  redCards: { label: 'Tarjetas rojas', unit: '' },
  offsides: { label: 'Fueras de juego', unit: '' },
  saves: { label: 'Paradas', unit: '' },
  passPct: { label: 'Precisión de pase', unit: '%' },
  accuratePasses: { label: 'Pases completados', unit: '' }
};

const normalizeFormation = (f) => {
  const value = typeof f === 'string' ? f : f?.name || f?.displayName || null;
  return value && /^\d(-\d){2,4}$/.test(value.trim()) ? value.trim() : null;
};

const normalizePlayer = (p = {}) => ({
  id: p.athlete?.id != null ? String(p.athlete.id) : null,
  name: p.athlete?.displayName || p.athlete?.fullName || null,
  number: p.jersey != null && p.jersey !== '' ? String(p.jersey) : null,
  position: p.position?.abbreviation || null,
  formationPlace: toNumber(p.formationPlace),
  starter: Boolean(p.starter),
  subbedIn: Boolean(p.subbedIn),
  subbedOut: Boolean(p.subbedOut)
});

const classifyEvent = (type = {}) => {
  const t = `${type.type || ''} ${type.text || ''}`.toLowerCase();
  if (t.includes('own goal')) return 'own-goal';
  if (t.includes('penalty') && t.includes('goal')) return 'penalty-goal';
  if (t.includes('goal')) return 'goal';
  if (t.includes('red')) return 'red-card';
  if (t.includes('yellow')) return 'yellow-card';
  if (t.includes('substitution')) return 'substitution';
  return null;
};

const normalizeMatchDetail = (raw, { season, leagueName, leagueCode } = {}) => {
  const headerComp = raw?.header?.competitions?.[0];
  if (!headerComp) {
    const err = new Error('Detalle de partido sin cabecera');
    err.code = 'UPSTREAM_BAD_FORMAT';
    throw err;
  }

  const match = normalizeEvent(
    { id: raw.header.id, season: raw.header.season, league: raw.header.league, competitions: [headerComp] },
    { season, leagueName, leagueCode }
  );
  if (!match) {
    const err = new Error('El partido no pertenece a la temporada actual');
    err.code = 'SEASON_MISMATCH';
    throw err;
  }

  const sideOf = (teamId) => (String(teamId) === match.homeTeam.espnId ? 'home'
    : String(teamId) === match.awayTeam.espnId ? 'away' : null);

  // Alineaciones reales (solo si la fuente las publica)
  const lineups = { home: null, away: null };
  (raw.rosters || []).forEach((r) => {
    const side = r.homeAway || sideOf(r.team?.id);
    if (!side || !Array.isArray(r.roster) || r.roster.length === 0) return;
    const players = r.roster.map(normalizePlayer).filter((p) => p.name);
    const starters = players.filter((p) => p.starter);
    if (starters.length === 0) return;
    lineups[side] = {
      formation: normalizeFormation(r.formation),
      starters,
      bench: players.filter((p) => !p.starter)
    };
  });

  // Estadísticas del partido (solo métricas conocidas y con valor)
  const statsBySide = { home: {}, away: {} };
  (raw.boxscore?.teams || []).forEach((t) => {
    const side = t.homeAway || sideOf(t.team?.id);
    if (!side) return;
    (t.statistics || []).forEach((s) => {
      if (STAT_LABELS[s.name]) statsBySide[side][s.name] = toNumber(s.displayValue ?? s.value);
    });
  });
  const statistics = Object.entries(STAT_LABELS)
    .filter(([key]) => statsBySide.home[key] != null && statsBySide.away[key] != null)
    .map(([key, meta]) => ({ key, ...meta, home: statsBySide.home[key], away: statsBySide.away[key] }));

  // Eventos clave (goles, tarjetas, cambios)
  const events = (raw.keyEvents || [])
    .map((e) => {
      const type = classifyEvent(e.type);
      if (!type) return null;
      return {
        type,
        minute: e.clock?.displayValue || null,
        side: sideOf(e.team?.id),
        players: (e.participants || []).map((p) => p.athlete?.displayName).filter(Boolean)
      };
    })
    .filter(Boolean);

  return {
    match,
    lineups,
    statistics,
    events,
    availability: {
      lineups: Boolean(lineups.home && lineups.away),
      statistics: statistics.length > 0,
      events: events.length > 0
    }
  };
};

// ───────────────────────── Plantilla ─────────────────────────
const POSITION_GROUPS = [
  { key: 'GK', label: 'Porteros', match: (a) => /^(G|GK)$/i.test(a) || /goalkeeper/i.test(a) },
  { key: 'DF', label: 'Defensas', match: (a) => /^(D|CD|CB|LB|RB|LWB|RWB|SW)/i.test(a) || /defender/i.test(a) },
  { key: 'MF', label: 'Centrocampistas', match: (a) => /^(M|DM|CM|AM|LM|RM)/i.test(a) || /midfielder/i.test(a) },
  { key: 'FW', label: 'Delanteros', match: (a) => /^(F|CF|ST|LW|RW|SS)/i.test(a) || /forward/i.test(a) }
];

const positionGroupOf = (pos = {}) => {
  const candidates = [pos.abbreviation, pos.name, pos.displayName].filter(Boolean);
  const group = POSITION_GROUPS.find((g) => candidates.some((c) => g.match(c)));
  return group ? group.key : 'OT';
};

const normalizeRoster = (raw) => {
  const list = Array.isArray(raw?.athletes) ? raw.athletes : [];
  // ESPN puede devolver la lista plana o agrupada por posición ({ items: [] })
  const flat = list.flatMap((a) => (Array.isArray(a?.items) ? a.items : [a]));

  const byId = new Map();
  flat.forEach((a) => {
    if (!a?.id || !a.displayName) return;
    byId.set(String(a.id), {
      id: String(a.id),
      name: a.displayName,
      number: a.jersey != null && a.jersey !== '' ? String(a.jersey) : null,
      position: a.position?.abbreviation || null,
      positionGroup: positionGroupOf(a.position),
      age: toNumber(a.age),
      nationality: a.citizenship || a.birthPlace?.country || null
    });
  });

  const players = [...byId.values()];
  const groups = [...POSITION_GROUPS, { key: 'OT', label: 'Sin posición asignada' }]
    .map((g) => ({
      key: g.key,
      label: g.label,
      players: players
        .filter((p) => p.positionGroup === g.key)
        .sort((a, b) => (Number(a.number) || 999) - (Number(b.number) || 999) || a.name.localeCompare(b.name))
    }))
    .filter((g) => g.players.length > 0);

  return { season: toNumber(raw?.season?.year), total: players.length, groups };
};

// ───────────────────────── Noticias ─────────────────────────
const isHttpUrl = (u) => typeof u === 'string' && /^https:\/\/[^\s]+$/i.test(u);

/** Solo noticias con enlace directo al artículo; la imagen es opcional. */
const normalizeNews = (raw, { limit = 12 } = {}) => {
  const seen = new Set();
  return (raw?.articles || [])
    .map((a) => {
      const url = a.links?.web?.href;
      if (!a.headline || !isHttpUrl(url)) return null;
      // Una URL que es solo la portada (sin ruta) no es un artículo
      try {
        if (new URL(url).pathname.replace(/\/$/, '') === '') return null;
      } catch (e) {
        return null;
      }
      const image = (a.images || []).find((img) => isHttpUrl(img.url));
      return {
        id: String(a.id || url),
        title: a.headline,
        description: a.description || null,
        url,
        imageUrl: image ? image.url : null,
        publishedAt: toIso(a.published || a.lastModified),
        source: 'ESPN'
      };
    })
    .filter((n) => n && !seen.has(n.url) && seen.add(n.url))
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .slice(0, limit);
};

module.exports = {
  normalizeStandings,
  normalizeEvent,
  normalizeEvents,
  normalizeStatus,
  normalizeMatchDetail,
  normalizeRoster,
  normalizeNews,
  normalizeFormation,
  positionGroupOf
};
