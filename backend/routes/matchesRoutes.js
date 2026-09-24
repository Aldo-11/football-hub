const express = require('express');
const matchesController = require('../controllers/matchesController');

const router = express.Router();

router.get('/standings/:leagueId', matchesController.getStandings);
router.get('/next/:teamId', matchesController.getTeamNextMatches);
router.get('/last/:teamId', matchesController.getTeamLastMatches);
router.get('/detail/:fixtureId', matchesController.getMatchDetail);
router.get('/live/:fixtureId', matchesController.getMatchDetail);

module.exports = router;
