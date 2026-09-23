const express = require('express');
const { getPrediction } = require('../controllers/predictionEngineController');

const router = express.Router();

router.get('/:fixtureId', getPrediction);

module.exports = router;
