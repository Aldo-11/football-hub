import React from 'react';
import { Landmark, Users, Trophy } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useClub } from '../context/ClubContext';
import { Card, Loading, ErrorState, PageHeader, Crest, SectionTitle, InfoNote, DataMeta, EmptyState } from '../components/ui';

const History = ({ data }) => {
  const h = data.history;
  return (
    <Card className="p-5 space-y-4">
      <SectionTitle icon={Landmark} title="Historia" />
      <dl className="grid grid-cols-3 gap-2 text-xs font-mono">
        <div className="p-2.5 bg-pitch/60 border border-hairline-subtle"><dt className="text-[10px] uppercase text-muted">Fundación</dt><dd className="text-main font-bold">{h.founded}</dd></div>
        <div className="p-2.5 bg-pitch/60 border border-hairline-subtle"><dt className="text-[10px] uppercase text-muted">Ciudad</dt><dd className="text-main font-bold">{h.city}</dd></div>
        <div className="p-2.5 bg-pitch/60 border border-hairline-subtle"><dt className="text-[10px] uppercase text-muted">Estadio</dt><dd className="text-main font-bold">{h.stadium}</dd></div>
      </dl>
      <p className="text-sm text-main leading-relaxed">{h.summary}</p>
      <div>
        <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-muted mb-1.5"><Trophy className="w-3.5 h-3.5 text-led" /> Títulos principales</span>
        <ul className="flex flex-wrap gap-2">
          {h.honours.map((t) => (
            <li key={t.title} className="px-2.5 py-1.5 border border-hairline text-xs font-mono"><b className="text-led font-scoreboard">{t.count}</b> <span className="text-main">{t.title}</span></li>
          ))}
        </ul>
      </div>
      <InfoNote>Datos históricos de referencia actualizados hasta la {h.cutoff}. No se actualizan en vivo.</InfoNote>
    </Card>
  );
};

const Squad = ({ data }) => (
  <Card className="p-5 space-y-4">
    <SectionTitle icon={Users} title={`Plantilla ${data.season}`} right={<DataMeta meta={data.meta} />} />
    {data.total === 0 ? <EmptyState>La fuente no publicó la plantilla de esta temporada.</EmptyState> : (
      <div className="grid sm:grid-cols-2 gap-4">
        {data.groups.map((g) => (
          <div key={g.key}>
            <h3 className="text-[10px] font-mono uppercase text-muted border-b border-hairline pb-1 mb-1.5">{g.label} ({g.players.length})</h3>
            <ul className="text-xs font-mono divide-y divide-hairline-subtle">
              {g.players.map((p) => (
                <li key={p.id} className="py-1.5 flex items-center gap-2">
                  <span className="w-7 text-right tabular-nums text-led font-bold">{p.number ?? '–'}</span>
                  <span className="text-main flex-1 truncate">{p.name}</span>
                  <span className="text-muted text-[10px] hidden sm:inline truncate max-w-[90px]">{p.nationality || ''}</span>
                  {p.age != null && <span className="text-muted text-[10px] tabular-nums">{p.age} a.</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )}
    <InfoNote>
      {data.total} jugadores registrados por la fuente para la temporada {data.season}. Valor de mercado: no disponible —
      Transfermarkt no ofrece una API pública y extraer sus datos incumple sus condiciones de uso, por lo que no se muestran valores sin verificar.
    </InfoNote>
  </Card>
);

export const Club = () => {
  const { club } = useClub();
  const profile = useApi(`/clubs/${club.id}`);
  const squad = useApi(`/clubs/${club.id}/squad`);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader title={club.name} subtitle={`${club.leagueName} · Temporada actual`}
        right={<Crest src={club.crest} alt={club.name} size="w-14 h-14" />} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          {profile.loading && <Card><Loading /></Card>}
          {profile.error && <Card><ErrorState error={profile.error} onRetry={profile.reload} /></Card>}
          {profile.data && <History data={profile.data} />}
        </div>
        <div className="lg:col-span-7">
          {squad.loading && <Card><Loading label="Cargando plantilla…" /></Card>}
          {squad.error && <Card><ErrorState error={squad.error} onRetry={squad.reload} /></Card>}
          {squad.data && <Squad data={squad.data} />}
        </div>
      </div>
    </div>
  );
};
