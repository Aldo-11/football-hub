import React, { useEffect, useState } from 'react';
import { Compass, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import api from '../services/api';
import { useApi } from '../hooks/useApi';
import { useClub } from '../context/ClubContext';
import { Card, Loading, ErrorState, PageHeader, EmptyState, Crest, SectionTitle } from '../components/ui';
import { formatMatchDate, formatTime, timeZoneName, formatShortDate } from '../utils/dates';
import { errorMessage } from '../utils/errors';

const PoissonHint = ({ clubId, fixtureId }) => {
  const { data } = useApi(`/clubs/${clubId}/prediction`, { fixtureId });
  if (!data) return null;
  const p = data.prediction;
  return (
    <p className="p-2 bg-pitch/50 border border-hairline-subtle text-[11px] font-mono text-muted flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="flex items-center gap-1 text-main"><Sparkles className="w-3 h-3 text-led" /> Poisson: <b className="text-led">{p.mostLikelyScore.home}-{p.mostLikelyScore.away}</b></span>
      <span>1 {p.probabilities.homeWin}% · X {p.probabilities.draw}% · 2 {p.probabilities.awayWin}%</span>
    </p>
  );
};

const ScoreInput = ({ value, onChange, label }) => (
  <input type="number" inputMode="numeric" min="0" max="20" value={value} aria-label={label}
    onChange={(e) => onChange(e.target.value === '' ? '' : Math.max(0, Math.min(20, parseInt(e.target.value, 10) || 0)))}
    className="w-12 h-12 bg-pitch border border-hairline text-center font-scoreboard text-xl text-led tabular-nums focus:border-led focus:outline-none" />
);

export const Predictions = () => {
  const { club } = useClub();
  const matches = useApi(`/clubs/${club.id}/matches`);
  const mine = useApi('/predictions/my');
  const [inputs, setInputs] = useState({});
  const [status, setStatus] = useState({});

  useEffect(() => {
    const initial = {};
    (mine.data?.predictions || []).forEach((p) => { initial[p.fixtureId] = { home: p.predictedHome, away: p.predictedAway }; });
    setInputs(initial);
  }, [mine.data]);

  const setScore = (id, side, v) => setInputs((prev) => ({ ...prev, [id]: { ...prev[id], [side]: v } }));

  const submit = async (m) => {
    const v = inputs[m.fixtureId] || {};
    if (v.home === '' || v.home == null || v.away === '' || v.away == null) {
      setStatus((s) => ({ ...s, [m.fixtureId]: { error: 'Introduce ambos marcadores.' } }));
      return;
    }
    setStatus((s) => ({ ...s, [m.fixtureId]: { saving: true } }));
    try {
      await api.post('/predictions', { clubId: club.id, fixtureId: m.fixtureId, predictedHome: v.home, predictedAway: v.away });
      setStatus((s) => ({ ...s, [m.fixtureId]: { ok: 'Pronóstico guardado.' } }));
      mine.reload();
    } catch (err) {
      setStatus((s) => ({ ...s, [m.fixtureId]: { error: errorMessage(err) } }));
    }
  };

  const saved = (id) => (mine.data?.predictions || []).find((p) => p.fixtureId === id);
  const upcoming = matches.data?.upcoming || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader icon={Compass} title="Liga de pronósticos"
        subtitle={`Pronostica los próximos partidos de ${club.shortName}. Se aceptan hasta el inicio del partido. Marcador exacto: 3 puntos; acertar ganador o empate: 1 punto.`} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <SectionTitle title="Partidos abiertos" right={`${upcoming.length} partidos`} />
          {matches.loading && <Card><Loading /></Card>}
          {matches.error && <Card><ErrorState error={matches.error} onRetry={matches.reload} /></Card>}
          {matches.data && upcoming.length === 0 && <Card><EmptyState>No hay partidos próximos publicados.</EmptyState></Card>}
          {upcoming.map((m, i) => {
            const v = inputs[m.fixtureId] || { home: '', away: '' };
            const st = status[m.fixtureId] || {};
            const prev = saved(m.fixtureId);
            return (
              <Card key={m.fixtureId} className="p-4 space-y-3">
                <div className="flex justify-between text-[11px] font-mono text-muted">
                  <span className="uppercase text-main">{m.competition}</span>
                  <span>{formatMatchDate(m.utcDate)} · {formatTime(m.utcDate)} {timeZoneName(m.utcDate)}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="flex items-center gap-2 justify-end text-right min-w-0">
                    <span className="font-scoreboard uppercase text-xs sm:text-sm text-main truncate">{m.homeTeam.shortName}</span>
                    <Crest src={m.homeTeam.crest} size="w-7 h-7" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ScoreInput value={v.home} label={`Goles de ${m.homeTeam.name}`} onChange={(x) => setScore(m.fixtureId, 'home', x)} />
                    <span className="font-scoreboard text-muted">:</span>
                    <ScoreInput value={v.away} label={`Goles de ${m.awayTeam.name}`} onChange={(x) => setScore(m.fixtureId, 'away', x)} />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Crest src={m.awayTeam.crest} size="w-7 h-7" />
                    <span className="font-scoreboard uppercase text-xs sm:text-sm text-main truncate">{m.awayTeam.shortName}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-hairline-subtle">
                  <span className={`text-[11px] font-mono ${st.error ? 'text-loss' : st.ok ? 'text-win' : 'text-muted'}`} role="status">
                    {st.error || st.ok || (prev ? `Guardado: ${prev.predictedHome}-${prev.predictedAway}` : 'Sin pronóstico')}
                  </span>
                  <button onClick={() => submit(m)} disabled={st.saving}
                    className="bg-led hover:bg-yellow-400 text-pitch font-scoreboard uppercase px-4 py-1.5 text-xs disabled:opacity-50">
                    {st.saving ? 'Guardando…' : prev ? 'Actualizar' : 'Registrar'}
                  </button>
                </div>
                {i < 3 && <PoissonHint clubId={club.id} fixtureId={m.fixtureId} />}
              </Card>
            );
          })}
        </div>

        <div className="lg:col-span-5">
          <SectionTitle icon={Clock} title="Mis pronósticos" />
          <Card className="p-4">
            {mine.loading && <Loading />}
            {mine.error && <ErrorState error={mine.error} onRetry={mine.reload} />}
            {mine.data && mine.data.predictions.length === 0 && <EmptyState>Aún no has registrado pronósticos.</EmptyState>}
            <ul className="divide-y divide-hairline-subtle">
              {(mine.data?.predictions || []).map((p) => (
                <li key={p._id} className="py-2.5 flex items-center justify-between gap-2 text-xs font-mono">
                  <div className="min-w-0">
                    <span className="block text-[10px] text-muted">{formatShortDate(p.kickoff)}</span>
                    <span className="text-main truncate block">{p.homeTeam} <b className="text-led">{p.predictedHome}-{p.predictedAway}</b> {p.awayTeam}</span>
                    {p.resolved && <span className="text-[10px] text-muted">Resultado final: {p.finalScore?.home}-{p.finalScore?.away}</span>}
                  </div>
                  {p.resolved ? (
                    <span className={`flex items-center gap-1 font-scoreboard ${p.pointsAwarded > 0 ? 'text-win' : 'text-muted'}`}><CheckCircle2 className="w-3.5 h-3.5" /> +{p.pointsAwarded}</span>
                  ) : (
                    <span className="text-[10px] uppercase text-muted border border-hairline px-2 py-0.5">Pendiente</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};
