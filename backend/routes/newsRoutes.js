const express = require('express');
const newsController = require('../controllers/newsController');

const router = express.Router();

router.get('/:teamId', newsController.getNewsByTeam);

module.exports = router;
