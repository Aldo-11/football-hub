const football = require('../services/footballService');
const analysis = require('../services/analysisService');
const { asyncHandler } = require('../utils/errors');

const getStandings = asyncHandler(async (req, res) => {
  res.json(await football.getStandings(req.params.code));
});

const getMatchDetail = asyncHandler(async (req, res) => {
  res.json(await football.getMatchDetail(req.params.code, req.params.fixtureId));
});

const compareClubs = asyncHandler(async (req, res) => {
  res.json(await analysis.getHeadToHead(req.validatedQuery.a, req.validatedQuery.b));
});

const footballHealth = asyncHandler(async (req, res) => {
  res.json(await football.healthCheck());
});

module.exports = { getStandings, getMatchDetail, compareClubs, footballHealth };
