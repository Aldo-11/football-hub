const footballApi = require('../services/footballApi');

const getStandings = async (req, res) => {
  try {
    const { leagueId } = req.params;
    const result = await footballApi.getStandings(leagueId || 'PL');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tabla de posiciones', details: error.message });
  }
};

const getTeamNextMatches = async (req, res) => {
  try {
    const { teamId } = req.params;
    const result = await footballApi.getTeamFixtures(teamId, 'next');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener próximos partidos', details: error.message });
  }
};

const getTeamLastMatches = async (req, res) => {
  try {
    const { teamId } = req.params;
    const result = await footballApi.getTeamFixtures(teamId, 'last');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener últimos partidos', details: error.message });
  }
};

const getFootballHealth = async (req, res) => {
  try {
    const health = await footballApi.checkHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Error en diagnóstico de fútbol', details: error.message });
  }
};

module.exports = {
  getStandings,
  getTeamNextMatches,
  getTeamLastMatches,
  getFootballHealth
};
