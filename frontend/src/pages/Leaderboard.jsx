import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Trophy, Medal, Target, CheckCircle } from 'lucide-react';

export const Leaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api.get('/leaderboard');
        setLeaderboard(res.data?.leaderboard || []);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="border border-hairline bg-surface p-6 sm:p-8">
        <div className="flex items-center space-x-3 mb-2">
          <Trophy className="w-5 h-5 text-led" />
          <h1 className="text-xl sm:text-2xl font-scoreboard uppercase text-main tracking-wide">
            Ranking Global de la Liga de Pronósticos
          </h1>
        </div>
        <p className="text-xs font-mono text-muted uppercase tracking-wider max-w-2xl">
          Clasificación oficial en vivo. Sistema de puntuación: 3 puntos por marcador exacto acertado, 1 punto por acierto de ganador o empate.
        </p>
      </div>

      {/* Main Leaderboard: Real Numbered Scoreboard List */}
      <div className="border border-hairline bg-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-hairline bg-surface-subtle flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Medal className="w-4 h-4 text-led" />
            <h2 className="font-scoreboard uppercase tracking-wider text-sm text-main">
              Tabla de Posiciones Comunitaria
            </h2>
          </div>
          <span className="text-[11px] font-mono text-muted uppercase">
            Participantes Activos: {leaderboard.length}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted font-mono text-xs uppercase">
            Cargando ranking en tiempo real...
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-8 text-center text-muted font-mono text-xs">
            Aún no hay puntuaciones registradas en la liga. ¡Sé el primero en pronosticar!
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {leaderboard.map((item) => {
              const isCurrentUser = String(item.userId) === String(user?.id);
              const rankNum = parseInt(item.rank, 10);
              const isPodium = rankNum <= 3;

              return (
                <div
                  key={item.userId}
                  className={`px-6 py-4 flex items-center justify-between transition-colors ${
                    isCurrentUser
                      ? 'bg-led/10 border-l-4 border-l-led'
                      : 'hover:bg-surface-hover'
                  }`}
                >
                  {/* Left: Scoreboard Rank + User */}
                  <div className="flex items-center space-x-4 sm:space-x-6 min-w-0">
                    {/* Numbered Rank Display (01, 02, 03...) */}
                    <div
                      className={`font-scoreboard text-xl sm:text-2xl tabular-nums w-10 text-center ${
                        rankNum === 1
                          ? 'text-led'
                          : rankNum === 2
                          ? 'text-main'
                          : rankNum === 3
                          ? 'text-[#CD7F32]'
                          : 'text-muted'
                      }`}
                    >
                      {item.rank}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs sm:text-sm font-semibold text-main truncate">
                          {item.displayName}
                        </span>
                        {isCurrentUser && (
                          <span className="bg-led text-pitch text-[9px] font-scoreboard uppercase px-1.5 py-0.5 tracking-wider">
                            Tú
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-muted block mt-0.5">
                        Club Seguido: {item.favoriteTeamId ? `ID #${item.favoriteTeamId}` : 'Sin club asignado'}
                      </span>
                    </div>
                  </div>

                  {/* Right: Stats and Total Points */}
                  <div className="flex items-center space-x-4 sm:space-x-8 text-right">
                    {/* Exact Hits */}
                    <div className="hidden sm:block text-center font-mono">
                      <span className="text-[10px] text-muted uppercase block">Exactos (3pts)</span>
                      <span className="text-xs text-win font-bold tabular-nums">
                        {item.exactHits}
                      </span>
                    </div>

                    {/* Result Hits */}
                    <div className="hidden sm:block text-center font-mono">
                      <span className="text-[10px] text-muted uppercase block">Aciertos (1pt)</span>
                      <span className="text-xs text-main font-semibold tabular-nums">
                        {item.resultHits}
                      </span>
                    </div>

                    {/* Total Points Big Display */}
                    <div className="bg-pitch border border-hairline px-4 py-2 min-w-[80px] sm:min-w-[100px] text-center">
                      <span className="text-[9px] font-mono text-muted uppercase tracking-widest block">Total</span>
                      <span className="font-scoreboard text-xl sm:text-2xl text-led tabular-nums">
                        {item.totalPoints}
                      </span>
                      <span className="text-[9px] font-mono text-main ml-1 font-bold">PTS</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};