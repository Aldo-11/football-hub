const predictionEngine = require('../services/predictionEngine');

const getPrediction = async (req, res) => {
  try {
    const { fixtureId } = req.params;
    const { homeTeam, awayTeam, homeScored, homeConceded, awayScored, awayConceded } = req.query;

    const prediction = predictionEngine.calculatePrediction({
      fixtureId,
      homeTeamName: homeTeam || 'Manchester City',
      awayTeamName: awayTeam || 'Liverpool FC',
      homeScoredAvg: homeScored ? parseFloat(homeScored) : 2.1,
      homeConcededAvg: homeConceded ? parseFloat(homeConceded) : 0.9,
      awayScoredAvg: awayScored ? parseFloat(awayScored) : 1.9,
      awayConcededAvg: awayConceded ? parseFloat(awayConceded) : 1.1
    });

    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: 'Error calculando pronóstico Poisson', details: error.message });
  }
};

module.exports = {
  getPrediction
};
