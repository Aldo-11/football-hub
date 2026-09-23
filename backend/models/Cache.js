const mongoose = require('mongoose');

// TTL a 1 hora (3600 segundos)
const standingsCacheSchema = new mongoose.Schema({
  leagueId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Expira automáticamente a la 1 hora
  }
});

const fixturesCacheSchema = new mongoose.Schema({
  teamId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['next', 'last'],
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Expira automáticamente a la 1 hora
  }
});

fixturesCacheSchema.index({ teamId: 1, type: 1 }, { unique: true });

const StandingsCache = mongoose.model('StandingsCache', standingsCacheSchema);
const FixturesCache = mongoose.model('FixturesCache', fixturesCacheSchema);

module.exports = {
  StandingsCache,
  FixturesCache
};
