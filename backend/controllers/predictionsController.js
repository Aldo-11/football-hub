const { z } = require('zod');
const Prediction = require('../models/Prediction');
const PredictionLeagueScore = require('../models/PredictionLeagueScore');
const logger = require('../config/logger');

const predictionSchema = z.object({
  fixtureId: z.string().min(1, 'fixtureId es requerido'),
  predictedHome: z.number().int().min(0, 'Goles locales deben ser >= 0'),
  predictedAway: z.number().int().min(0, 'Goles visitantes deben ser >= 0')
});

const createPrediction = async (req, res) => {
  try {
    const { fixtureId, predictedHome, predictedAway } = predictionSchema.parse(req.body);
    const userId = req.user._id;

    // Upsert para actualizar o crear el pronóstico del usuario
    const prediction = await Prediction.findOneAndUpdate(
      { userId, fixtureId },
      {
        userId,
        fixtureId,
        predictedHome,
        predictedAway,
        resolved: false,
        pointsAwarded: 0,
        createdAt: new Date()
      },
      { upsert: true, returnDocument: 'after' }
    );

    logger.info(`Pronóstico registrado para usuario ${req.user.email} en partido ${fixtureId}: ${predictedHome}-${predictedAway}`);

    res.status(201).json({
      message: 'Pronóstico registrado con éxito en la Liga de Pronósticos',
      prediction
    });
  } catch (error) {
    if (error.errors) {
      return res.status(400).json({ error: 'Datos de pronóstico inválidos', details: error.errors });
    }
    logger.error('Error al guardar pronóstico:', error.message);
    res.status(500).json({ error: 'Error interno al registrar pronóstico' });
  }
};

const getMyPredictions = async (req, res) => {
  try {
    const predictions = await Prediction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ predictions });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tus pronósticos', details: error.message });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const scores = await PredictionLeagueScore.find()
      .populate('userId', 'email favoriteTeamId')
      .sort({ totalPoints: -1, exactHits: -1, resultHits: -1 })
      .limit(50);

    const leaderboard = scores
      .filter(s => s.userId) // filtrar usuarios existentes
      .map((entry, index) => {
        // Enmascarar email para privacidad (ej. j***e@domain.com)
        const email = entry.userId.email;
        const [userPart, domainPart] = email.split('@');
        const maskedEmail = userPart.length > 2
          ? `${userPart[0]}***${userPart[userPart.length - 1]}@${domainPart}`
          : email;

        return {
          rank: String(index + 1).padStart(2, '0'), // 01, 02, 03... formato marcador
          userId: entry.userId._id,
          displayName: maskedEmail,
          favoriteTeamId: entry.userId.favoriteTeamId,
          totalPoints: entry.totalPoints,
          exactHits: entry.exactHits,
          resultHits: entry.resultHits
        };
      });

    res.json({
      leaderboard,
      totalParticipants: leaderboard.length
    });
  } catch (error) {
    logger.error('Error obteniendo leaderboard:', error.message);
    res.status(500).json({ error: 'Error al obtener clasificación', details: error.message });
  }
};

module.exports = {
  createPrediction,
  getMyPredictions,
  getLeaderboard
};
