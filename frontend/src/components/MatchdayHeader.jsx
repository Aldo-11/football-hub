import React from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { Crest, Card } from './ui';
import { formatMatchDate, formatTime, timeZoneName } from '../utils/dates';

const TeamSide = ({ team, isMine, align }) => (
  <div className={`flex items-center gap-3 ${align === 'right' ? 'md:flex-row-reverse md:text-right' : ''}`}>
    <Crest src={team.crest} alt={team.name} size="w-12 h-12 sm:w-16 sm:h-16" />
    <div className="min-w-0">
      <h2 className="text-lg sm:text-2xl font-scoreboard tracking-wide uppercase text-main leading-tight break-words">{team.name}</h2>
      {isMine && <span className="text-[10px] font-scoreboard uppercase px-1.5 py-0.5 bg-led text-pitch tracking-wider">Tu club</span>}
    </div>
  </div>
);

/** Próximo partido del club seleccionado. */
export const MatchdayHeader = ({ match, club }) => {
  if (!match) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted text-sm font-mono uppercase tracking-wider">
          {club ? `${club.shortName} no tiene partidos de liga programados por ahora` : 'Sin partido programado'}
        </p>
      </Card>
    );
  }

  const isHomeMine = match.homeTeam.espnId === club?.espnId;
  const isAwayMine = match.awayTeam.espnId === club?.espnId;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-hairline px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono uppercase text-muted bg-pitch/50">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-led animate-pulse" aria-hidden="true" />
          <span className="text-main font-semibold tracking-wider">Próximo partido</span>
          <span className="text-led font-semibold">{match.competition}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-led" />{formatMatchDate(match.utcDate)}</span>
          {match.venue && <span className="hidden sm:flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-led" />{match.venue}</span>}
        </div>
      </div>

      <div className="p-5 sm:p-8 grid grid-cols-1 md:grid-cols-7 items-center gap-5">
        <div className="md:col-span-3 md:justify-self-end"><TeamSide team={match.homeTeam} isMine={isHomeMine} align="right" /></div>
        <div className="text-center md:col-span-1">
          <div className="inline-block bg-pitch border border-hairline px-5 py-3">
            <div className="font-scoreboard text-3xl sm:text-4xl text-led tabular-nums animate-led-on">{formatTime(match.utcDate)}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted mt-1 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> Tu hora ({timeZoneName(match.utcDate)})
            </div>
          </div>
        </div>
        <div className="md:col-span-3"><TeamSide team={match.awayTeam} isMine={isAwayMine} /></div>
      </div>
    </Card>
  );
};
