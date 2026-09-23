const express = require('express');
const teamsController = require('../controllers/teamsController');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.get('/', teamsController.getTeams);
router.put('/favorite', requireAuth, teamsController.setFavoriteTeam);

module.exports = router;
