import React from 'react';
import { BarChart3, Gauge, Bell, TrendingUp, Home, Plane, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useClub } from '../context/ClubContext';
import { Card, SectionTitle, Loading, ErrorState, PageHeader, ScoreBar, ResultBadge, InfoNote, EmptyState, DataMeta } from '../components/ui';
import { formatShortDate } from '../utils/dates';

const COMPONENT_INFO = {
  points: { label: 'Puntos', help: 'Puntos por partido ÷ 3 × 100' },
  attack: { label: 'Ataque', help: '50 × (goles a favor por partido ÷ media de la liga)' },
  defense: { label: 'Defensa', help: '100 − 50 × (goles en contra por partido ÷ media de la liga)' },
  form: { label: 'Forma', help: 'Puntos en los últimos 5 partidos ÷ puntos posibles × 100' }
};

const BAND_COLOR = { HIGH: 'text-win', MEDIUM: 'text-led', LOW: 'text-loss' };
const BAR_COLOR = { HIGH: 'bg-win', MEDIUM: 'bg-led', LOW: 'bg-loss' };

const Stat = ({ label, value, hint }) => (
  <div className="p-3 bg-pitch/60 border border-hairline-subtle" title={hint}>
    <span className="block text-[10px] font-mono uppercase text-muted">{label}</span>
    <span className="font-scoreboard text-lg text-main tabular-nums">{value ?? '—'}</span>
  </div>
);

const IndexCard = ({ index }) => (
  <Card className="p-5 space-y-4">
    <SectionTitle icon={Gauge} title="Índice de Rendimiento del Equipo" />
    <div className="flex items-end gap-3">
      <span className={`font-scoreboard text-5xl tabular-nums ${BAND_COLOR[index.level]}`}>{index.score}</span>
      <span className="text-sm text-muted mb-1">/ 100 · nivel <b className={BAND_COLOR[index.level]}>{index.label.toLowerCase()}</b></span>
    </div>
    <ScoreBar value={index.score} color={BAR_COLOR[index.level]} />
    <div className="space-y-2.5">
      {Object.entries(COMPONENT_INFO).map(([key, info]) => (
        <div key={key} className="text-xs">
          <div className="flex justify-between font-mono mb-1">
            <span className="text-main">{info.label} <span className="text-muted">({Math.round(index.weights[key] * 100)} %)</span></span>
            <span className="tabular-nums text-main">{index.components[key]}</span>
          </div>
          <ScoreBar value={index.components[key]} />
          <p className="text-[10px] text-muted mt-0.5">{info.help}</p>
        </div>
      ))}
    </div>
    <InfoNote>
      Índice = 0.35·Puntos + 0.25·Ataque + 0.25·Defensa + 0.15·Forma. En Ataque y Defensa, 50 equivale a la media de su liga.
      Lectura: 0-39 bajo · 40-69 medio · 70-100 alto.
    </InfoNote>
  </Card>
);

const SEVERITY = {
  positive: { icon: CheckCircle2, cls: 'border-win/40 bg-win/10', iconCls: 'text-win' },
  warning: { icon: AlertTriangle, cls: 'border-loss/40 bg-loss/10', iconCls: 'text-loss' },
  info: { icon: Info, cls: 'border-hairline bg-pitch/60', iconCls: 'text-led' }
};

