/**
 * Catálogo de los 10 clubes soportados por Football Hub y de sus ligas.
 *
 * Es la ÚNICA fuente de verdad sobre qué clubes pueden seleccionarse,
 * compararse o analizarse. Los identificadores externos son los de ESPN
 * (fuente de datos principal). Las clasificaciones y simulaciones usan la liga
 * completa del club, aunque el resto de equipos no esté en este catálogo.
 *
 * `history` contiene datos de referencia estables (fundación, estadio y
 * palmarés principal) con fecha de corte explícita; NO son datos en vivo.
 */

const LEAGUES = {
  PL: {
    code: 'PL',
    espnSlug: 'eng.1',
    name: 'Premier League',
    country: 'Inglaterra',
    teams: 20,
    // Plazas por reglamento base de la competición
    zones: { championsLeague: 4, relegation: 3 }
  },
  PD: {
    code: 'PD',
    espnSlug: 'esp.1',
    name: 'LaLiga',
    country: 'España',
    teams: 20,
    zones: { championsLeague: 4, relegation: 3 }
  },
  BL1: {
    code: 'BL1',
    espnSlug: 'ger.1',
    name: 'Bundesliga',
    country: 'Alemania',
    teams: 18,
    // 16.º juega promoción; se cuentan solo los 2 descensos directos
    zones: { championsLeague: 4, relegation: 2 }
  }
};

const HISTORY_CUTOFF = 'temporada 2024-25';
const espnCrest = (espnId) => `https://a.espncdn.com/i/teamlogos/soccer/500/${espnId}.png`;

const CLUBS = [
  {
    id: 'arsenal', espnId: '359', league: 'PL', name: 'Arsenal', shortName: 'Arsenal', tla: 'ARS',
    history: {
      founded: 1886, city: 'Londres', stadium: 'Emirates Stadium',
      summary: 'Fundado por trabajadores del arsenal de Woolwich. Único campeón invicto de la Premier League (2003-04, "The Invincibles").',
      honours: [{ title: 'Liga inglesa', count: 13 }, { title: 'FA Cup', count: 14 }]
    }
  },
  {
    id: 'mancity', espnId: '382', league: 'PL', name: 'Manchester City', shortName: 'Man City', tla: 'MCI',
    history: {
      founded: 1880, city: 'Mánchester', stadium: 'Etihad Stadium',
      summary: 'Nació como St. Mark\'s (West Gorton). Primer club en ganar cuatro ligas inglesas consecutivas (2021-2024).',
      honours: [{ title: 'Liga inglesa', count: 10 }, { title: 'Champions League', count: 1 }]
    }
  },
  {
    id: 'liverpool', espnId: '364', league: 'PL', name: 'Liverpool', shortName: 'Liverpool', tla: 'LIV',
    history: {
      founded: 1892, city: 'Liverpool', stadium: 'Anfield',
      summary: 'Fundado tras la salida del Everton de Anfield. Es el club inglés con más Copas de Europa.',
      honours: [{ title: 'Liga inglesa', count: 20 }, { title: 'Copa de Europa / Champions', count: 6 }]
    }
  },
  {
    id: 'chelsea', espnId: '363', league: 'PL', name: 'Chelsea', shortName: 'Chelsea', tla: 'CHE',
    history: {
      founded: 1905, city: 'Londres', stadium: 'Stamford Bridge',
      summary: 'Club del oeste de Londres; su etapa más exitosa comenzó a partir de 2003.',
      honours: [{ title: 'Liga inglesa', count: 6 }, { title: 'Champions League', count: 2 }]
    }
  },
  {
    id: 'manutd', espnId: '360', league: 'PL', name: 'Manchester United', shortName: 'Man United', tla: 'MUN',
    history: {
      founded: 1878, city: 'Mánchester', stadium: 'Old Trafford',
      summary: 'Fundado como Newton Heath por trabajadores ferroviarios. Dominó la Premier League con Alex Ferguson (1986-2013).',
      honours: [{ title: 'Liga inglesa', count: 20 }, { title: 'Copa de Europa / Champions', count: 3 }]
    }
  },
  {
    id: 'realmadrid', espnId: '86', league: 'PD', name: 'Real Madrid', shortName: 'Real Madrid', tla: 'RMA',
    history: {
      founded: 1902, city: 'Madrid', stadium: 'Santiago Bernabéu',
      summary: 'Club con más Copas de Europa de la historia; ganó las cinco primeras ediciones (1956-1960).',
      honours: [{ title: 'LaLiga', count: 36 }, { title: 'Copa de Europa / Champions', count: 15 }]
    }
  },
  {
    id: 'barcelona', espnId: '83', league: 'PD', name: 'FC Barcelona', shortName: 'Barcelona', tla: 'BAR',
    history: {
      founded: 1899, city: 'Barcelona', stadium: 'Camp Nou',
      summary: 'Fundado por Joan Gamper. Su cantera (La Masia) formó a la base del equipo que ganó el sextete en 2009.',
      honours: [{ title: 'LaLiga', count: 28 }, { title: 'Copa de Europa / Champions', count: 5 }]
    }
  },
  {
    id: 'atletico', espnId: '1068', league: 'PD', name: 'Atlético de Madrid', shortName: 'Atlético', tla: 'ATM',
    history: {
      founded: 1903, city: 'Madrid', stadium: 'Riyadh Air Metropolitano',
      summary: 'Fundado por estudiantes vascos en Madrid. Con Diego Simeone ganó dos ligas (2014 y 2021).',
      honours: [{ title: 'LaLiga', count: 11 }, { title: 'Europa League', count: 3 }]
    }
  },
  {
    id: 'bayern', espnId: '132', league: 'BL1', name: 'Bayern Munich', shortName: 'Bayern', tla: 'FCB',
    history: {
      founded: 1900, city: 'Múnich', stadium: 'Allianz Arena',
      summary: 'Club más laureado de Alemania; ganó 11 Bundesligas consecutivas entre 2013 y 2023.',
      honours: [{ title: 'Campeonato alemán', count: 34 }, { title: 'Copa de Europa / Champions', count: 6 }]
    }
  },
  {
    id: 'dortmund', espnId: '124', league: 'BL1', name: 'Borussia Dortmund', shortName: 'Dortmund', tla: 'BVB',
    history: {
      founded: 1909, city: 'Dortmund', stadium: 'Signal Iduna Park',
      summary: 'Su "Muro Amarillo" es la mayor grada de pie de Europa. Campeón de Europa en 1997.',
      honours: [{ title: 'Campeonato alemán', count: 8 }, { title: 'Champions League', count: 1 }]
    }
  }
].map((club) => ({ ...club, crest: espnCrest(club.espnId) }));

