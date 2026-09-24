const cron = require('node-cron');
const Prediction = require('../models/Prediction');
const PredictionLeagueScore = require('../models/PredictionLeagueScore');
const football = require('../services/footballService');
const logger = require('../config/logger');

/**
 * Puntuación de un pronóstico:
 *   3 puntos → marcador exacto
 *   1 punto  → acierta el signo (victoria local / empate / victoria visitante)
 *   0 puntos → falla
 */
const evaluateMatchPrediction = (predictedHome, predictedAway, actualHome, actualAway) => {
  if (predictedHome === actualHome && predictedAway === actualAway) {
    return { points: 3, exactHit: 1, resultHit: 0 };
  }
  if (Math.sign(predictedHome - predictedAway) === Math.sign(actualHome - actualAway)) {
    return { points: 1, exactHit: 0, resultHit: 1 };
  }
  return { points: 0, exactHit: 0, resultHit: 0 };
};

/**
 * Resuelve pronósticos pendientes cuyo partido ya empezó, consultando el
 * resultado FINAL real. `getResult` es inyectable para pruebas.
 */
const resolvePendingPredictions = async ({
  now = new Date(),
  getResult = async (leagueCode, fixtureId) => {
    const detail = await football.getMatchDetail(leagueCode, fixtureId);
    return detail.match.status === 'FINISHED' ? detail.match.score : null;
  }
} = {}) => {
  const pending = await Prediction.find({ resolved: false, kickoff: { $lte: now } });
  const byFixture = new Map();
  pending.forEach((p) => {
    if (!byFixture.has(p.fixtureId)) byFixture.set(p.fixtureId, { leagueCode: p.leagueCode, predictions: [] });
    byFixture.get(p.fixtureId).predictions.push(p);
  });

  let resolvedCount = 0;
  for (const [fixtureId, { leagueCode, predictions }] of byFixture) {
    let score;
    try {
      score = await getResult(leagueCode, fixtureId);
    } catch (error) {
      logger.warn(`No se pudo obtener el resultado de ${fixtureId}: ${error.code || error.message}`);
      continue;
    }
    if (!score || score.home == null || score.away == null) continue;

    for (const pred of predictions) {
      const { points, exactHit, resultHit } = evaluateMatchPrediction(pred.predictedHome, pred.predictedAway, score.home, score.away);
      // Actualización condicional: si otro proceso ya lo resolvió, no se suma dos veces
      const updated = await Prediction.findOneAndUpdate(
        { _id: pred._id, resolved: false },
        { $set: { resolved: true, pointsAwarded: points, finalScore: score, updatedAt: now } }
      );
      if (!updated) continue;
      await PredictionLeagueScore.findOneAndUpdate(
        { userId: pred.userId },
        { $inc: { totalPoints: points, exactHits: exactHit, resultHits: resultHit }, $set: { updatedAt: now } },
        { upsert: true }
      );
      resolvedCount++;
    }
  }

  if (resolvedCount > 0) logger.info(`Pronósticos resueltos: ${resolvedCount}`);
  return { resolvedCount };
};

// Cada 30 minutos
const startPredictionsCron = () => {
  cron.schedule('*/30 * * * *', () => {
    resolvePendingPredictions().catch((error) => logger.error(`Error resolviendo pronósticos: ${error.message}`));
  });
  logger.info('Tarea programada de resolución de pronósticos activa (cada 30 min).');
};

module.exports = { evaluateMatchPrediction, resolvePendingPredictions, startPredictionsCron };
