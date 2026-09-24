/**
 * Generadores de respuestas con la misma forma que la API de ESPN.
 * Los valores son de PRUEBA (no representan resultados reales).
 */
const team = (id, name) => ({ id: String(id), displayName: name, shortDisplayName: name, abbreviation: name.slice(0, 3).toUpperCase(), logos: [{ href: `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png` }] });

const standingsEntry = (id, name, { pj, w, d, l, gf, ga, rank }) => ({
  team: team(id, name),
  stats: [
    { name: 'gamesPlayed', value: pj }, { name: 'wins', value: w }, { name: 'ties', value: d },
    { name: 'losses', value: l }, { name: 'pointsFor', value: gf }, { name: 'pointsAgainst', value: ga },
    { name: 'pointDifferential', value: gf - ga }, { name: 'points', value: w * 3 + d },
    ...(rank ? [{ name: 'rank', value: rank }] : [])
  ]
});

const standingsResponse = (entries, season = 2026) => ({
  name: 'Test League',
  children: [{ name: 'Test League', standings: { season, seasonDisplayName: `${season}-${String(season + 1).slice(2)}`, entries } }]
});

const event = ({ id, date, home, away, homeScore = null, awayScore = null, state = 'post', completed = true, statusName, season = 2026 }) => ({
  id: String(id),
  date,
  season: { year: season },
  competitions: [{
    date,
    status: { type: { state, completed, name: statusName || (completed ? 'STATUS_FULL_TIME' : 'STATUS_SCHEDULED') } },
    competitors: [
      { homeAway: 'home', team: team(home[0], home[1]), score: homeScore == null ? undefined : { value: homeScore, displayValue: String(homeScore) } },
      { homeAway: 'away', team: team(away[0], away[1]), score: awayScore == null ? undefined : { value: awayScore, displayValue: String(awayScore) } }
    ]
  }]
});

module.exports = { team, standingsEntry, standingsResponse, event };
