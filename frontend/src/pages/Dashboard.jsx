import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MatchdayHeader } from '../components/MatchdayHeader';
import { PoissonBar } from '../components/PoissonBar';
import { StandingsTable } from '../components/StandingsTable';
import { Newspaper, ChevronRight, History, ExternalLink } from 'lucide-react';

export const Dashboard = ({ onNavigateToPredictions }) => {
  const { user } = useAuth();
  const teamId = user?.favoriteTeamId || '65';

  const [nextMatches, setNextMatches] = useState([]);
  const [lastMatches, setLastMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [currentLeague, setCurrentLeague] = useState('PL');
  const [prediction, setPrediction] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Próximos y últimos partidos
        const [nextRes, lastRes] = await Promise.all([
          api.get(`/matches/next/${teamId}`),
          api.get(`/matches/last/${teamId}`)
        ]);

        const nextList = nextRes.data?.data || [];
        const lastList = lastRes.data?.data || [];
        setNextMatches(nextList);
        setLastMatches(lastList);

        // 2. Si hay próximo partido, obtener pronóstico de Poisson
        const targetMatch = nextList[0];
        if (targetMatch) {
          const predRes = await api.get(`/predict/${targetMatch.fixtureId}`, {
            params: {
              homeTeam: targetMatch.homeTeam?.name,
              awayTeam: targetMatch.awayTeam?.name
            }
          });
          setPrediction(predRes.data);
        }

        // 3. Tabla de Posiciones
        const standingsRes = await api.get(`/matches/standings/${currentLeague}`);
        setStandings(standingsRes.data?.data?.standings || []);

        // 4. Feed de Noticias
        const newsRes = await api.get(`/news/${teamId}`);
        setNews(newsRes.data?.news || []);
      } catch (err) {
        console.error('Error cargando dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [teamId, currentLeague]);

  const primaryMatch = nextMatches[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Fixed Top Matchday Scoreboard Banner */}
      <MatchdayHeader match={primaryMatch} userTeamName={primaryMatch?.homeTeam?.name} />

      {/* Main Grid: Left (Poisson & Standings) | Right (Recent Results & News) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Poisson Prediction Module */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-led"></span>
                <h3 className="font-scoreboard uppercase tracking-wider text-sm text-main">
                  Inteligencia Predictiva
                </h3>
              </div>
              <button
                onClick={onNavigateToPredictions}
                className="text-[11px] font-mono uppercase text-led hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Hacer mi pronóstico</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <PoissonBar prediction={prediction} />
          </div>

          {/* Standings Table Module */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-win"></span>
                <h3 className="font-scoreboard uppercase tracking-wider text-sm text-main">
                  Tabla de Posiciones
                </h3>
              </div>

              {/* League Selector Tabs */}
              <div className="flex items-center space-x-1 border border-hairline bg-surface p-0.5 text-[10px] font-mono">
                {['PL', 'PD', 'BL1', 'SA', 'FL1'].map((code) => (
                  <button
                    key={code}
                    onClick={() => setCurrentLeague(code)}
                    className={`px-2 py-1 uppercase font-semibold transition-colors cursor-pointer ${
                      currentLeague === code ? 'bg-led text-pitch' : 'text-muted hover:text-main'
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <StandingsTable
              standings={standings}
              competitionName={currentLeague === 'PD' ? 'LaLiga EA Sports' : 'Premier League'}
              userTeamId={teamId}
            />
          </div>
        </div>

        {/* Right Column (5 cols) */}
        <div className="lg:col-span-5 space-y-8">
          {/* Last Results Card */}
          <div className="border border-hairline bg-surface p-5">
            <div className="flex items-center space-x-2 border-b border-hairline pb-3 mb-4">
              <History className="w-4 h-4 text-led" />
              <h3 className="font-scoreboard uppercase tracking-wider text-sm text-main">
                Marcadores Anteriores
              </h3>
            </div>

            {lastMatches.length === 0 ? (
              <p className="text-muted font-mono text-xs py-4 text-center">No hay registros de partidos previos</p>
            ) : (
              <div className="space-y-3">
                {lastMatches.map((m) => (
                  <div
                    key={m.fixtureId}
                    className="p-3 bg-pitch/60 border border-hairline-subtle flex items-center justify-between font-mono text-xs"
                  >
                    <div className="flex-1 truncate mr-2">
                      <span className="text-[10px] text-muted block uppercase">{m.competition}</span>
                      <span className="text-main font-semibold truncate block">
                        {m.homeTeam?.shortName || m.homeTeam?.name} vs {m.awayTeam?.shortName || m.awayTeam?.name}
                      </span>
                    </div>
                    <div className="bg-surface px-3 py-1.5 border border-hairline text-center">
                      <span className="font-scoreboard text-base text-main tabular-nums">
                        {m.score?.fullTime?.home ?? '-'} : {m.score?.fullTime?.away ?? '-'}
                      </span>
                      <span className="text-[9px] text-win block uppercase font-bold">Final</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dual Unified News Feed */}
          <div className="border border-hairline bg-surface p-5">
            <div className="flex items-center space-x-2 border-b border-hairline pb-3 mb-4">
              <Newspaper className="w-4 h-4 text-led" />
              <h3 className="font-scoreboard uppercase tracking-wider text-sm text-main">
                Titulares y Actualidad (Feed Dual)
              </h3>
            </div>

            {news.length === 0 ? (
              <p className="text-muted font-mono text-xs py-4 text-center">Sin noticias recientes disponibles</p>
            ) : (
              <div className="space-y-4">
                {news.slice(0, 4).map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 border border-hairline-subtle bg-pitch/40 hover:bg-surface-hover transition-colors group"
                  >
                    <div className="flex items-start space-x-3">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="w-16 h-16 object-cover flex-shrink-0 border border-hairline"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[10px] font-mono text-muted mb-1">
                          <span className="text-led font-semibold uppercase">{item.source}</span>
                          <span>{new Date(item.publishedAt).toLocaleDateString('es-ES')}</span>
                        </div>
                        <h4 className="text-xs font-semibold text-main line-clamp-2 group-hover:text-led transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-[11px] font-mono text-muted line-clamp-1 mt-1">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};