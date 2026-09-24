import React from 'react';
import { Crest, DataMeta } from './ui';

/**
 * Clasificación completa de la liga del club. Las zonas de color salen de la
 * configuración de la liga (backend), no están fijas en el componente.
 */
export const StandingsTable = ({ data, clubId }) => {
  const { rows, league, season, meta, complete } = data;
  const n = rows.length;
  const ucl = league.zones.championsLeague;
  const rel = league.zones.relegation;

  return (
    <div className="border border-hairline bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-hairline flex flex-wrap items-center justify-between gap-2 bg-surface-subtle">
        <h3 className="font-scoreboard uppercase tracking-wider text-sm text-main">{league.name}</h3>
        <span className="text-[10px] font-mono text-muted uppercase">Temporada {season} · {n} equipos</span>
      </div>
      {!complete && (
        <p className="px-4 py-2 text-[11px] text-loss font-mono border-b border-hairline">
          La fuente devolvió {n} de {league.expectedTeams} equipos; la tabla puede estar incompleta.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <caption className="sr-only">Clasificación de {league.name}</caption>
          <thead>
            <tr className="border-b border-hairline text-[11px] uppercase tracking-wider text-muted bg-pitch/40">
              <th scope="col" className="py-2 px-2 text-center w-8">#</th>
              <th scope="col" className="py-2 px-2">Club</th>
              <th scope="col" className="py-2 px-2 text-right" title="Partidos jugados">PJ</th>
              <th scope="col" className="py-2 px-2 text-right hidden sm:table-cell" title="Ganados">G</th>
              <th scope="col" className="py-2 px-2 text-right hidden sm:table-cell" title="Empatados">E</th>
              <th scope="col" className="py-2 px-2 text-right hidden sm:table-cell" title="Perdidos">P</th>
              <th scope="col" className="py-2 px-2 text-right hidden md:table-cell" title="Goles a favor : en contra">GF:GC</th>
              <th scope="col" className="py-2 px-2 text-right" title="Diferencia de goles">DG</th>
              <th scope="col" className="py-2 px-2 text-right text-main">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-subtle">
            {rows.map((row) => {
              const mine = row.clubId && row.clubId === clubId;
              const zone = row.position <= ucl ? 'border-l-win' : row.position > n - rel ? 'border-l-loss' : 'border-l-transparent';
              return (
                <tr key={row.team.espnId} className={`border-l-2 ${zone} ${mine ? 'bg-led/10 font-semibold' : ''}`}>
                  <td className="py-1.5 px-2 text-center tabular-nums text-muted">{row.position}</td>
                  <td className="py-1.5 px-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Crest src={row.team.crest} size="w-4 h-4" />
                      <span className="truncate text-main max-w-[130px] sm:max-w-none">{row.team.name}</span>
                      {mine && <span className="text-[9px] uppercase px-1 bg-led text-pitch font-scoreboard">Tu club</span>}
                    </div>
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-muted">{row.playedGames}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-muted hidden sm:table-cell">{row.won}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-muted hidden sm:table-cell">{row.draw}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-muted hidden sm:table-cell">{row.lost}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-muted hidden md:table-cell">{row.goalsFor}:{row.goalsAgainst}</td>
                  <td className={`py-1.5 px-2 text-right tabular-nums ${row.goalDifference > 0 ? 'text-win' : row.goalDifference < 0 ? 'text-loss' : 'text-muted'}`}>
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums font-scoreboard text-sm text-main">{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-hairline flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-muted bg-pitch/30">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-win inline-block" />Top {ucl}: Champions</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-loss inline-block" />Descenso ({rel})</span>
        </div>
        <DataMeta meta={meta} />
      </div>
    </div>
  );
};
