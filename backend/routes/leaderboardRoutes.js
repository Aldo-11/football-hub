const express = require('express');
const { getLeaderboard } = require('../controllers/predictionsController');

const router = express.Router();

router.get('/', getLeaderboard);

module.exports = router;
