const express = require('express');
const c = require('../controllers/footballController');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../validation/schemas');

const router = express.Router();

router.use(requireAuth);

router.get('/leagues/:code/standings', validate(s.leagueParams, 'params'), c.getStandings);
router.get('/matches/:code/:fixtureId', validate(s.matchParams, 'params'), c.getMatchDetail);
router.get('/compare', validate(s.compareQuery, 'query'), c.compareClubs);

module.exports = router;
