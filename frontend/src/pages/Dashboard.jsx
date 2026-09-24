import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Calendar, History, Newspaper, Sigma, Table2 } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useClub } from '../context/ClubContext';
import { MatchdayHeader } from '../components/MatchdayHeader';
import { MatchList } from '../components/MatchList';
import { StandingsTable } from '../components/StandingsTable';
import { PoissonPanel } from '../components/PoissonPanel';
import { MatchDetailModal } from '../components/MatchDetailModal';
import { NewsList } from '../components/NewsList';
import { Card, SectionTitle, Loading, ErrorState, DataMeta, EmptyState } from '../components/ui';
import { errorMessage } from '../utils/errors';

export const Dashboard = () => {
  const { club } = useClub();
  const matches = useApi(`/clubs/${club.id}/matches`);
  const standings = useApi(`/leagues/${club.league}/standings`);
  const news = useApi(`/clubs/${club.id}/news`);

  const [view, setView] = useState('upcoming');
  const [focusedId, setFocusedId] = useState(null);
  const [detailMatch, setDetailMatch] = useState(null);
  const closeDetail = useCallback(() => setDetailMatch(null), []);

  // Al cambiar de club se reinicia el partido en foco
  useEffect(() => { setFocusedId(null); setView('upcoming'); }, [club.id]);

  const next = matches.data?.next || null;
  const targetId = focusedId || next?.fixtureId || null;
  const prediction = useApi(targetId ? `/clubs/${club.id}/prediction` : null, targetId ? { fixtureId: targetId } : undefined);

  const upcoming = matches.data?.upcoming || [];
  const past = matches.data?.past || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {matches.loading && <Card><Loading label="Cargando partidos…" /></Card>}
      {matches.error && <Card><ErrorState error={matches.error} onRetry={matches.reload} title="No se pudieron cargar los partidos" /></Card>}
      {matches.data && <MatchdayHeader match={next} club={club} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div>
            <SectionTitle icon={Sigma} title="Pronóstico (modelo de Poisson)" right={prediction.data?.match && `${prediction.data.match.homeTeam.shortName} vs ${prediction.data.match.awayTeam.shortName}`} />
            <Card className="p-4">
              {!targetId && !matches.loading && <EmptyState>No hay un partido próximo para pronosticar.</EmptyState>}
              {prediction.loading && <Loading label="Calculando probabilidades…" />}
              {prediction.error && (
                <EmptyState>{errorMessage(prediction.error, 'El pronóstico no está disponible.')}</EmptyState>
              )}
              {prediction.data && <PoissonPanel prediction={prediction.data.prediction} />}
            </Card>
          </div>

          <div>
            <SectionTitle icon={Table2} title="Clasificación" accent="bg-win" />
            {standings.loading && <Card><Loading label="Cargando clasificación…" /></Card>}
            {standings.error && <Card><ErrorState error={standings.error} onRetry={standings.reload} /></Card>}
            {standings.data && <StandingsTable data={standings.data} clubId={club.id} />}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <Card className="p-4 space-y-3">
            <SectionTitle icon={Activity} title="Partidos de liga" right={matches.data && <DataMeta meta={matches.data.meta} />} />
            <div className="grid grid-cols-2 gap-1 border border-hairline bg-pitch p-1 text-xs font-mono" role="tablist">
              <button role="tab" aria-selected={view === 'upcoming'} onClick={() => setView('upcoming')}
                className={`py-1.5 flex items-center justify-center gap-1.5 uppercase font-semibold ${view === 'upcoming' ? 'bg-led text-pitch' : 'text-muted hover:text-main'}`}>
                <Calendar className="w-3.5 h-3.5" /> Próximos ({upcoming.length})
              </button>
              <button role="tab" aria-selected={view === 'past'} onClick={() => setView('past')}
                className={`py-1.5 flex items-center justify-center gap-1.5 uppercase font-semibold ${view === 'past' ? 'bg-led text-pitch' : 'text-muted hover:text-main'}`}>
                <History className="w-3.5 h-3.5" /> Jugados ({past.length})
              </button>
            </div>
            {matches.data?.partial && (
              <p className="text-[11px] text-loss font-mono">Parte del calendario no respondió; la lista puede estar incompleta.</p>
            )}
            {matches.data && (
              <div className="max-h-[560px] overflow-y-auto pr-1">
                <MatchList
                  matches={view === 'upcoming' ? upcoming : past}
                  type={view === 'upcoming' ? 'upcoming' : 'past'}
                  club={club}
                  focusedId={targetId}
                  onFocus={(m) => { setFocusedId(m.fixtureId); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  onDetail={setDetailMatch}
                />
              </div>
            )}
          </Card>

          <Card className="p-4">
            <SectionTitle icon={Newspaper} title={`Noticias de ${club.shortName}`} right={news.data && <DataMeta meta={news.data.meta} />} />
            {news.loading && <Loading label="Cargando noticias…" />}
            {news.error && <ErrorState error={news.error} onRetry={news.reload} />}
            {news.data && <NewsList articles={news.data.articles} />}
          </Card>
        </div>
      </div>

      {detailMatch && <MatchDetailModal match={detailMatch} onClose={closeDetail} />}
    </div>
  );
};
