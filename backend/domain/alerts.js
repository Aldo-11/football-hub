/**
 * Motor de alertas: reglas deterministas sobre el análisis del equipo.
 * Cada alerta indica la regla y el umbral usados, para que la conclusión
 * sea verificable (no es texto libre).
 *
 * Severidad: 'positive' | 'warning' | 'info'
 */

const THRESHOLDS = {
  STREAK_MIN: 3,              // partidos seguidos
  TREND_MIN_PLAYED: 6,        // partidos mínimos para evaluar tendencia
  TREND_WINDOW: 3,            // últimos partidos comparados con la temporada
  TREND_DELTA_PPG: 0.75,      // cambio de PPG considerado significativo
  ATTACK_STRONG: 1.4,         // GF/partido ≥ 1.4 × media de la liga
  ATTACK_WEAK: 0.7,           // GF/partido ≤ 0.7 × media
  DEFENSE_WEAK: 1.3,          // GC/partido ≥ 1.3 × media
  DEFENSE_STRONG: 0.6,        // GC/partido ≤ 0.6 × media
  HOME_AWAY_GAP_PPG: 1.0,     // diferencia de PPG local vs visitante
  HOME_AWAY_MIN_EACH: 2,
  LOW_SAMPLE: 5
};

const alert = (id, severity, title, detail, rule) => ({ id, severity, title, detail, rule });

const evaluateAlerts = (analysis, progressionGames = analysis?.progression || []) => {
  const alerts = [];
  if (!analysis || analysis.played === 0) {
    return [alert('NO_DATA', 'info', 'Sin partidos jugados', 'Aún no hay partidos terminados de liga esta temporada.', 'PJ = 0')];
  }
  const T = THRESHOLDS;
  const { streak, ratios, overall, home, away } = analysis;

  if (analysis.played < T.LOW_SAMPLE) {
    alerts.push(alert('LOW_SAMPLE', 'info', 'Muestra pequeña',
      `Solo ${analysis.played} partidos jugados: los indicadores pueden cambiar mucho en pocas jornadas.`,
      `PJ < ${T.LOW_SAMPLE}`));
  }

  if (streak && streak.winless >= T.STREAK_MIN) {
    alerts.push(alert('WINLESS_STREAK', 'warning', 'Mala racha',
      `${streak.winless} partidos seguidos sin ganar.`, `≥ ${T.STREAK_MIN} partidos consecutivos sin victoria`));
  }
  if (streak && streak.result === 'W' && streak.length >= T.STREAK_MIN) {
    alerts.push(alert('WIN_STREAK', 'positive', 'Racha de victorias',
      `${streak.length} victorias consecutivas.`, `≥ ${T.STREAK_MIN} victorias consecutivas`));
  }

  if (analysis.played >= T.TREND_MIN_PLAYED) {
    const recent = progressionGames.slice(-T.TREND_WINDOW);
    const recentPpg = recent.reduce((a, g) => a + g.points, 0) / recent.length;
    const delta = recentPpg - overall.ppg;
    if (delta <= -T.TREND_DELTA_PPG) {
      alerts.push(alert('PERFORMANCE_DROP', 'warning', 'Caída de rendimiento',
        `Promedia ${recentPpg.toFixed(2)} pts en los últimos ${T.TREND_WINDOW} partidos frente a ${overall.ppg.toFixed(2)} en la temporada.`,
        `PPG últimos ${T.TREND_WINDOW} ≤ PPG temporada − ${T.TREND_DELTA_PPG}`));
    } else if (delta >= T.TREND_DELTA_PPG) {
      alerts.push(alert('PERFORMANCE_RISE', 'positive', 'Mejora de rendimiento',
        `Promedia ${recentPpg.toFixed(2)} pts en los últimos ${T.TREND_WINDOW} partidos frente a ${overall.ppg.toFixed(2)} en la temporada.`,
        `PPG últimos ${T.TREND_WINDOW} ≥ PPG temporada + ${T.TREND_DELTA_PPG}`));
    }
  }

  if (ratios.attackVsLeague != null) {
    if (ratios.attackVsLeague >= T.ATTACK_STRONG) {
      alerts.push(alert('ATTACK_STRONG', 'positive', 'Fortaleza ofensiva',
        `Marca ${ratios.attackVsLeague}× la media de goles de su liga.`, `GF/partido ≥ ${T.ATTACK_STRONG} × media`));
    } else if (ratios.attackVsLeague <= T.ATTACK_WEAK) {
      alerts.push(alert('ATTACK_WEAK', 'warning', 'Ataque poco productivo',
        `Marca ${ratios.attackVsLeague}× la media de goles de su liga.`, `GF/partido ≤ ${T.ATTACK_WEAK} × media`));
    }
  }

  if (ratios.defenseVsLeague != null) {
    if (ratios.defenseVsLeague >= T.DEFENSE_WEAK) {
      alerts.push(alert('DEFENSE_WEAK', 'warning', 'Vulnerabilidad defensiva',
        `Recibe ${ratios.defenseVsLeague}× la media de goles de su liga.`, `GC/partido ≥ ${T.DEFENSE_WEAK} × media`));
    } else if (ratios.defenseVsLeague <= T.DEFENSE_STRONG) {
      alerts.push(alert('DEFENSE_STRONG', 'positive', 'Solidez defensiva',
        `Recibe solo ${ratios.defenseVsLeague}× la media de goles de su liga.`, `GC/partido ≤ ${T.DEFENSE_STRONG} × media`));
    }
  }

  if (home.played >= T.HOME_AWAY_MIN_EACH && away.played >= T.HOME_AWAY_MIN_EACH) {
    const gap = home.ppg - away.ppg;
    if (Math.abs(gap) >= T.HOME_AWAY_GAP_PPG) {
      const better = gap > 0 ? 'local' : 'visitante';
      alerts.push(alert('HOME_AWAY_GAP', 'info', `Mucho mejor como ${better}`,
        `PPG local ${home.ppg} vs visitante ${away.ppg}.`, `|PPG local − PPG visitante| ≥ ${T.HOME_AWAY_GAP_PPG}`));
    }
  }

  return alerts;
};

/** Recomendaciones descriptivas derivadas de las alertas (no son consejos de apuesta). */
const RECOMMENDATIONS = {
  WINLESS_STREAK: 'Revisar los últimos partidos: la racha sin ganar afecta directamente a la tabla.',
  PERFORMANCE_DROP: 'El rendimiento reciente está por debajo de su media: vigilar los próximos partidos.',
  ATTACK_WEAK: 'El equipo genera poco gol respecto a su liga; la eficacia ofensiva es su punto a mejorar.',
  DEFENSE_WEAK: 'Encaja más que la media de su liga; la defensa es su principal vulnerabilidad.',
  ATTACK_STRONG: 'Su ataque es de los más productivos de la liga.',
  DEFENSE_STRONG: 'Su defensa es de las más sólidas de la liga.',
  HOME_AWAY_GAP: 'El rendimiento depende mucho de dónde juega; tenerlo en cuenta al leer el próximo partido.'
};

const buildRecommendations = (alerts) => alerts
  .filter((a) => RECOMMENDATIONS[a.id])
  .map((a) => ({ alertId: a.id, text: RECOMMENDATIONS[a.id] }));

module.exports = { evaluateAlerts, buildRecommendations, THRESHOLDS };
