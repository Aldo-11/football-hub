const express = require('express');
const { createPrediction, getMyPredictions } = require('../controllers/predictionsController');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../validation/schemas');

const router = express.Router();

router.post('/', requireAuth, validate(s.predictionBody), createPrediction);
router.get('/my', requireAuth, getMyPredictions);

module.exports = router;
