const mongoose = require('mongoose');
const { resolveClubId } = require('../config/clubs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  // Identificador de club del catálogo (config/clubs.js)
  favoriteTeamId: { type: String, default: null },
  totpSecret: { type: String, default: null },
  totpEnabled: { type: Boolean, default: false },
  // Hash SHA-256 del refresh token vigente (nunca el token en claro)
  refreshToken: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

/** Datos seguros para enviar al cliente (sin hash, secreto 2FA ni tokens). */
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    email: this.email,
    // Traduce IDs antiguos y descarta clubes que ya no están soportados
    favoriteTeamId: resolveClubId(this.favoriteTeamId),
    totpEnabled: this.totpEnabled,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
