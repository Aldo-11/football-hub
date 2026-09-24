import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MatchdayHeader } from '../components/MatchdayHeader';
import { PoissonBar } from '../components/PoissonBar';
import { StandingsTable } from '../components/StandingsTable';
import { MatchDetailModal } from '../components/MatchDetailModal';
import { Newspaper, ChevronRight, History, Calendar, Eye, Sparkles, Activity, Shield } from 'lucide-react';

// Mapeo completo de equipos a su liga para auto-detección (Temporada Oficial 2026/2027)
const TEAM_LEAGUE_MAP = {
  // Premier League
  '65': 'PL', '64': 'PL', '57': 'PL', '66': 'PL', '61': 'PL', '73': 'PL', '67': 'PL', '58': 'PL',
  '107': 'PL', '402': 'PL', '341': 'PL', '62': 'PL', '322': 'PL', '349': 'PL', '1044': 'PL',
  '354': 'PL', '351': 'PL', '63': 'PL', '71': 'PL', '1076': 'PL',
  // La Liga
  '86': 'PD', '81': 'PD', '78': 'PD', '77': 'PD', '90': 'PD', '94': 'PD', '92': 'PD', '559': 'PD',
  '87': 'PD', '558': 'PD', '95': 'PD', '79': 'PD', '89': 'PD', '82': 'PD', '298': 'PD', '263': 'PD',
  '80': 'PD', '275': 'PD', '745': 'PD', '250': 'PD',
  // Bundesliga
  '5': 'BL1', '4': 'BL1', '3': 'BL1', '721': 'BL1', '17': 'BL1', '16': 'BL1', '19': 'BL1', '10': 'BL1',
  // Serie A
  '108': 'SA', '109': 'SA', '98': 'SA', '100': 'SA', '110': 'SA', '104': 'SA', '113': 'SA', '102': 'SA',
  // Ligue 1
  '524': 'FL1', '548': 'FL1', '523': 'FL1', '683': 'FL1', '521': 'FL1', '529': 'FL1', '516': 'FL1', '546': 'FL1'
};

const LEAGUE_NAMES = {
  PL: 'Premier League', PD: 'LaLiga EA Sports', BL1: 'Bundesliga', SA: 'Serie A', FL1: 'Ligue 1'
};

