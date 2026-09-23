const cron = require('node-cron');
const Prediction = require('../models/Prediction');
const PredictionLeagueScore = require('../models/PredictionLeagueScore');
const logger = require('../config/logger');

// Función pura para calcular puntos de un pronóstico
const evaluateMatchPrediction = (predictedHome, predictedAway, actualHome, actualAway) => {
  // 1. Marcador exacto: 3 puntos
  if (predictedHome === actualHome && predictedAway === actualAway) {
    return { points: 3, exactHit: 1, resultHit: 0 };
  }

  // 2. Acierta resultado (1X2): 1 punto
  const predictedSign = Math.sign(predictedHome - predictedAway);
  const actualSign = Math.sign(actualHome - actualAway);

  if (predictedSign === actualSign) {
    return { points: 1, exactHit: 0, resultHit: 1 };
  }

  // 3. Falla: 0 puntos
  return { points: 0, exactHit: 0, resultHit: 0 };
};

// Resuelve una lista de predicciones pendientes
const resolvePendingPredictions = async (simulatedResults = {}) => {
  try {
    const pending = await Prediction.find({ resolved: false });
    if (pending.length === 0) {
      return { resolvedCount: 0 };
    }

    let resolvedCount = 0;

    for (const pred of pending) {
      // Buscar resultado final (simulado en test o de la API de partidos finalizados)
      const result = simulatedResults[pred.fixtureId];
      if (!result) continue;

      const { points, exactHit, resultHit } = evaluateMatchPrediction(
        pred.predictedHome,
        pred.predictedAway,
        result.home,
        result.away
      );

      pred.resolved = true;
      pred.pointsAwarded = points;
      await pred.save();

      await PredictionLeagueScore.findOneAndUpdate(
        { userId: pred.userId },
        {
          $inc: {
            totalPoints: points,
            exactHits: exactHit,
            resultHits: resultHit
          },
          updatedAt: new Date()
        },
        { upsert: true }
      );

      resolvedCount++;
    }

    logger.info(`Cron Job: ${resolvedCount} pronósticos resueltos.`);
    return { resolvedCount };
  } catch (error) {
    logger.error('Error en resolvePendingPredictions:', error.message);
    throw error;
  }
};

// Programar cron para ejecutarse cada hora
const startPredictionsCron = () => {
  cron.schedule('0 * * * *', async () => {
    logger.info('Ejecutando cron job para resolución de pronósticos...');
    await resolvePendingPredictions();
  });
  logger.info('Cron job de resolución de pronósticos inicializado (cada hora).');
};

module.exports = {
  evaluateMatchPrediction,
  resolvePendingPredictions,
  startPredictionsCron
};
