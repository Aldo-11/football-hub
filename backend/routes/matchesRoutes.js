const express = require('express');
const matchesController = require('../controllers/matchesController');

const router = express.Router();

router.get('/standings/:leagueId', matchesController.getStandings);
router.get('/next/:teamId', matchesController.getTeamNextMatches);
router.get('/last/:teamId', matchesController.getTeamLastMatches);

module.exports = router;
