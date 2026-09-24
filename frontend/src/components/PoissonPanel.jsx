import React, { useState } from 'react';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { InfoNote } from './ui';

const Bar = ({ label, value, color, textColor = 'text-pitch' }) => (
  <div style={{ width: `${value}%` }} className={`${color} ${textColor} flex items-center justify-center text-[11px] font-scoreboard tabular-nums overflow-hidden`} title={`${label}: ${value}%`}>
    {value >= 12 && `${value}%`}
  </div>
);

const StrengthRow = ({ name, s, lambda }) => (
  <tr className="border-t border-hairline-subtle">
    <th scope="row" className="py-1.5 pr-2 text-left text-main font-semibold truncate max-w-[120px]">{name}</th>
    <td className="py-1.5 px-2 text-right tabular-nums">{s.attack.toFixed(2)}</td>
    <td className="py-1.5 px-2 text-right tabular-nums">{s.defense.toFixed(2)}</td>
    <td className="py-1.5 px-2 text-right tabular-nums">{s.played}</td>
    <td className="py-1.5 pl-2 text-right tabular-nums text-led font-bold">{lambda.toFixed(2)}</td>
  </tr>
);

/**
 * Muestra el resultado del modelo de Poisson calculado en el backend.
 * Todos los números vienen del cálculo real; aquí solo se presentan.
 */
export const PoissonPanel = ({ prediction }) => {
  const [open, setOpen] = useState(false);
  const { teams, probabilities: p, expectedGoals: xg, overUnder, strengths, mostLikelyScore, conclusion, reliability, model, topScores, bothTeamsScore } = prediction;

  return (
    <div className="space-y-4">
      {reliability.lowSample && (
        <p className="flex items-start gap-2 text-[11px] font-mono text-loss border border-loss/40 bg-loss/10 p-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          Algún equipo lleva menos de {reliability.minMatches} partidos: el pronóstico es poco fiable al inicio de temporada.
        </p>
      )}

      <div>
        <div className="w-full h-8 flex border border-hairline" role="img" aria-label={`Local ${p.homeWin}%, empate ${p.draw}%, visitante ${p.awayWin}%`}>
          <Bar label={teams.home} value={p.homeWin} color="bg-win" />
          <Bar label="Empate" value={p.draw} color="bg-muted" />
          <Bar label={teams.away} value={p.awayWin} color="bg-loss" textColor="text-main" />
        </div>
        <div className="grid grid-cols-3 text-center text-[11px] font-mono mt-1.5 text-muted">
          <span className="truncate">{teams.home} <b className="text-main">{p.homeWin}%</b></span>
          <span>Empate <b className="text-main">{p.draw}%</b></span>
          <span className="truncate">{teams.away} <b className="text-main">{p.awayWin}%</b></span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="p-2.5 bg-pitch/60 border border-hairline-subtle">
          <span className="block text-[10px] text-muted uppercase">Goles esperados</span>
          <span className="text-main font-bold tabular-nums">{xg.home} – {xg.away}</span>
        </div>
        <div className="p-2.5 bg-pitch/60 border border-hairline-subtle">
          <span className="block text-[10px] text-muted uppercase">Marcador más probable</span>
          <span className="text-led font-bold tabular-nums">{mostLikelyScore.home}-{mostLikelyScore.away}</span>
          <span className="text-muted"> ({mostLikelyScore.probability}%)</span>
        </div>
        <div className="p-2.5 bg-pitch/60 border border-hairline-subtle">
          <span className="block text-[10px] text-muted uppercase">Under / Over 2.5</span>
          <span className="text-main font-bold tabular-nums">{overUnder.under}% / {overUnder.over}%</span>
        </div>
        <div className="p-2.5 bg-pitch/60 border border-hairline-subtle">
          <span className="block text-[10px] text-muted uppercase">Ambos marcan</span>
          <span className="text-main font-bold tabular-nums">{bothTeamsScore}%</span>
        </div>
      </div>

      <div className="p-3 border border-led/40 bg-led/5 text-xs">
        <span className="block text-[10px] font-mono uppercase text-led mb-1">Conclusión del modelo</span>
        <p className="text-main">{conclusion.summary}</p>
      </div>

      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center justify-between text-[11px] font-mono uppercase text-muted hover:text-main border-t border-hairline pt-3">
        ¿Cómo se calcula?
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-3 text-xs text-muted leading-relaxed">
          <p><b className="text-main">Qué calcula:</b> la probabilidad de cada resultado suponiendo que los goles de cada equipo siguen una distribución de Poisson, un modelo clásico para eventos poco frecuentes como los goles.</p>
          <p><b className="text-main">Fuerza ofensiva:</b> cuántos goles marca el equipo comparado con la media de su liga ({model.leagueAvgGoals} por equipo y partido). 1.00 = promedio; 1.30 = marca un 30 % más.</p>
          <p><b className="text-main">Fuerza defensiva:</b> cuántos goles recibe comparado con la media. <b>Aquí más bajo es mejor</b>: 0.70 = recibe un 30 % menos.</p>
          <p><b className="text-main">Goles esperados (λ):</b> ataque propio × defensa rival × media de la liga, con una ventaja de local de ×{model.homeAdvantage} (el visitante se divide por ese valor).</p>
          <p><b className="text-main">Under 2.5:</b> probabilidad de que el partido termine con 2 goles o menos en total (0-0, 1-0, 1-1, 2-0…). Over 2.5 es lo contrario: 3 goles o más.</p>
          <p><b className="text-main">Conclusión:</b> se compara el resultado más probable con el segundo. Diferencia ≥ 25 puntos = favorito claro; 10-25 = ligera ventaja; &lt; 10 = partido equilibrado. Para los goles: Under o Over se destacan si superan el 55 %.</p>

          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="text-muted uppercase text-[10px]">
                <th className="text-left font-normal">Equipo</th>
                <th className="text-right font-normal">Ataque</th>
                <th className="text-right font-normal">Defensa</th>
                <th className="text-right font-normal">PJ</th>
                <th className="text-right font-normal">λ</th>
              </tr>
            </thead>
            <tbody>
              <StrengthRow name={teams.home} s={strengths.home} lambda={xg.home} />
              <StrengthRow name={teams.away} s={strengths.away} lambda={xg.away} />
            </tbody>
          </table>

          <div>
            <span className="block text-[10px] font-mono uppercase mb-1">5 marcadores más probables</span>
            <div className="flex flex-wrap gap-1.5">
              {topScores.map((s) => (
                <span key={`${s.home}-${s.away}`} className="px-2 py-1 border border-hairline font-mono text-[11px] text-main">{s.home}-{s.away} · {s.probability}%</span>
              ))}
            </div>
          </div>
          <InfoNote>
            Para evitar valores extremos con pocos partidos, cada equipo arranca con {model.shrinkageMatches} partidos «promedio» ficticios que pierden peso a medida que juega. Es un modelo estadístico, no una certeza.
          </InfoNote>
        </div>
      )}
    </div>
  );
};
