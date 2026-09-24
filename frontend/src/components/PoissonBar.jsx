import React from 'react';
import { ShieldAlert, CheckCircle2, TrendingUp, AlertTriangle, Zap, Target } from 'lucide-react';

export const PoissonBar = ({ prediction }) => {
  if (!prediction) {
    return (
      <div className="p-4 border border-hairline text-center text-muted font-mono text-xs">
        Cálculo de Poisson no disponible
      </div>
    );
  }

  const { probabilities, lambda, mostLikelyScore, overUnder25, teams, automatedDecisions } = prediction;
  const homeWin = probabilities?.homeWin || 0;
  const draw = probabilities?.draw || 0;
  const awayWin = probabilities?.awayWin || 0;

  const rosterDecision = automatedDecisions?.rosterPenalty;
  const intensityDecision = automatedDecisions?.intensity;
  const valueBetDecision = automatedDecisions?.valueBet;
  const confidenceDecision = automatedDecisions?.confidence;

  return (
    <div className="border border-hairline bg-surface p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <div>
          <span className="text-xs font-mono uppercase text-muted tracking-wider block">Motor Predictivo Poisson</span>
          <span className="font-scoreboard text-base text-main uppercase">Probabilidades 1X2 Proyectadas</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-muted uppercase block">Marcador Más Probable</span>
          <span className="font-scoreboard text-lg text-led tabular-nums">
            {mostLikelyScore?.home} - {mostLikelyScore?.away}
          </span>
          <span className="text-[10px] font-mono text-muted ml-1">({mostLikelyScore?.probability}%)</span>
        </div>
      </div>

      {/* 3-Segment Horizontal Bar */}
      <div>
        <div className="w-full h-8 flex overflow-hidden border border-hairline">
          {/* Home Win */}
          <div
            style={{ width: `${homeWin}%` }}
            className="bg-win flex items-center justify-center text-pitch font-scoreboard text-xs tabular-nums font-bold transition-all"
            title={`Victoria Local: ${homeWin}%`}
          >
            {homeWin > 12 && `${homeWin}%`}
          </div>

          {/* Draw */}
          <div
            style={{ width: `${draw}%` }}
            className="bg-muted flex items-center justify-center text-pitch font-scoreboard text-xs tabular-nums font-bold transition-all"
            title={`Empate: ${draw}%`}
          >
            {draw > 12 && `${draw}%`}
          </div>

          {/* Away Win */}
          <div
            style={{ width: `${awayWin}%` }}
            className="bg-loss flex items-center justify-center text-main font-scoreboard text-xs tabular-nums font-bold transition-all"
            title={`Victoria Visitante: ${awayWin}%`}
          >
            {awayWin > 12 && `${awayWin}%`}
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 text-center text-xs font-mono uppercase tracking-wider mt-2 pt-1 border-t border-hairline-subtle text-muted">
          <div>
            <span className="inline-block w-2 h-2 bg-win mr-1"></span>
            <span>{teams?.home?.slice(0, 10) || 'Local'} ({homeWin}%)</span>
          </div>
          <div>
            <span className="inline-block w-2 h-2 bg-muted mr-1"></span>
            <span>Empate ({draw}%)</span>
          </div>
          <div>
            <span className="inline-block w-2 h-2 bg-loss mr-1"></span>
            <span>{teams?.away?.slice(0, 10) || 'Visita'} ({awayWin}%)</span>
          </div>
        </div>
      </div>

      {/* Decisiones y Lógica de Negocio Propia (Rúbrica de Evaluación) */}
      <div className="space-y-3 pt-2 border-t border-hairline">
        <div className="flex items-center justify-between text-[11px] font-mono text-muted uppercase">
          <span className="font-semibold text-main flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-led" />
            <span>Decisiones y Cálculos Automatizados del Motor</span>
          </span>
          {confidenceDecision && (
            <span className="text-[10px] px-2 py-0.5 border border-hairline bg-pitch text-led">
              Confianza: {confidenceDecision.level} ({confidenceDecision.score}%)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Decisión 1: Roster Penalty */}
          <div className="p-3 bg-pitch/70 border border-hairline-subtle text-xs font-mono">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase text-muted">Decisión 1: Estado de Plantilla</span>
              {rosterDecision?.applied ? (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-loss/20 text-loss border border-loss/40 uppercase font-bold">
                  <AlertTriangle className="w-3 h-3" />
                  -15% Ataque
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-win/20 text-win border border-win/40 uppercase font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  Plantilla Estelar
                </span>
              )}
            </div>
            <p className="text-[11px] text-main font-semibold">
              {rosterDecision?.badge || 'Plantilla Estelar (100% Fuerza de Ataque)'}
            </p>
          </div>

          {/* Decisión 2: Intensidad Over / Under 2.5 Goles */}
          <div className="p-3 bg-pitch/70 border border-hairline-subtle text-xs font-mono">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase text-muted">Decisión 2: Línea de Intensidad</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-surface text-led border border-hairline uppercase font-bold">
                {overUnder25?.underPct}% Under
              </span>
            </div>
            <p className="text-[11px] text-main font-semibold">
              {overUnder25?.prediction}
            </p>
          </div>
        </div>

        {/* Decisión 3: Recomendación Algorítmica de Valor (Value Bet) */}
        {valueBetDecision && (
          <div className="p-3 bg-pitch/70 border border-hairline-subtle text-xs font-mono flex items-start space-x-2.5">
            <Target className="w-4 h-4 text-led flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase text-muted block">Decisión 3: Recomendación de Valor Algorítmica</span>
              <p className="text-[11px] text-main font-semibold leading-relaxed mt-0.5">
                {valueBetDecision.recommendation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fuerza de Ataque y Defensa (Goles Esperados) */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-hairline-subtle text-xs font-mono">
        <div className="bg-surface-subtle p-2.5 border border-hairline-subtle">
          <span className="text-muted block text-[10px] uppercase">Fuerza de Ataque (Local)</span>
          <span className="text-main font-semibold tabular-nums text-sm">
            {teams?.home}: <span className="text-win font-bold">{lambda?.home}</span>
          </span>
        </div>
        <div className="bg-surface-subtle p-2.5 border border-hairline-subtle">
          <span className="text-muted block text-[10px] uppercase">Fuerza de Ataque (Visitante)</span>
          <span className="text-main font-semibold tabular-nums text-sm">
            {teams?.away}: <span className="text-led font-bold">{lambda?.away}</span>
          </span>
        </div>
      </div>
    </div>
  );
};