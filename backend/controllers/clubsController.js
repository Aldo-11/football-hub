const User = require('../models/User');
const football = require('../services/footballService');
const analysis = require('../services/analysisService');
const { CLUBS, HISTORY_CUTOFF, getClub, toPublicClub } = require('../config/clubs');
const { asyncHandler } = require('../utils/errors');

const listClubs = (req, res) => {
  res.json({ clubs: CLUBS.map(toPublicClub) });
};

const getClubProfile = (req, res) => {
  const club = getClub(req.params.clubId);
  res.json({
    club: toPublicClub(club),
    history: { ...club.history, cutoff: HISTORY_CUTOFF, source: 'Datos de referencia del proyecto (no en vivo)' }
  });
};

const setFavoriteClub = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { favoriteTeamId: req.body.clubId },
    { new: true }
  );
  res.json({ message: 'Club actualizado', user: user.toPublicJSON() });
});

const getMatches = asyncHandler(async (req, res) => {
  res.json(await analysis.getClubFixtures(req.params.clubId));
});

const getAnalysis = asyncHandler(async (req, res) => {
  res.json(await analysis.getTeamAnalysis(req.params.clubId));
});

const getPrediction = asyncHandler(async (req, res) => {
  res.json(await analysis.getMatchPrediction(req.params.clubId, req.validatedQuery.fixtureId));
});

const getSimulation = asyncHandler(async (req, res) => {
  res.json(await analysis.getSeasonSimulation(req.params.clubId, req.validatedQuery));
});

const getSquad = asyncHandler(async (req, res) => {
  res.json(await football.getSquad(req.params.clubId));
});

const getNews = asyncHandler(async (req, res) => {
  res.json(await football.getNews(req.params.clubId));
});

module.exports = { listClubs, getClubProfile, setFavoriteClub, getMatches, getAnalysis, getPrediction, getSimulation, getSquad, getNews };
