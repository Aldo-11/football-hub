import React from 'react';
import { Eye, Target } from 'lucide-react';
import { Crest, EmptyState, ResultBadge } from './ui';
import { formatShortDate, formatTime, timeZoneName } from '../utils/dates';

const resultFor = (m, espnId) => {
  const mine = m.homeTeam.espnId === espnId ? 'home' : m.awayTeam.espnId === espnId ? 'away' : null;
  if (!mine || m.score.home == null) return null;
  const gf = mine === 'home' ? m.score.home : m.score.away;
  const ga = mine === 'home' ? m.score.away : m.score.home;
  return gf > ga ? 'W' : gf < ga ? 'L' : 'D';
};

const TeamLine = ({ team, highlight, score }) => (
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 min-w-0">
      <Crest src={team.crest} size="w-4 h-4" />
      <span className={`truncate ${highlight ? 'text-led font-bold' : 'text-main'}`}>{team.shortName || team.name}</span>
    </div>
    {score != null && <span className="font-scoreboard tabular-nums text-main">{score}</span>}
  </div>
);

/** Lista de partidos pasados o próximos del club seleccionado. */
export const MatchList = ({ matches, club, type, focusedId, onFocus, onDetail }) => {
  if (!matches.length) {
    return (
      <EmptyState>
        {type === 'past'
          ? 'Todavía no hay partidos de liga terminados esta temporada.'
          : 'No hay próximos partidos de liga publicados.'}
      </EmptyState>
    );
  }

  return (
    <ul className="space-y-2">
      {matches.map((m) => {
        const result = type === 'past' ? resultFor(m, club?.espnId) : null;
        const focused = focusedId === m.fixtureId;
        return (
          <li key={m.fixtureId} className={`p-3 border text-xs font-mono ${focused ? 'border-led/60 bg-surface-subtle' : 'border-hairline-subtle bg-pitch/60'}`}>
            <div className="flex items-center justify-between text-[10px] text-muted mb-2">
              <span>{formatShortDate(m.utcDate)} · {formatTime(m.utcDate)} {timeZoneName(m.utcDate)}</span>
              {result ? <ResultBadge result={result} /> : <span className="uppercase text-led">Programado</span>}
            </div>
            <div className="space-y-1">
              <TeamLine team={m.homeTeam} highlight={m.homeTeam.espnId === club?.espnId} score={type === 'past' ? m.score.home : null} />
              <TeamLine team={m.awayTeam} highlight={m.awayTeam.espnId === club?.espnId} score={type === 'past' ? m.score.away : null} />
            </div>
            <div className="mt-2 pt-2 border-t border-hairline-subtle">
              {type === 'past' ? (
                <button onClick={() => onDetail(m)} className="w-full py-1.5 flex items-center justify-center gap-2 border border-hairline text-led hover:bg-surface-hover uppercase font-bold">
                  <Eye className="w-3.5 h-3.5" /> Alineaciones y estadísticas
                </button>
              ) : (
                <button onClick={() => onFocus(m)} aria-pressed={focused}
                  className={`w-full py-1.5 flex items-center justify-center gap-2 border uppercase font-bold ${focused ? 'bg-led text-pitch border-led' : 'border-hairline text-main hover:bg-surface-hover'}`}>
                  <Target className="w-3.5 h-3.5" /> {focused ? 'Pronóstico mostrado' : 'Ver pronóstico Poisson'}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