const AlertsCard = ({ alerts, recommendations }) => (
  <Card className="p-5 space-y-3">
    <SectionTitle icon={Bell} title="Puntos clave del equipo" right={`${alerts.length} detectados`} />
    <p className="text-[11px] text-muted leading-relaxed">
      Football Hub revisa los números del equipo y destaca lo que se sale de lo normal: rachas, cambios de rendimiento y si ataca o defiende
      mejor o peor que la media de su liga. Verde = aspecto positivo, rojo = aspecto a vigilar, gris = dato informativo. Cada punto indica la regla que lo activó.
    </p>
    <ul className="space-y-2">
      {alerts.map((a) => {
        const S = SEVERITY[a.severity];
        return (
          <li key={a.id} className={`p-3 border text-xs ${S.cls}`}>
            <div className="flex items-start gap-2">
              <S.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${S.iconCls}`} />
              <div>
                <p className="text-main font-semibold">{a.title}</p>
                <p className="text-muted">{a.detail}</p>
                <p className="text-[10px] font-mono text-muted mt-1">Se activa cuando: {a.rule}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
    {recommendations.length > 0 && (
      <div className="pt-2 border-t border-hairline">
        <span className="text-[10px] font-mono uppercase text-muted">En resumen</span>
        <ul className="list-disc list-inside text-xs text-main space-y-1 mt-1">
          {recommendations.map((r) => <li key={r.alertId}>{r.text}</li>)}
        </ul>
      </div>
    )}
  </Card>
);

/** Gráfico de puntos acumulados jornada a jornada (SVG, sin librerías). */
const ProgressionChart = ({ progression }) => {
  const W = 600; const H = 180; const P = 28;
  const maxPts = Math.max(3, 3 * progression.length);
  const x = (i) => P + (i * (W - 2 * P)) / Math.max(1, progression.length - 1);
  const y = (v) => H - P - (v / maxPts) * (H - 2 * P);
  const points = progression.map((p, i) => `${x(i)},${y(p.cumulativePoints)}`).join(' ');
  const maxLine = progression.map((p, i) => `${x(i)},${y(3 * p.match)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Puntos acumulados por partido">
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="rgba(237,239,231,0.2)" />
      <polyline points={maxLine} fill="none" stroke="rgba(237,239,231,0.25)" strokeDasharray="4 4" />
      <polyline points={points} fill="none" stroke="#F2B705" strokeWidth="2.5" />
      {progression.map((p, i) => (
        <g key={p.match}>
          <circle cx={x(i)} cy={y(p.cumulativePoints)} r="4" fill={p.result === 'W' ? '#4C9A6A' : p.result === 'L' ? '#C1443C' : '#9BA39B'} />
          <text x={x(i)} y={y(p.cumulativePoints) - 8} textAnchor="middle" fontSize="11" fill="#EDEFE7">{p.cumulativePoints}</text>
          <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="#9BA39B">{p.match}</text>
        </g>
      ))}
    </svg>
  );
};

const SplitCard = ({ title, icon: Icon, s }) => (
  <div className="p-3 bg-pitch/60 border border-hairline-subtle text-xs font-mono">
    <span className="flex items-center gap-1.5 text-[10px] uppercase text-muted mb-1"><Icon className="w-3.5 h-3.5" /> {title}</span>
    {s.played === 0 ? <span className="text-muted">Sin partidos</span> : (
      <>
        <p className="text-main"><b>{s.ppg}</b> pts/partido · {s.wins}V {s.draws}E {s.losses}D</p>
        <p className="text-muted">{s.goalsForPerGame} GF · {s.goalsAgainstPerGame} GC por partido</p>
      </>
    )}
  </div>
);

export const Analysis = () => {
  const { club } = useClub();
  const { data, error, loading, reload } = useApi(`/clubs/${club.id}/analysis`);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader icon={BarChart3} title={`Análisis del equipo · ${club.shortName}`}
        subtitle="Football Hub transforma los resultados de liga de la temporada en métricas propias: índice de rendimiento, forma, rendimiento local/visitante, consistencia y puntos clave detectados con reglas explícitas."
        right={data && <DataMeta meta={data.meta} />} />

      {loading && <Card><Loading label="Analizando partidos…" /></Card>}
      {error && <Card><ErrorState error={error} onRetry={reload} /></Card>}

      {data && data.analysis.played === 0 && (
        <Card><EmptyState>{club.shortName} aún no ha terminado partidos de liga en la temporada {data.season}.</EmptyState></Card>
      )}

      {data && data.analysis.played > 0 && (() => {
        const a = data.analysis;
        return (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              <Stat label="Posición" value={data.standing ? `${data.standing.position}.º de ${data.standing.of}` : null} />
              <Stat label="Partidos" value={a.played} />
              <Stat label="Puntos" value={a.overall.points} />
              <Stat label="Pts/partido" value={a.overall.ppg} />
              <Stat label="GF/partido" value={a.overall.goalsForPerGame} />
              <Stat label="GC/partido" value={a.overall.goalsAgainstPerGame} />
              <Stat label="Dif. goles" value={a.overall.goalDifference > 0 ? `+${a.overall.goalDifference}` : a.overall.goalDifference} />
              <Stat label="Porterías a 0" value={a.overall.cleanSheets} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-6">
                <IndexCard index={a.index} />
                <AlertsCard alerts={data.alerts} recommendations={data.recommendations} />
              </div>

              <div className="lg:col-span-7 space-y-6">
                <Card className="p-5 space-y-3">
                  <SectionTitle icon={TrendingUp} title="Progresión de la temporada" right={`${a.played} partidos`} />
                  <ProgressionChart progression={a.progression} />
                  <InfoNote>
                    Línea amarilla: puntos acumulados reales. Línea discontinua: máximo posible (ganar todo).
                    {a.projection && ` Si mantiene su ritmo actual (${a.overall.ppg} pts/partido) terminaría con unos ${a.projection.points} puntos en ${a.projection.totalMatches} partidos (proyección lineal, no una meta).`}
                  </InfoNote>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] font-mono">
                      <thead><tr className="text-muted uppercase text-[10px]">
                        <th className="text-left font-normal py-1">#</th><th className="text-left font-normal">Fecha</th><th className="text-left font-normal">Rival</th>
                        <th className="text-center font-normal">Res.</th><th className="text-right font-normal">Pts acum.</th><th className="text-right font-normal">DG acum.</th>
                      </tr></thead>
                      <tbody>
                        {a.progression.map((p) => (
                          <tr key={p.match} className="border-t border-hairline-subtle">
                            <td className="py-1 text-muted">{p.match}</td>
                            <td className="text-muted">{formatShortDate(p.utcDate)}</td>
                            <td className="text-main truncate max-w-[120px]">{p.isHome ? 'vs' : '@'} {p.opponent}</td>
                            <td className="text-center"><span className="inline-flex items-center gap-1"><ResultBadge result={p.result} /> {p.score}</span></td>
                            <td className="text-right tabular-nums text-main">{p.cumulativePoints}</td>
                            <td className="text-right tabular-nums">{p.cumulativeGoalDifference > 0 ? `+${p.cumulativeGoalDifference}` : p.cumulativeGoalDifference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <Card className="p-5 space-y-3">
                  <SectionTitle title="Forma, localía y consistencia" />
                  <div className="flex items-center gap-1.5" aria-label="Últimos resultados">
                    {a.form.map((f, i) => <span key={i} title={`${f.isHome ? 'vs' : '@'} ${f.opponent} ${f.score}`}><ResultBadge result={f.result} /></span>)}
                    <span className="ml-2 text-xs font-mono text-muted">{a.formPoints.points}/{a.formPoints.max} pts en los últimos {a.form.length}</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <SplitCard title="Como local" icon={Home} s={a.home} />
                    <SplitCard title="Como visitante" icon={Plane} s={a.away} />
                  </div>
                  <div className="text-xs">
                    <div className="flex justify-between font-mono mb-1"><span className="text-main">Consistencia</span><span className="tabular-nums">{a.consistency.score}/100</span></div>
                    <ScoreBar value={a.consistency.score} />
                    <p className="text-[10px] text-muted mt-1">100 × (1 − desviación de los puntos por partido ÷ 1.5). Alto = resultados regulares; bajo = alterna victorias y derrotas.</p>
                  </div>
                  <p className="text-[11px] font-mono text-muted">
                    Frente a su liga (media {a.league.avgGoalsPerTeamGame} goles por equipo y partido): marca {a.ratios.attackVsLeague}× y recibe {a.ratios.defenseVsLeague}× la media.
                  </p>
                </Card>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
};
