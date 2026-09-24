const Prediction = require('../models/Prediction');
const PredictionLeagueScore = require('../models/PredictionLeagueScore');
const analysis = require('../services/analysisService');
const { getClub } = require('../config/clubs');
const { asyncHandler, AppError } = require('../utils/errors');

/**
 * Registra o actualiza un pronóstico. Reglas de negocio (servidor):
 *  - el partido debe ser un partido próximo real del club indicado;
 *  - solo se acepta antes del inicio del partido;
 *  - un pronóstico ya resuelto no se puede modificar.
 */
const createPrediction = asyncHandler(async (req, res) => {
  const { clubId, fixtureId, predictedHome, predictedAway } = req.body;
  const now = new Date();

  const fixtures = await analysis.getClubFixtures(clubId, now);
  const match = fixtures.upcoming.find((m) => m.fixtureId === fixtureId);
  if (!match) {
    throw new AppError('El partido no existe o ya comenzó; solo se aceptan pronósticos de partidos por jugar.', { status: 422, code: 'MATCH_NOT_OPEN' });
  }

  const existing = await Prediction.findOne({ userId: req.user._id, fixtureId });
  if (existing?.resolved) {
    throw new AppError('Este pronóstico ya fue resuelto.', { status: 409, code: 'PREDICTION_RESOLVED' });
  }

  const prediction = await Prediction.findOneAndUpdate(
    { userId: req.user._id, fixtureId },
    {
      $set: {
        clubId,
        leagueCode: getClub(clubId).league,
        kickoff: new Date(match.utcDate),
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        predictedHome,
        predictedAway,
        updatedAt: now
      },
      $setOnInsert: { createdAt: now }
    },
    { upsert: true, new: true, runValidators: true }
  );

  res.status(existing ? 200 : 201).json({ message: existing ? 'Pronóstico actualizado' : 'Pronóstico registrado', prediction });
});

const getMyPredictions = asyncHandler(async (req, res) => {
  const predictions = await Prediction.find({ userId: req.user._id }).sort({ kickoff: -1 }).limit(50).lean();
  res.json({ predictions });
});

const maskEmail = (email) => {
  const [user, domain] = email.split('@');
  return user.length > 2 ? `${user[0]}***${user[user.length - 1]}@${domain}` : `***@${domain}`;
};

const getLeaderboard = asyncHandler(async (req, res) => {
  const scores = await PredictionLeagueScore.find()
    .populate('userId', 'email favoriteTeamId')
    .sort({ totalPoints: -1, exactHits: -1, resultHits: -1 })
    .limit(50)
    .lean();

  const leaderboard = scores
    .filter((s) => s.userId)
    .map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId._id,
      displayName: maskEmail(entry.userId.email),
      favoriteTeamId: entry.userId.favoriteTeamId,
      totalPoints: entry.totalPoints,
      exactHits: entry.exactHits,
      resultHits: entry.resultHits,
      isMe: String(entry.userId._id) === String(req.user._id)
    }));

  res.json({ leaderboard, totalParticipants: leaderboard.length });
});

module.exports = { createPrediction, getMyPredictions, getLeaderboard };
