import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PoissonBar } from '../components/PoissonBar';
import { Compass, CheckCircle2, Clock, Sparkles } from 'lucide-react';

export const Predictions = () => {
  const { user } = useAuth();
  const teamId = user?.favoriteTeamId || '65';

  const [nextMatches, setNextMatches] = useState([]);
  const [myPredictions, setMyPredictions] = useState([]);
  const [inputs, setInputs] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [message, setMessage] = useState('');
  const [poissonMap, setPoissonMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [matchesRes, myPredsRes] = await Promise.all([
          api.get(`/matches/next/${teamId}`),
          api.get('/predictions/my')
        ]);

        const matches = matchesRes.data?.data || [];
        setNextMatches(matches);
        setMyPredictions(myPredsRes.data?.predictions || []);

        // Precargar inputs si ya existen pronósticos
        const initialInputs = {};
        myPredsRes.data?.predictions?.forEach(p => {
          initialInputs[p.fixtureId] = {
            home: p.predictedHome,
            away: p.predictedAway
          };
        });
        setInputs(initialInputs);

        // Consultar Poisson para los partidos
        matches.slice(0, 3).forEach(async (m) => {
          try {
            const predRes = await api.get(`/predict/${m.fixtureId}`, {
              params: {
                homeTeam: m.homeTeam?.name,
                awayTeam: m.awayTeam?.name
              }
            });
            setPoissonMap(prev => ({ ...prev, [m.fixtureId]: predRes.data }));
          } catch (e) {
            // Ignorar
          }
        });
      } catch (err) {
        console.error('Error cargando predicciones:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teamId]);

  const handleInputChange = (fixtureId, side, value) => {
    const val = value === '' ? '' : parseInt(value, 10);
    setInputs(prev => ({
      ...prev,
      [fixtureId]: {
        ...prev[fixtureId],
        [side]: val
      }
    }));
  };

  const handleSubmitPrediction = async (fixtureId) => {
    const data = inputs[fixtureId];
    if (data?.home === undefined || data?.away === undefined || data.home === '' || data.away === '') {
      setMessage('Por favor introduce un marcador completo.');
      return;
    }

    setSubmitting(prev => ({ ...prev, [fixtureId]: true }));
    setMessage('');

    try {
      const res = await api.post('/predictions', {
        fixtureId,
        predictedHome: Number(data.home),
        predictedAway: Number(data.away)
      });

      setMessage('¡Pronóstico registrado con éxito! Competirás por hasta 3 puntos en el leaderboard.');

      // Refrescar lista de pronósticos
      const myPredsRes = await api.get('/predictions/my');
      setMyPredictions(myPredsRes.data?.predictions || []);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Error al enviar pronóstico.');
    } finally {
      setSubmitting(prev => ({ ...prev, [fixtureId]: false }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="border border-hairline bg-surface p-6 sm:p-8">
        <div className="flex items-center space-x-3 mb-2">
          <Compass className="w-5 h-5 text-led" />
          <h1 className="text-xl sm:text-2xl font-scoreboard uppercase text-main tracking-wide">
            Liga Comunitaria de Pronósticos
          </h1>
        </div>
        <p className="text-xs font-mono text-muted uppercase tracking-wider max-w-2xl">
          Acierta marcadores oficiales para acumular puntos en el ranking global.
          Marcador exacto otorga <span className="text-led font-bold">3 puntos</span>; acertar el ganador/empate otorga <span className="text-win font-bold">1 punto</span>.
        </p>

        {message && (
          <div className="mt-4 p-3 bg-led/10 border border-led text-xs font-mono text-main flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-led flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upcoming matches to predict */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-led"></span>
            <h2 className="font-scoreboard uppercase tracking-wider text-sm text-main">
              Partidos Disponibles para Pronosticar
            </h2>
          </div>

          {loading ? (
            <p className="text-muted font-mono text-xs py-8 text-center">Cargando partidos...</p>
          ) : nextMatches.length === 0 ? (
            <div className="border border-hairline bg-surface p-6 text-center font-mono text-xs text-muted">
              No hay partidos próximos disponibles en este momento.
            </div>
          ) : (
            nextMatches.map((m) => {
              const currentInput = inputs[m.fixtureId] || { home: '', away: '' };
              const isSubmitting = submitting[m.fixtureId];
              const pEngine = poissonMap[m.fixtureId];
              const alreadyPredicted = myPredictions.find(p => p.fixtureId === m.fixtureId);

              return (
                <div key={m.fixtureId} className="border border-hairline bg-surface p-5 space-y-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted border-b border-hairline pb-2">
                    <span className="uppercase font-semibold text-main">{m.competition}</span>
                    <span>{new Date(m.utcDate).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>

                  {/* Match Matchup & Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-11 items-center gap-4 py-2">
                    {/* Home Team */}
                    <div className="sm:col-span-4 flex items-center space-x-3 justify-start sm:justify-end text-left sm:text-right">
                      <span className="font-scoreboard uppercase text-sm text-main truncate">
                        {m.homeTeam?.name}
                      </span>
                      {m.homeTeam?.crest && (
                        <img src={m.homeTeam.crest} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
                      )}
                    </div>

                    {/* Inputs */}
                    <div className="sm:col-span-3 flex items-center justify-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={currentInput.home}
                        onChange={(e) => handleInputChange(m.fixtureId, 'home', e.target.value)}
                        placeholder="0"
                        className="w-12 h-12 bg-pitch border border-hairline text-center font-scoreboard text-xl text-led tabular-nums focus:border-led focus:outline-none"
                      />
                      <span className="font-scoreboard text-muted text-xl">:</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={currentInput.away}
                        onChange={(e) => handleInputChange(m.fixtureId, 'away', e.target.value)}
                        placeholder="0"
                        className="w-12 h-12 bg-pitch border border-hairline text-center font-scoreboard text-xl text-led tabular-nums focus:border-led focus:outline-none"
                      />
                    </div>

                    {/* Away Team */}
                    <div className="sm:col-span-4 flex items-center space-x-3 justify-start text-left">
                      {m.awayTeam?.crest && (
                        <img src={m.awayTeam.crest} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
                      )}
                      <span className="font-scoreboard uppercase text-sm text-main truncate">
                        {m.awayTeam?.name}
                      </span>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between pt-3 border-t border-hairline-subtle">
                    <span className="text-[11px] font-mono text-muted">
                      {alreadyPredicted
                        ? `Tu pronóstico guardado: ${alreadyPredicted.predictedHome} - ${alreadyPredicted.predictedAway}`
                        : 'Sin pronóstico registrado'}
                    </span>
                    <button
                      onClick={() => handleSubmitPrediction(m.fixtureId)}
                      disabled={isSubmitting}
                      className="bg-led hover:bg-yellow-400 text-pitch font-scoreboard uppercase px-4 py-1.5 text-xs tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? 'Guardando...' : alreadyPredicted ? 'Actualizar Marcador' : 'Registrar Marcador'}
                    </button>
                  </div>

                  {/* Poisson helper preview if available */}
                  {pEngine && (
                    <div className="pt-2">
                      <div className="p-2.5 bg-pitch/50 border border-hairline-subtle text-[11px] font-mono text-muted flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-main">
                          <Sparkles className="w-3 h-3 text-led" />
                          Sugerencia Poisson: <strong className="text-led">{pEngine.mostLikelyScore.home} - {pEngine.mostLikelyScore.away}</strong>
                        </span>
                        <span>{pEngine.overUnder25.prediction}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: User's History */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-led" />
            <h2 className="font-scoreboard uppercase tracking-wider text-sm text-main">
              Mis Pronósticos Registrados
            </h2>
          </div>

          <div className="border border-hairline bg-surface p-5">
            {myPredictions.length === 0 ? (
              <p className="text-muted font-mono text-xs py-6 text-center">Aún no has registrado ningún pronóstico.</p>
            ) : (
              <div className="divide-y divide-hairline-subtle">
                {myPredictions.map((p) => (
                  <div key={p._id || p.fixtureId} className="py-3 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-muted block uppercase">Partido ID: {p.fixtureId}</span>
                      <span className="text-main font-semibold">
                        Pronóstico: <span className="text-led font-scoreboard text-sm">{p.predictedHome} - {p.predictedAway}</span>
                      </span>
                    </div>

                    <div className="text-right">
                      {p.resolved ? (
                        <div className="bg-surface-subtle px-2.5 py-1 border border-hairline">
                          <span className="text-[10px] text-muted block uppercase">Puntos</span>
                          <span className="font-scoreboard text-base text-win font-bold">+{p.pointsAwarded} PTS</span>
                        </div>
                      ) : (
                        <span className="text-[10px] uppercase font-semibold text-muted bg-pitch px-2 py-1 border border-hairline">
                          Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};