// IDs de football-data.org usados por versiones anteriores del proyecto.
// Permiten que los usuarios que ya eligieron club no pierdan su selección.
const LEGACY_IDS = {
  57: 'arsenal', 65: 'mancity', 64: 'liverpool', 61: 'chelsea', 66: 'manutd',
  86: 'realmadrid', 81: 'barcelona', 78: 'atletico', 5: 'bayern', 4: 'dortmund'
};

const CLUB_IDS = CLUBS.map((c) => c.id);
const LEAGUE_CODES = Object.keys(LEAGUES);

const getClub = (id) => CLUBS.find((c) => c.id === String(id)) || null;
const resolveClubId = (id) => {
  if (id == null) return null;
  if (getClub(id)) return String(id);
  return LEGACY_IDS[String(id)] || null;
};
const getLeague = (code) => LEAGUES[String(code || '').toUpperCase()] || null;
const getClubByEspnId = (espnId) => CLUBS.find((c) => c.espnId === String(espnId)) || null;

// Versión pública (sin campos internos) para el frontend
const toPublicClub = (club) => ({
  id: club.id,
  name: club.name,
  shortName: club.shortName,
  tla: club.tla,
  league: club.league,
  leagueName: LEAGUES[club.league].name,
  crest: club.crest,
  espnId: club.espnId
});

module.exports = {
  LEAGUES,
  CLUBS,
  CLUB_IDS,
  LEAGUE_CODES,
  HISTORY_CUTOFF,
  getClub,
  getLeague,
  getClubByEspnId,
  resolveClubId,
  toPublicClub
};
