const express = require('express');
const { createPrediction, getMyPredictions } = require('../controllers/predictionsController');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, createPrediction);
router.get('/my', requireAuth, getMyPredictions);

module.exports = router;
