import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Shield, Info } from 'lucide-react';
import { errorMessage } from '../utils/errors';
import { formatRelative } from '../utils/dates';

export const Card = ({ children, className = '' }) => (
  <section className={`border border-hairline bg-surface ${className}`}>{children}</section>
);

export const SectionTitle = ({ icon: Icon, title, right, accent = 'bg-led' }) => (
  <div className="flex items-center justify-between gap-3 mb-3">
    <div className="flex items-center gap-2 min-w-0">
      {Icon ? <Icon className="w-4 h-4 text-led flex-shrink-0" /> : <span className={`w-2 h-2 ${accent} flex-shrink-0`} />}
      <h2 className="font-scoreboard uppercase tracking-wider text-sm text-main truncate">{title}</h2>
    </div>
    {right && <div className="text-[11px] font-mono text-muted uppercase tracking-wider flex-shrink-0">{right}</div>}
  </div>
);

export const Loading = ({ label = 'Cargando…' }) => (
  <div className="p-6 flex items-center justify-center gap-3 text-muted font-mono text-xs uppercase" role="status">
    <span className="w-4 h-4 border-2 border-led border-t-transparent animate-spin" aria-hidden="true" />
    {label}
  </div>
);

export const ErrorState = ({ error, onRetry, title = 'Información no disponible' }) => (
  <div className="p-5 text-center font-mono text-xs space-y-2" role="alert">
    <AlertTriangle className="w-5 h-5 text-loss mx-auto" />
    <p className="text-main font-semibold uppercase">{title}</p>
    <p className="text-muted">{errorMessage(error)}</p>
    {onRetry && (
      <button onClick={onRetry} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-hairline text-muted hover:text-main hover:border-muted">
        <RefreshCw className="w-3.5 h-3.5" /> Reintentar
      </button>
    )}
  </div>
);

export const EmptyState = ({ children }) => (
  <p className="p-6 text-center text-muted font-mono text-xs">{children}</p>
);

/** Aviso cuando se muestran datos guardados porque la fuente no respondió. */
export const DataMeta = ({ meta }) => {
  if (!meta) return null;
  return (
    <span className={`text-[10px] font-mono uppercase ${meta.stale ? 'text-loss' : 'text-muted'}`}>
      {meta.stale ? '⚠ Fuente no disponible · datos guardados ' : `Fuente: ${meta.source} · `}
      {formatRelative(meta.fetchedAt)}
    </span>
  );
};

/** Escudo con alternativa si la imagen no existe o falla. */
export const Crest = ({ src, alt = '', size = 'w-6 h-6' }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Shield className={`${size} text-muted flex-shrink-0`} aria-hidden="true" />;
  return <img src={src} alt={alt} className={`${size} object-contain flex-shrink-0`} loading="lazy" onError={() => setFailed(true)} />;
};

export const InfoNote = ({ children }) => (
  <p className="flex items-start gap-2 text-[11px] text-muted leading-relaxed">
    <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-led" />
    <span>{children}</span>
  </p>
);

export const ResultBadge = ({ result }) => {
  const styles = {
    W: 'bg-win/20 text-win border-win/40',
    D: 'bg-surface text-muted border-hairline',
    L: 'bg-loss/20 text-loss border-loss/40'
  };
  const labels = { W: 'V', D: 'E', L: 'D' };
  const titles = { W: 'Victoria', D: 'Empate', L: 'Derrota' };
  return (
    <span title={titles[result]} className={`inline-flex items-center justify-center w-6 h-6 text-[11px] font-bold border ${styles[result] || styles.D}`}>
      {labels[result] || '–'}
    </span>
  );
};

/** Barra horizontal 0-100 con etiqueta. */
export const ScoreBar = ({ value, color = 'bg-led' }) => (
  <div className="h-2 bg-pitch border border-hairline-subtle" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? 0}>
    <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
  </div>
);

export const PageHeader = ({ icon: Icon, title, subtitle, right }) => (
  <Card className="p-5 sm:p-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-led" />}
          <h1 className="text-xl sm:text-2xl font-scoreboard uppercase text-main tracking-wide">{title}</h1>
        </div>
        {subtitle && <p className="text-xs text-muted mt-1 max-w-3xl leading-relaxed">{subtitle}</p>}
      </div>
      {right}
    </div>
  </Card>
);
