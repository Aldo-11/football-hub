const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  fixtureId: {
    type: String,
    required: true,
    index: true
  },
  predictedHome: {
    type: Number,
    required: true,
    min: 0
  },
  predictedAway: {
    type: Number,
    required: true,
    min: 0
  },
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  pointsAwarded: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índice compuesto para evitar predicciones duplicadas por usuario en un mismo partido
predictionSchema.index({ userId: 1, fixtureId: 1 }, { unique: true });

module.exports = mongoose.model('Prediction', predictionSchema);
