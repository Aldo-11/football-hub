const express = require('express');
const c = require('../controllers/clubsController');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../validation/schemas');

const router = express.Router();

router.use(requireAuth);

router.get('/', c.listClubs);
router.put('/favorite', validate(s.favoriteBody), c.setFavoriteClub);
router.get('/:clubId', validate(s.clubParams, 'params'), c.getClubProfile);
router.get('/:clubId/matches', validate(s.clubParams, 'params'), c.getMatches);
router.get('/:clubId/analysis', validate(s.clubParams, 'params'), c.getAnalysis);
router.get('/:clubId/prediction', validate(s.clubParams, 'params'), validate(s.predictionQuery, 'query'), c.getPrediction);
router.get('/:clubId/simulation', validate(s.clubParams, 'params'), validate(s.simulationQuery, 'query'), c.getSimulation);
router.get('/:clubId/squad', validate(s.clubParams, 'params'), c.getSquad);
router.get('/:clubId/news', validate(s.clubParams, 'params'), c.getNews);

module.exports = router;
