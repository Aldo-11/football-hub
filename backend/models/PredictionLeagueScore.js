const mongoose = require('mongoose');

const predictionLeagueScoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  totalPoints: {
    type: Number,
    default: 0,
    index: -1
  },
  exactHits: {
    type: Number,
    default: 0
  },
  resultHits: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PredictionLeagueScore', predictionLeagueScoreSchema);
