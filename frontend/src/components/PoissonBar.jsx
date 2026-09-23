import React from 'react';

export const PoissonBar = ({ prediction }) => {
  if (!prediction) {
    return (
      <div className="p-4 border border-hairline text-center text-muted font-mono text-xs">
        Cálculo de Poisson no disponible
      </div>
    );
  }

  const { probabilities, lambda, mostLikelyScore, overUnder25, teams } = prediction;
  const homeWin = probabilities?.homeWin || 0;
  const draw = probabilities?.draw || 0;
  const awayWin = probabilities?.awayWin || 0;

  return (
    <div className="border border-hairline bg-surface p-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hairline pb-3 mb-4">
        <div>
          <span className="text-xs font-mono uppercase text-muted tracking-wider block">Distribución de Poisson</span>
          <span className="font-scoreboard text-base text-main uppercase">Probabilidades 1X2</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-muted uppercase block">Marcador Más Probable</span>
          <span className="font-scoreboard text-lg text-led tabular-nums">
            {mostLikelyScore.home} - {mostLikelyScore.away}
          </span>
          <span className="text-[10px] font-mono text-muted ml-1">({mostLikelyScore.probability}%)</span>
        </div>
      </div>

      {/* 3-Segment Horizontal Bar (No gradients) */}
      <div className="mb-4">
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

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-hairline text-xs font-mono">
        <div className="bg-pitch/60 p-2.5 border border-hairline-subtle">
          <span className="text-muted block text-[10px] uppercase">Goles Esperados (λ)</span>
          <span className="text-main font-semibold tabular-nums">
            {teams?.home}: <span className="text-led">{lambda?.home}</span> | {teams?.away}: <span className="text-led">{lambda?.away}</span>
          </span>
        </div>
        <div className="bg-pitch/60 p-2.5 border border-hairline-subtle">
          <span className="text-muted block text-[10px] uppercase">Línea de Goles (Over/Under 2.5)</span>
          <span className="text-main font-semibold tabular-nums">
            {overUnder25?.prediction} <span className="text-muted">({overUnder25?.overPct}%)</span>
          </span>
        </div>
      </div>
    </div>
  );
};