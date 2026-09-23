import React from 'react';
import { Calendar, MapPin, Zap } from 'lucide-react';

export const MatchdayHeader = ({ match, userTeamName }) => {
  if (!match) {
    return (
      <div className="border border-hairline bg-surface p-6 mb-8 text-center">
        <p className="text-muted text-sm font-mono uppercase tracking-wider">No hay partido programado en los próximos días</p>
      </div>
    );
  }

  const matchDate = new Date(match.utcDate);
  const formattedDate = matchDate.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).toUpperCase();

  const formattedTime = matchDate.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return (
    <div className="border border-hairline bg-surface relative overflow-hidden mb-8">
      {/* Top micro ticker */}
      <div className="border-b border-hairline px-4 py-1.5 flex items-center justify-between text-[11px] font-mono uppercase text-muted bg-pitch/50">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-led animate-pulse"></span>
          <span className="text-main font-semibold tracking-wider">Próximo Encuentro Oficial</span>
          <span className="text-hairline">|</span>
          <span>{match.competition || 'Competición'}</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-led" />
            {formattedDate}
          </span>
          <span className="text-main font-bold">{formattedTime} HRS</span>
        </div>
      </div>

      {/* Main Scoreboard Display */}
      <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-11 items-center gap-6">
        {/* Local Team */}
        <div className="md:col-span-4 flex items-center space-x-4 justify-start md:justify-end text-left md:text-right order-1">
          <div className="order-2 md:order-1">
            <h2 className="text-xl sm:text-2xl font-scoreboard tracking-wide uppercase text-main leading-tight">
              {match.homeTeam?.name || 'Local'}
            </h2>
            <span className="text-xs font-mono text-muted uppercase tracking-widest block">
              {match.homeTeam?.name === userTeamName ? '★ Tu Club' : 'Anfitrión'}
            </span>
          </div>
          {match.homeTeam?.crest && (
            <img
              src={match.homeTeam.crest}
              alt={match.homeTeam.name}
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain order-1 md:order-2 flex-shrink-0"
            />
          )}
        </div>

        {/* Big LED Central Box */}
        <div className="md:col-span-3 text-center order-3 md:order-2">
          <div className="inline-block bg-pitch border border-hairline px-6 py-3 rounded-none">
            <div className="font-scoreboard text-4xl sm:text-5xl text-led tracking-widest tabular-nums animate-led-on">
              {formattedTime}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted mt-1">
              Kick-off Matchday
            </div>
          </div>
        </div>

        {/* Away Team */}
        <div className="md:col-span-4 flex items-center space-x-4 justify-start text-left order-2 md:order-3">
          {match.awayTeam?.crest && (
            <img
              src={match.awayTeam.crest}
              alt={match.awayTeam.name}
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain flex-shrink-0"
            />
          )}
          <div>
            <h2 className="text-xl sm:text-2xl font-scoreboard tracking-wide uppercase text-main leading-tight">
              {match.awayTeam?.name || 'Visitante'}
            </h2>
            <span className="text-xs font-mono text-muted uppercase tracking-widest block">
              {match.awayTeam?.name === userTeamName ? '★ Tu Club' : 'Visitante'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};