const newsService = require('../services/newsApi');

const getNewsByTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const news = await newsService.getNewsForTeam(teamId);
    res.json({ news });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener noticias', details: error.message });
  }
};

module.exports = {
  getNewsByTeam
};
