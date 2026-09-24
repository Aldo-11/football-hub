import React from 'react';
import { Trophy } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useClub } from '../context/ClubContext';
import { Card, Loading, ErrorState, PageHeader, EmptyState, Crest } from '../components/ui';

const RANK_COLORS = { 1: 'text-led', 2: 'text-main', 3: 'text-[#CD7F32]' };

export const Leaderboard = () => {
  const { clubs } = useClub();
  const { data, error, loading, reload } = useApi('/leaderboard');
  const clubOf = (id) => clubs.find((c) => c.id === id);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader icon={Trophy} title="Ranking de la liga de pronósticos"
        subtitle="3 puntos por marcador exacto y 1 punto por acertar ganador o empate. Los puntos se asignan automáticamente cuando el partido termina." />

      <Card className="overflow-hidden">
        {loading && <Loading label="Cargando ranking…" />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data && data.leaderboard.length === 0 && <EmptyState>Aún no hay participantes con puntos.</EmptyState>}
        {data && data.leaderboard.length > 0 && (
          <ol className="divide-y divide-hairline">
            {data.leaderboard.map((item) => {
              const club = clubOf(item.favoriteTeamId);
              return (
                <li key={item.userId} className={`px-4 sm:px-6 py-3 flex items-center justify-between gap-3 ${item.isMe ? 'bg-led/10 border-l-4 border-l-led' : ''}`}>
                  <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                    <span className={`font-scoreboard text-xl tabular-nums w-8 text-center ${RANK_COLORS[item.rank] || 'text-muted'}`}>
                      {String(item.rank).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs sm:text-sm font-semibold text-main truncate">{item.displayName}</span>
                        {item.isMe && <span className="bg-led text-pitch text-[9px] font-scoreboard uppercase px-1.5 py-0.5">Tú</span>}
                      </div>
                      <span className="text-[10px] font-mono text-muted flex items-center gap-1 mt-0.5">
                        {club ? <><Crest src={club.crest} size="w-3 h-3" /> {club.shortName}</> : 'Sin club'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6 text-right font-mono">
                    <div className="hidden sm:block"><span className="text-[10px] text-muted uppercase block">Exactos</span><span className="text-xs text-win font-bold tabular-nums">{item.exactHits}</span></div>
                    <div className="hidden sm:block"><span className="text-[10px] text-muted uppercase block">Aciertos</span><span className="text-xs text-main tabular-nums">{item.resultHits}</span></div>
                    <div className="bg-pitch border border-hairline px-3 py-1.5 min-w-[72px] text-center">
                      <span className="font-scoreboard text-xl text-led tabular-nums">{item.totalPoints}</span>
                      <span className="text-[9px] text-main ml-1 font-bold">PTS</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
};
