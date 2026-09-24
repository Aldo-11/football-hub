const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fixtureId: { type: String, required: true },
  // Contexto del partido verificado por el servidor al registrar el pronóstico
  clubId: { type: String, required: true },
  leagueCode: { type: String, required: true },
  kickoff: { type: Date, required: true },
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  predictedHome: { type: Number, required: true, min: 0, max: 20 },
  predictedAway: { type: Number, required: true, min: 0, max: 20 },
  resolved: { type: Boolean, default: false, index: true },
  finalScore: { home: { type: Number, default: null }, away: { type: Number, default: null } },
  pointsAwarded: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Un pronóstico por usuario y partido
predictionSchema.index({ userId: 1, fixtureId: 1 }, { unique: true });

module.exports = mongoose.model('Prediction', predictionSchema);
