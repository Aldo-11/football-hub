import React, { useState } from 'react';
import { Dices, Play } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useClub } from '../context/ClubContext';
import { Card, Loading, ErrorState, PageHeader, Crest, InfoNote, DataMeta } from '../components/ui';

const SIM_OPTIONS = [1000, 5000, 10000, 20000];

const heat = (p) => {
  if (p <= 0) return 'transparent';
  return `rgba(242, 183, 5, ${Math.min(0.85, 0.08 + p / 60)})`;
};

export const Simulation = () => {
  const { club } = useClub();
  const [form, setForm] = useState({ simulations: 5000, seed: 20262027 });
  const [params, setParams] = useState(form);
  const { data, error, loading, reload } = useApi(`/clubs/${club.id}/simulation`, params);

  const submit = (e) => {
    e.preventDefault();
    const seed = Math.max(0, Math.min(2 ** 31 - 1, parseInt(form.seed, 10) || 0));
    setParams({ simulations: form.simulations, seed });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader icon={Dices} title={`Simulación de temporada · ${data?.league?.name || club.leagueName}`}
        subtitle="Monte Carlo: se juega miles de veces el resto de la temporada con los partidos pendientes reales de la liga, partiendo de la clasificación actual. Cada partido se sortea con el modelo de Poisson y la fuerza de cada equipo varía entre simulaciones según cuántos partidos lleva jugados."
        right={data && <DataMeta meta={data.meta} />} />

      <Card className="p-4">
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3 text-xs font-mono">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-muted">Simulaciones</span>
            <select value={form.simulations} onChange={(e) => setForm({ ...form, simulations: Number(e.target.value) })}
              className="bg-pitch border border-hairline px-2 py-1.5 text-main">
              {SIM_OPTIONS.map((n) => <option key={n} value={n}>{n.toLocaleString('es-ES')}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-muted">Semilla (reproducible)</span>
            <input type="number" min="0" value={form.seed} onChange={(e) => setForm({ ...form, seed: e.target.value })}
              className="bg-pitch border border-hairline px-2 py-1.5 text-main w-36" />
          </label>
          <button type="submit" disabled={loading} className="flex items-center gap-1.5 bg-led text-pitch font-scoreboard uppercase px-4 py-2 disabled:opacity-50">
            <Play className="w-3.5 h-3.5" /> Simular
          </button>
          <span className="text-muted">La misma semilla produce siempre el mismo resultado.</span>
        </form>
      </Card>

      {loading && <Card><Loading label="Simulando temporada…" /></Card>}
      {error && <Card><ErrorState error={error} onRetry={reload} /></Card>}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-3 bg-surface border border-hairline"><span className="block text-[10px] uppercase text-muted">Simulaciones</span><b className="text-main">{data.simulations.toLocaleString('es-ES')}</b></div>
            <div className="p-3 bg-surface border border-hairline"><span className="block text-[10px] uppercase text-muted">Partidos pendientes</span><b className="text-main">{data.remainingMatches}</b></div>
            <div className="p-3 bg-surface border border-hairline"><span className="block text-[10px] uppercase text-muted">Media de goles liga</span><b className="text-main">{data.model.leagueAvgGoals}</b></div>
            <div className="p-3 bg-surface border border-hairline"><span className="block text-[10px] uppercase text-muted">Semilla</span><b className="text-main">{data.seed}</b></div>
          </div>
          {!data.fixturesComplete && (
            <p className="text-[11px] font-mono text-loss border border-loss/40 bg-loss/10 p-2">
              Se esperaban {data.expectedRemainingMatches} partidos pendientes y la fuente devolvió {data.remainingMatches}. Los resultados son aproximados.
            </p>
          )}

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <caption className="sr-only">Resultados de la simulación Monte Carlo</caption>
                <thead>
                  <tr className="text-[10px] uppercase text-muted bg-pitch/40 border-b border-hairline">
                    <th scope="col" className="py-2 px-2 text-left">Club</th>
                    <th scope="col" className="py-2 px-2 text-right" title="Posición actual">Act.</th>
                    <th scope="col" className="py-2 px-2 text-right" title="Puntos actuales">Pts</th>
                    <th scope="col" className="py-2 px-2 text-right" title="Puntos finales esperados (media)">Pts esp.</th>
                    <th scope="col" className="py-2 px-2 text-right hidden sm:table-cell" title="80 % de las simulaciones terminan en este rango">Rango 80 %</th>
                    <th scope="col" className="py-2 px-2 text-right" title="Posición final media">Pos. media</th>
                    <th scope="col" className="py-2 px-2 text-right">Campeón</th>
                    <th scope="col" className="py-2 px-2 text-right">Top {data.zones.championsLeague}</th>
                    <th scope="col" className="py-2 px-2 text-right">Descenso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-subtle">
                  {data.teams.map((t) => {
                    const mine = t.clubId === club.id;
                    return (
                      <tr key={t.team.espnId} className={mine ? 'bg-led/10 font-semibold' : ''}>
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Crest src={t.team.crest} size="w-4 h-4" />
                            <span className="truncate max-w-[120px] sm:max-w-none text-main">{t.team.name}</span>
                            {mine && <span className="text-[9px] uppercase px-1 bg-led text-pitch font-scoreboard">Tu club</span>}
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-muted">{t.currentPosition}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-muted">{t.currentPoints}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-main">{t.expectedPoints}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-muted hidden sm:table-cell">{t.pointsRange.p10}–{t.pointsRange.p90}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-main">{t.averagePosition.toFixed(1)}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums" style={{ background: heat(t.probabilities.title) }}>{t.probabilities.title}%</td>
                        <td className="py-1.5 px-2 text-right tabular-nums" style={{ background: heat(t.probabilities.championsLeague) }}>{t.probabilities.championsLeague}%</td>
                        <td className="py-1.5 px-2 text-right tabular-nums" style={{ background: t.probabilities.relegation > 0 ? `rgba(193,68,60,${Math.min(0.8, 0.08 + t.probabilities.relegation / 60)})` : 'transparent' }}>{t.probabilities.relegation}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4 space-y-2">
            <InfoNote>
              Cómo leer la tabla: «Pts esp.» es la media de puntos finales en todas las simulaciones y «Rango 80 %» el intervalo donde terminó el 80 % de ellas.
              Las probabilidades son la proporción de simulaciones en que ocurrió cada cosa.
            </InfoNote>
            <InfoNote>
              Supuestos del modelo: goles ~ Poisson con fuerzas de ataque/defensa de la temporada actual, ventaja de local ×{data.model.homeAdvantage},
              incertidumbre de fuerza σ = {data.model.strengthSigma} (mayor cuanto menos partidos jugados). No considera lesiones, fichajes, sanciones ni
              calendarios de otras competiciones. Las plazas de Champions usan la regla base de la liga (top {data.zones.championsLeague}).
            </InfoNote>
          </Card>
        </>
      )}
    </div>
  );
};
