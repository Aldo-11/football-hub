const logger = require('../config/logger');

// Factorial para k! (0..6)
const factorial = (n) => {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
};

// Función de Masa de Probabilidad de Poisson: P(k; λ) = (λ^k * e^-λ) / k!
const poissonPMF = (k, lambda) => {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
};

class PredictionEngine {
  constructor() {
    this.LEAGUE_AVG_HOME_GOALS = 1.55;
    this.LEAGUE_AVG_AWAY_GOALS = 1.20;
    this.LEAGUE_AVG_TOTAL_GOALS = 2.75;
    this.HOME_ADVANTAGE_FACTOR = 1.15;
  }

  /**
   * Calcula Poisson para dos equipos
   */
  calculatePrediction({
    fixtureId,
    homeTeamName = 'Equipo Local',
    awayTeamName = 'Equipo Visitante',
    homeScoredAvg = 1.8,
    homeConcededAvg = 1.0,
    awayScoredAvg = 1.4,
    awayConcededAvg = 1.2
  }) {
    const avgHalf = this.LEAGUE_AVG_TOTAL_GOALS / 2;

    // 1. Fuerza de ataque y defensa
    const attackStrengthA = Math.max(0.3, homeScoredAvg / avgHalf);
    const defenseStrengthB = Math.max(0.3, awayConcededAvg / avgHalf);

    const attackStrengthB = Math.max(0.3, awayScoredAvg / avgHalf);
    const defenseStrengthA = Math.max(0.3, homeConcededAvg / avgHalf);

    // 2. Goles esperados (λ_home y λ_away)
    let lambdaHome = attackStrengthA * defenseStrengthB * this.LEAGUE_AVG_HOME_GOALS * this.HOME_ADVANTAGE_FACTOR;
    let lambdaAway = attackStrengthB * defenseStrengthA * this.LEAGUE_AVG_AWAY_GOALS;

    // Acotar valores para evitar distorsiones estadísticas
    lambdaHome = Math.min(Math.max(lambdaHome, 0.2), 4.5);
    lambdaAway = Math.min(Math.max(lambdaAway, 0.2), 4.5);

    // 3. Matriz de Poisson de 0 a 6 goles
    const MAX_GOALS = 6;
    const matrix = [];
    let homeWinProb = 0;
    let drawProb = 0;
    let awayWinProb = 0;
    let under25Prob = 0;

    let bestScore = { home: 1, away: 0, probability: 0 };

    for (let h = 0; h <= MAX_GOALS; h++) {
      matrix[h] = [];
      const pHome = poissonPMF(h, lambdaHome);

      for (let a = 0; a <= MAX_GOALS; a++) {
        const pAway = poissonPMF(a, lambdaAway);
        const jointProb = pHome * pAway;
        matrix[h][a] = parseFloat(jointProb.toFixed(4));

        if (h > a) homeWinProb += jointProb;
        else if (h === a) drawProb += jointProb;
        else awayWinProb += jointProb;

        if (h + a < 2.5) {
          under25Prob += jointProb;
        }

        if (jointProb > bestScore.probability) {
          bestScore = { home: h, away: a, probability: jointProb };
        }
      }
    }

    // Normalizar a 100%
    const total = homeWinProb + drawProb + awayWinProb;
    const homeWinPct = parseFloat(((homeWinProb / total) * 100).toFixed(1));
    const drawPct = parseFloat(((drawProb / total) * 100).toFixed(1));
    const awayWinPct = parseFloat(((awayWinProb / total) * 100).toFixed(1));

    const under25Pct = parseFloat(((under25Prob / total) * 100).toFixed(1));
    const over25Pct = parseFloat((100 - under25Pct).toFixed(1));

    logger.debug(`Pronóstico Poisson [${fixtureId}]: ${homeTeamName} (${lambdaHome.toFixed(2)}) vs ${awayTeamName} (${lambdaAway.toFixed(2)})`);

    return {
      fixtureId: String(fixtureId),
      teams: {
        home: homeTeamName,
        away: awayTeamName
      },
      lambda: {
        home: parseFloat(lambdaHome.toFixed(2)),
        away: parseFloat(lambdaAway.toFixed(2))
      },
      probabilities: {
        homeWin: homeWinPct,
        draw: drawPct,
        awayWin: awayWinPct
      },
      mostLikelyScore: {
        home: bestScore.home,
        away: bestScore.away,
        probability: parseFloat(((bestScore.probability / total) * 100).toFixed(1))
      },
      overUnder25: {
        overPct: over25Pct,
        underPct: under25Pct,
        prediction: over25Pct >= 50 ? 'Más de 2.5 Goles (Alta Intensidad)' : 'Menos de 2.5 Goles (Baja Intensidad)'
      },
      matrix
    };
  }
}

module.exports = new PredictionEngine();
