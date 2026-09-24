import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';
import { Crest, Loading, ErrorState } from '../components/ui';
import { errorMessage } from '../utils/errors';

/** Selección del club entre los 10 soportados, agrupados por liga. */
export const TeamSelect = ({ onComplete }) => {
  const { user, updateFavoriteClub } = useAuth();
  const { clubs, loading, error, reload } = useClub();
  const [selected, setSelected] = useState(user?.favoriteTeamId || null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const leagues = [...new Map(clubs.map((c) => [c.league, c.leagueName])).entries()];

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveError('');
    try {
      await updateFavoriteClub(selected);
      onComplete();
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="border border-hairline bg-surface p-6 text-center">
        <h1 className="text-2xl font-scoreboard uppercase text-main tracking-wide">Elige tu club</h1>
        <p className="text-xs text-muted mt-2 max-w-xl mx-auto">
          Toda la aplicación (partidos, análisis, simulación, plantilla y noticias) se adapta al club que elijas. Puedes cambiarlo cuando quieras.
        </p>
      </div>

      {loading && <Loading label="Cargando clubes…" />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {leagues.map(([code, name]) => (
        <section key={code}>
          <h2 className="text-[11px] font-mono uppercase text-muted tracking-wider mb-2">{name}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3" role="radiogroup" aria-label={name}>
            {clubs.filter((c) => c.league === code).map((c) => {
              const active = selected === c.id;
              return (
                <button key={c.id} role="radio" aria-checked={active} onClick={() => setSelected(c.id)}
                  className={`relative border p-4 flex flex-col items-center gap-2 text-center ${active ? 'border-led bg-led/10' : 'border-hairline bg-surface hover:bg-surface-hover'}`}>
                  {active && <span className="absolute top-1.5 right-1.5 bg-led text-pitch p-0.5"><Check className="w-3 h-3" /></span>}
                  <Crest src={c.crest} alt={c.name} size="w-12 h-12" />
                  <span className="font-scoreboard uppercase text-xs text-main">{c.shortName}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <div className="border border-hairline bg-surface p-4 flex flex-wrap items-center justify-between gap-3 sticky bottom-4 shadow-2xl">
        <span className="text-xs font-mono text-muted">
          Club: <b className="text-main">{clubs.find((c) => c.id === selected)?.name || 'ninguno'}</b>
          {saveError && <span className="block text-loss">{saveError}</span>}
        </span>
        <button onClick={save} disabled={saving || !selected}
          className="bg-led hover:bg-yellow-400 text-pitch font-scoreboard uppercase px-6 py-2.5 text-xs disabled:opacity-50">
          {saving ? 'Guardando…' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
};
