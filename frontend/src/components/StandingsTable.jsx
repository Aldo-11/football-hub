import React from 'react';

export const StandingsTable = ({ standings, competitionName, userTeamId }) => {
  if (!standings || standings.length === 0) {
    return (
      <div className="p-6 border border-hairline bg-surface text-center font-mono text-xs text-muted">
        Cargando tabla de posiciones oficial...
      </div>
    );
  }

  return (
    <div className="border border-hairline bg-surface overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-hairline flex items-center justify-between bg-surface-subtle">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-win"></span>
          <h3 className="font-scoreboard uppercase tracking-wider text-sm text-main">
            {competitionName || 'Clasificación Oficial'}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-win uppercase tracking-widest font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-win animate-pulse"></span>
          Temporada 2026/2027 • En Curso
        </span>
      </div>

      {/* Real Table with Hairlines */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-hairline text-[11px] font-mono uppercase tracking-wider text-muted bg-pitch/40">
              <th className="py-2.5 px-3 text-center w-10">#</th>
              <th className="py-2.5 px-3">Club</th>
              <th className="py-2.5 px-3 text-right">PJ</th>
              <th className="py-2.5 px-3 text-right hidden sm:table-cell">G</th>
              <th className="py-2.5 px-3 text-right hidden sm:table-cell">E</th>
              <th className="py-2.5 px-3 text-right hidden sm:table-cell">P</th>
              <th className="py-2.5 px-3 text-right">DG</th>
              <th className="py-2.5 px-3 text-right font-bold text-main">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-subtle text-xs font-mono">
            {standings.map((row) => {
              const isUserTeam = String(row.team?.id) === String(userTeamId);
              const rank = Number(row.position);
              const isChampions = rank <= 4;
              const isRelegation = rank >= standings.length - 2;

              return (
                <tr
                  key={row.team?.id || row.position}
                  className={`hover:bg-surface-hover transition-colors ${
                    isUserTeam ? 'bg-led/10 text-main font-semibold' : 'text-main/90'
                  }`}
                >
                  <td className="py-2 px-3 text-center tabular-nums">
                    <span
                      className={`inline-block w-6 text-center py-0.5 text-[11px] ${
                        isChampions ? 'text-win font-bold' : isRelegation ? 'text-loss font-bold' : 'text-muted'
                      }`}
                    >
                      {String(row.position).padStart(2, '0')}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center space-x-2.5">
                      {row.team?.crest && (
                        <img
                          src={row.team.crest}
                          alt=""
                          className="w-4 h-4 object-contain flex-shrink-0"
                        />
                      )}
                      <span className="truncate max-w-[140px] sm:max-w-none text-main">
                        {row.team?.name}
                      </span>
                      {isUserTeam && (
                        <span className="text-[9px] uppercase px-1 py-0.2 bg-led text-pitch font-scoreboard tracking-wider">
                          Tu Club
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted">{row.playedGames}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted hidden sm:table-cell">{row.won}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted hidden sm:table-cell">{row.draw}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted hidden sm:table-cell">{row.lost}</td>
                  <td className={`py-2 px-3 text-right tabular-nums font-semibold ${row.goalDifference > 0 ? 'text-win' : row.goalDifference < 0 ? 'text-loss' : 'text-muted'}`}>
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums font-bold text-main font-scoreboard text-sm">
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend Footer */}
      <div className="px-4 py-2 border-t border-hairline flex items-center justify-between text-[10px] font-mono text-muted bg-pitch/30">
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-win inline-block"></span>
            Champions League
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-loss inline-block"></span>
            Descenso
          </span>
        </div>
        <span>Caché sincronizada (1h)</span>
      </div>
    </div>
  );
};