export const Dashboard = ({ onNavigateToPredictions }) => {
  const { user } = useAuth();
  const teamId = user?.favoriteTeamId || '65';
  const teamLeague = TEAM_LEAGUE_MAP[teamId] || 'PL';

  const [nextMatches, setNextMatches] = useState([]);
  const [lastMatches, setLastMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pestaña activa del Centro de Partidos: 'upcoming' (futuros) o 'past' (anteriores)
  const [fixtureView, setFixtureView] = useState('upcoming');

  // Modal de Detalle de Partido (Radar 5 ejes, alineaciones, xG)
  const [modalMatch, setModalMatch] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Cargar 10 Próximos y 10 Últimos Partidos del club
        const [nextRes, lastRes] = await Promise.all([
          api.get(`/matches/next/${teamId}`),
          api.get(`/matches/last/${teamId}`)
        ]);

        const nextList = nextRes.data?.data || [];
        const lastList = lastRes.data?.data || [];
        setNextMatches(nextList);
        setLastMatches(lastList);

        // 3. Tabla de Posiciones de la Temporada 2026/2027 (solo de la liga del equipo seleccionado)
        const standingsRes = await api.get(`/matches/standings/${teamLeague}`);
        const loadedStandings = standingsRes.data?.data?.standings || [];
        setStandings(loadedStandings);

        // Encuentro en foco inicial (el más próximo)
        const initialMatch = nextList[0] || null;
        setSelectedMatch(initialMatch);

        // 2. Pronóstico Poisson dinámico para el partido inicial
        if (initialMatch) {
          fetchPrediction(initialMatch, loadedStandings);
        }

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
  }, [teamId, teamLeague]);

  const fetchPrediction = async (targetMatch, currentStandings = standings) => {
    try {
      const homeName = targetMatch.homeTeam?.name || '';
      const awayName = targetMatch.awayTeam?.name || '';

      const list = currentStandings && currentStandings.length > 0 ? currentStandings : standings;
      const homeStanding = list.find(s =>
        (targetMatch.homeTeam?.id && s.team?.id === targetMatch.homeTeam.id) ||
        (s.team?.name && homeName.toLowerCase().includes(s.team.name.toLowerCase())) ||
        (s.team?.shortName && homeName.toLowerCase().includes(s.team.shortName.toLowerCase()))
      );
      const awayStanding = list.find(s =>
        (targetMatch.awayTeam?.id && s.team?.id === targetMatch.awayTeam.id) ||
        (s.team?.name && awayName.toLowerCase().includes(s.team.name.toLowerCase())) ||
        (s.team?.shortName && awayName.toLowerCase().includes(s.team.shortName.toLowerCase()))
      );

      const params = {
        homeTeam: homeName,
        awayTeam: awayName
      };

      if (homeStanding && homeStanding.playedGames > 0) {
        params.homeScored = (homeStanding.goalsFor / homeStanding.playedGames).toFixed(2);
        params.homeConceded = (homeStanding.goalsAgainst / homeStanding.playedGames).toFixed(2);
      }
      if (awayStanding && awayStanding.playedGames > 0) {
        params.awayScored = (awayStanding.goalsFor / awayStanding.playedGames).toFixed(2);
        params.awayConceded = (awayStanding.goalsAgainst / awayStanding.playedGames).toFixed(2);
      }

      const predRes = await api.get(`/predict/${targetMatch.fixtureId}`, { params });
      setPrediction(predRes.data);
    } catch (err) {
      console.error('Error al calcular pronóstico Poisson:', err);
    }
  };

  const handleSelectMatchFocus = (m) => {
    setSelectedMatch(m);
    fetchPrediction(m, standings);
    // Desplazar suavemente hacia el banner principal
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const primaryMatch = selectedMatch || nextMatches[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Scoreboard Banner Principal */}
      <MatchdayHeader match={primaryMatch} userTeamName={primaryMatch?.homeTeam?.name} />

      {/* Grid Principal: Columna Izquierda (Poisson & Posiciones) | Columna Derecha (Centro de Partidos & Noticias) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Columna Izquierda (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Módulo de Inteligencia Predictiva Poisson */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-led"></span>
                <h3 className="font-scoreboard uppercase tracking-wider text-sm text-main">
                  Inteligencia Predictiva (Algoritmo de Poisson)
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

          {/* Tabla de Posiciones Oficial 2026/2027 (Solo la liga del club) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-win"></span>
                <h3 className="font-scoreboard uppercase tracking-wider text-sm text-main">
                  Tabla de Posiciones Oficial
                </h3>
              </div>

              <span className="text-[11px] font-mono text-muted uppercase tracking-wider">
                {LEAGUE_NAMES[teamLeague] || teamLeague}
              </span>
            </div>

            <StandingsTable
              standings={standings}
              competitionName={LEAGUE_NAMES[teamLeague] || 'Liga'}
              userTeamId={teamId}
            />
          </div>
        </div>

        {/* Columna Derecha (5 cols) */}
        <div className="lg:col-span-5 space-y-8">
          {/* CENTRO DE PARTIDOS (10 Próximos / 10 Anteriores) */}
          <div className="border border-hairline bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-led" />
                <h3 className="font-scoreboard uppercase tracking-wider text-sm text-main">
                  Centro de Partidos
                </h3>
              </div>
              <span className="text-[10px] font-mono text-muted uppercase">
                {fixtureView === 'upcoming' ? `${nextMatches.length} Próximos` : `${lastMatches.length} Jugados`}
              </span>
            </div>

            {/* Selector de Pestañas: Próximos vs Pasados */}
            <div className="grid grid-cols-2 gap-1 border border-hairline bg-pitch p-1 text-xs font-mono">
              <button
                onClick={() => setFixtureView('upcoming')}
                className={`py-1.5 px-2 text-center uppercase font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  fixtureView === 'upcoming'
                    ? 'bg-led text-pitch font-bold shadow-sm'
                    : 'text-muted hover:text-main'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Próximos ({nextMatches.length})</span>
              </button>

              <button
                onClick={() => setFixtureView('past')}
                className={`py-1.5 px-2 text-center uppercase font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  fixtureView === 'past'
                    ? 'bg-led text-pitch font-bold shadow-sm'
                    : 'text-muted hover:text-main'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Pasados ({lastMatches.length})</span>
              </button>
            </div>

            {/* Lista de Partidos según la Pestaña Activa */}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {fixtureView === 'upcoming' ? (
                /* ─── Pestaña 1: Próximos Partidos (Futuros) ─── */
                nextMatches.length === 0 ? (
                  <p className="text-muted font-mono text-xs py-8 text-center">No hay encuentros programados</p>
                ) : (
                  nextMatches.map((m, idx) => {
                    const isFocused = primaryMatch?.fixtureId === m.fixtureId;
                    const matchDate = new Date(m.utcDate);
                    const formattedDate = matchDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                    const localTime = matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                    const cetTime = matchDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid', hour12: false });

                    return (
                      <div
                        key={m.fixtureId || idx}
                        className={`p-3 border transition-colors ${
                          isFocused
                            ? 'bg-surface-subtle border-led/60'
                            : 'bg-pitch/60 border-hairline-subtle hover:border-hairline'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-muted mb-2">
                          <span className="uppercase text-led font-semibold">{m.competition}</span>
                          <span>{formattedDate} • {localTime} (Tu zona) / {cetTime} CET</span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono mb-3">
                          <div className="flex-1 truncate mr-2">
                            <div className="flex items-center space-x-2">
                              {m.homeTeam?.crest && (
                                <img src={m.homeTeam.crest} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                              )}
                              <span className={`truncate ${m.homeTeam?.id === teamId ? 'text-win font-bold' : 'text-main'}`}>
                                {m.homeTeam?.shortName || m.homeTeam?.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              {m.awayTeam?.crest && (
                                <img src={m.awayTeam.crest} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                              )}
                              <span className={`truncate ${m.awayTeam?.id === teamId ? 'text-win font-bold' : 'text-main'}`}>
                                {m.awayTeam?.shortName || m.awayTeam?.name}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="px-2 py-0.5 bg-surface text-led text-[10px] border border-hairline font-bold block uppercase">
                              Programado
                            </span>
                          </div>
                        </div>

                        {/* Botón de Acción Exclusivo para Futuros: Enfocar / Analizar con Poisson */}
                        <div className="pt-2 border-t border-hairline-subtle text-[11px] font-mono">
                          <button
                            onClick={() => handleSelectMatchFocus(m)}
                            className={`w-full py-1.5 px-3 text-center uppercase tracking-wider text-[11px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                              isFocused
                                ? 'bg-led text-pitch border-led shadow-sm'
                                : 'bg-surface hover:bg-surface-hover text-main border-hairline'
                            }`}
                          >
                            {isFocused ? '★ Partido en Foco de Análisis' : '⚡ Analizar con Poisson'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                /* ─── Pestaña 2: Partidos Anteriores (Pasados) ─── */
                lastMatches.length === 0 ? (
                  <p className="text-muted font-mono text-xs py-8 text-center">No hay registros de partidos previos</p>
                ) : (
                  lastMatches.map((m, idx) => {
                    const matchDate = new Date(m.utcDate);
                    const formattedDate = matchDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

                    const homeScore = m.score?.fullTime?.home ?? 0;
                    const awayScore = m.score?.fullTime?.away ?? 0;
                    const isUserHome = m.homeTeam?.id === teamId;
                    const userWon = isUserHome ? homeScore > awayScore : awayScore > homeScore;
                    const isDraw = homeScore === awayScore;

                    return (
                      <div
                        key={m.fixtureId || idx}
                        className="p-3 bg-pitch/60 border border-hairline-subtle hover:border-hairline transition-colors"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-muted mb-2">
                          <span className="uppercase text-muted">{m.competition}</span>
                          <div className="flex items-center gap-2">
                            <span>{formattedDate}</span>
                            <span className={`px-1.5 py-0.2 text-[9px] uppercase font-bold border ${
                              isDraw
                                ? 'bg-surface text-muted border-hairline'
                                : userWon
                                ? 'bg-win/20 text-win border-win/40'
                                : 'bg-loss/20 text-loss border-loss/40'
                            }`}>
                              {isDraw ? 'Empate' : userWon ? 'Victoria' : 'Derrota'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between font-mono text-xs mb-2">
                          <div className="flex-1 truncate mr-2">
                            <div className="flex items-center space-x-2">
                              {m.homeTeam?.crest && (
                                <img src={m.homeTeam.crest} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                              )}
                              <span className={`truncate ${isUserHome ? 'text-win font-bold' : 'text-main'}`}>
                                {m.homeTeam?.shortName || m.homeTeam?.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              {m.awayTeam?.crest && (
                                <img src={m.awayTeam.crest} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                              )}
                              <span className={`truncate ${!isUserHome ? 'text-win font-bold' : 'text-main'}`}>
                                {m.awayTeam?.shortName || m.awayTeam?.name}
                              </span>
                            </div>
                          </div>

                          {/* Marcador Final */}
                          <div className="bg-surface px-3 py-1.5 border border-hairline text-center">
                            <span className="font-scoreboard text-base text-main tabular-nums block">
                              {homeScore} : {awayScore}
                            </span>
                            <span className="text-[9px] text-win block uppercase font-bold">Final</span>
                          </div>
                        </div>

                        {/* Botón de Estadísticas y Alineación para Partidos Pasados */}
                        <div className="pt-2 border-t border-hairline-subtle">
                          <button
                            onClick={() => setModalMatch(m)}
                            className="w-full py-1.5 px-3 bg-surface hover:bg-surface-hover text-led hover:text-main border border-hairline text-[11px] font-mono uppercase font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-led" />
                            <span>Ver Estadísticas y Alineación Oficial</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

          {/* Feed de Noticias */}
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

      {/* Modal de Centro de Partido (Radar, Alineaciones, Estadísticas) */}
      {modalMatch && (
        <MatchDetailModal match={modalMatch} onClose={() => setModalMatch(null)} />
      )}
    </div>
  );
};