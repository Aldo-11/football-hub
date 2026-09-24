const express = require('express');
const { getLeaderboard } = require('../controllers/predictionsController');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, getLeaderboard);

module.exports = router;
