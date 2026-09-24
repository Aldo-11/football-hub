import React, { useEffect, useRef, useState } from 'react';
import { X, Users, BarChart3, ListOrdered, ArrowDownUp } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { Crest, ErrorState, Loading, EmptyState, DataMeta } from './ui';
import { formatMatchDate, formatTime, timeZoneName } from '../utils/dates';
import { buildLines } from '../utils/formation';

const EVENT_ICONS = { goal: '⚽', 'penalty-goal': '⚽ (p)', 'own-goal': '⚽ (pp)', 'yellow-card': '🟨', 'red-card': '🟥', substitution: '🔄' };

const Pitch = ({ lineup, color }) => {
  const lines = buildLines(lineup.starters, lineup.formation);
  return (
    <div className="relative bg-[#133523] border border-hairline px-2 py-4 flex flex-col-reverse gap-4 min-h-[380px] justify-between" aria-label="Alineación titular en el campo">
      <div className="absolute inset-x-0 top-1/2 border-t border-white/10" aria-hidden="true" />
      {lines.map((line, i) => (
        <div key={i} className="relative flex justify-around items-start gap-1">
          {line.map((p) => (
            <div key={p.id || p.name} className="flex flex-col items-center w-16 sm:w-20 min-w-0">
              <span className={`w-8 h-8 flex items-center justify-center text-[11px] font-bold border-2 ${color} bg-pitch text-main`}>{p.number ?? '–'}</span>
              <span className="mt-1 text-[10px] leading-tight text-center text-main w-full truncate" title={`${p.name}${p.position ? ` (${p.position})` : ''}`}>
                {p.name.split(' ').slice(-1)[0]}
              </span>
              {p.subbedOut && <span className="text-[9px] text-loss" title="Sustituido">▼</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const Lineups = ({ detail }) => {
  const [side, setSide] = useState('home');
  const { lineups, match } = detail;
  if (!detail.availability.lineups) {
    return <EmptyState>La fuente no publicó alineaciones para este partido. No se muestran alineaciones estimadas.</EmptyState>;
  }
  const lineup = lineups[side];
  const team = match[`${side}Team`];
  const subsIn = lineup.bench.filter((p) => p.subbedIn);
  const unused = lineup.bench.filter((p) => !p.subbedIn);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 border border-hairline p-1 text-xs font-mono" role="tablist">
        {['home', 'away'].map((s) => (
          <button key={s} role="tab" aria-selected={side === s} onClick={() => setSide(s)}
            className={`py-1.5 uppercase font-semibold truncate ${side === s ? 'bg-led text-pitch' : 'text-muted hover:text-main'}`}>
            {match[`${s}Team`].shortName}
          </button>
        ))}
      </div>
      <p className="text-[11px] font-mono text-muted">Formación: <b className="text-main">{lineup.formation || 'no publicada'}</b> · Titulares de {team.name}</p>
      <Pitch lineup={lineup} color={side === 'home' ? 'border-led' : 'border-win'} />
      <div className="grid sm:grid-cols-2 gap-3 text-xs font-mono">
        <div>
          <h4 className="text-[10px] uppercase text-muted mb-1 flex items-center gap-1"><ArrowDownUp className="w-3 h-3" /> Entraron</h4>
          {subsIn.length ? subsIn.map((p) => <p key={p.id || p.name} className="text-main">{p.number ?? '–'} · {p.name}</p>) : <p className="text-muted">Sin cambios registrados</p>}
        </div>
        <div>
          <h4 className="text-[10px] uppercase text-muted mb-1">Suplentes sin jugar</h4>
          {unused.length ? unused.map((p) => <p key={p.id || p.name} className="text-muted">{p.number ?? '–'} · {p.name}</p>) : <p className="text-muted">—</p>}
        </div>
      </div>
    </div>
  );
};

const Stats = ({ detail }) => {
  if (!detail.availability.statistics) return <EmptyState>La fuente no publicó estadísticas de este partido.</EmptyState>;
  return (
    <div className="space-y-3">
      {detail.statistics.map((s) => {
        const total = s.home + s.away || 1;
        return (
          <div key={s.key} className="text-xs font-mono">
            <div className="flex justify-between mb-1">
              <span className="text-main tabular-nums font-bold">{s.home}{s.unit}</span>
              <span className="text-muted uppercase text-[10px]">{s.label}</span>
              <span className="text-main tabular-nums font-bold">{s.away}{s.unit}</span>
            </div>
            <div className="flex h-1.5 bg-pitch">
              <div className="bg-led" style={{ width: `${(s.home / total) * 100}%` }} />
              <div className="bg-win" style={{ width: `${(s.away / total) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Events = ({ detail }) => {
  if (!detail.availability.events) return <EmptyState>La fuente no publicó los eventos del partido.</EmptyState>;
  return (
    <ul className="space-y-1.5 text-xs font-mono">
      {detail.events.map((e, i) => (
        <li key={i} className={`flex items-center gap-2 ${e.side === 'away' ? 'flex-row-reverse text-right' : ''}`}>
          <span className="text-muted w-10 tabular-nums">{e.minute}</span>
          <span>{EVENT_ICONS[e.type]}</span>
          <span className="text-main">{e.players.join(' ↔ ')}</span>
        </li>
      ))}
    </ul>
  );
};

const TABS = [
  { id: 'lineups', label: 'Alineaciones', icon: Users, Comp: Lineups },
  { id: 'stats', label: 'Estadísticas', icon: BarChart3, Comp: Stats },
  { id: 'events', label: 'Incidencias', icon: ListOrdered, Comp: Events }
];

/** Detalle real de un partido terminado (ESPN). */
export const MatchDetailModal = ({ match, onClose }) => {
  const { data, error, loading, reload } = useApi(`/matches/${match.leagueCode}/${match.fixtureId}`);
  const [tab, setTab] = useState('lineups');
  const closeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const Active = TABS.find((t) => t.id === tab).Comp;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="match-detail-title"
        className="bg-surface border border-hairline w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface border-b border-hairline p-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase text-muted">{match.competition} · {formatMatchDate(match.utcDate)} · {formatTime(match.utcDate)} {timeZoneName(match.utcDate)}</p>
            <h2 id="match-detail-title" className="mt-1 flex flex-wrap items-center gap-2 font-scoreboard uppercase text-main text-sm sm:text-base">
              <Crest src={match.homeTeam.crest} size="w-5 h-5" /> {match.homeTeam.shortName}
              <span className="text-led tabular-nums">{match.score.home ?? '–'} : {match.score.away ?? '–'}</span>
              {match.awayTeam.shortName} <Crest src={match.awayTeam.crest} size="w-5 h-5" />
            </h2>
          </div>
          <button ref={closeRef} onClick={onClose} aria-label="Cerrar" className="p-1.5 border border-hairline text-muted hover:text-main"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-1 border border-hairline p-1 text-[11px] font-mono" role="tablist">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`py-1.5 flex items-center justify-center gap-1 uppercase font-semibold ${tab === id ? 'bg-led text-pitch' : 'text-muted hover:text-main'}`}>
                <Icon className="w-3.5 h-3.5" /><span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          {loading && <Loading label="Cargando detalle del partido…" />}
          {error && <ErrorState error={error} onRetry={reload} />}
          {data && (
            <>
              <Active detail={data} />
              <div className="pt-2 border-t border-hairline"><DataMeta meta={data.meta} /></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
