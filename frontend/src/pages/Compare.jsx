import React, { useState } from 'react';
import { GitCompare } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useClub } from '../context/ClubContext';
import { Card, Loading, ErrorState, PageHeader, Crest, InfoNote, SectionTitle, EmptyState } from '../components/ui';
import { formatShortDate } from '../utils/dates';

const ClubPicker = ({ label, value, onChange, clubs, exclude }) => (
  <label className="flex flex-col gap-1 text-xs font-mono">
    <span className="text-[10px] uppercase text-muted">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-pitch border border-hairline px-2 py-1.5 text-main">
      {clubs.filter((c) => c.id !== exclude).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.leagueName})</option>)}
    </select>
  </label>
);

/** Comparativa H2H entre dos de los 10 clubes soportados. */
export const Compare = () => {
  const { club, clubs } = useClub();
  const [a, setA] = useState(club.id);
  const [b, setB] = useState(() => clubs.find((c) => c.id !== club.id && c.league === club.league)?.id || clubs.find((c) => c.id !== club.id)?.id);
  const { data, error, loading, reload } = useApi(a && b && a !== b ? '/compare' : null, { a, b });

  const [ca, cb] = data?.clubs || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader icon={GitCompare} title="Comparativa Head-to-Head"
        subtitle="Compara dos clubes con cuatro indicadores de 0 a 100 calculados con sus partidos de liga de esta temporada. Ataque y defensa se miden frente a la media de la liga de cada club, así se pueden comparar clubes de ligas distintas." />

      <Card className="p-4 flex flex-wrap items-end gap-4">
        <ClubPicker label="Club A" value={a} onChange={setA} clubs={clubs} exclude={b} />
        <span className="font-scoreboard text-muted pb-1.5">vs</span>
        <ClubPicker label="Club B" value={b} onChange={setB} clubs={clubs} exclude={a} />
      </Card>

      {loading && <Card><Loading label="Comparando…" /></Card>}
      {error && <Card><ErrorState error={error} onRetry={reload} /></Card>}

      {data && (
        <>
          <Card className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-3 text-center">
              {[ca, cb].map((c) => (
                <div key={c.id} className="flex flex-col items-center gap-1">
                  <Crest src={c.crest} alt={c.name} size="w-12 h-12" />
                  <span className="font-scoreboard uppercase text-main text-sm">{c.shortName}</span>
                  <span className="text-[10px] font-mono text-muted uppercase">{c.leagueName} · {data.indicatorWins[c.id]} indicadores</span>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {data.indicators.map((ind) => {
                const va = ind.values[ca.id]; const vb = ind.values[cb.id];
                return (
                  <div key={ind.key}>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className={`tabular-nums font-bold ${ind.leader === ca.id ? 'text-led' : 'text-main'}`}>{va ?? '—'}</span>
                      <span className="text-main uppercase text-[11px]">{ind.label}</span>
                      <span className={`tabular-nums font-bold ${ind.leader === cb.id ? 'text-win' : 'text-main'}`}>{vb ?? '—'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 h-2">
                      <div className="bg-pitch flex justify-end"><div className="bg-led h-full" style={{ width: `${va ?? 0}%` }} /></div>
                      <div className="bg-pitch"><div className="bg-win h-full" style={{ width: `${vb ?? 0}%` }} /></div>
                    </div>
                    <p className="text-[10px] text-muted mt-1 text-center">{ind.description}</p>
                  </div>
                );
              })}
            </div>

            <p className="text-sm text-main text-center border-t border-hairline pt-3">{data.verdict}</p>
            {!data.sameLeague && <InfoNote>Clubes de ligas distintas: los indicadores son relativos a cada liga, no miden quién ganaría un partido directo.</InfoNote>}
          </Card>

          <Card className="p-4">
            <SectionTitle title="Enfrentamientos directos esta temporada" />
            {data.meetings.length === 0 ? (
              <EmptyState>No se enfrentan en liga esta temporada{data.sameLeague ? ' todavía' : ' (juegan en ligas distintas)'}.</EmptyState>
            ) : (
              <ul className="space-y-1.5 text-xs font-mono">
                {data.meetings.map((m) => (
                  <li key={m.fixtureId} className="flex items-center justify-between gap-2 p-2 border border-hairline-subtle">
                    <span className="text-muted">{formatShortDate(m.utcDate)}</span>
                    <span className="text-main truncate">{m.homeTeam.shortName} {m.status === 'FINISHED' ? `${m.score.home}-${m.score.away}` : 'vs'} {m.awayTeam.shortName}</span>
                    <span className="text-[10px] uppercase text-muted">{m.status === 'FINISHED' ? 'Final' : 'Programado'}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
