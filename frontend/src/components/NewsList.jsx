import React, { useState } from 'react';
import { Newspaper, ExternalLink } from 'lucide-react';
import { EmptyState } from './ui';
import { formatRelative, formatShortDate } from '../utils/dates';

const Thumb = ({ src }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="w-16 h-16 flex-shrink-0 border border-hairline bg-pitch flex items-center justify-center" aria-hidden="true">
        <Newspaper className="w-6 h-6 text-muted" />
      </div>
    );
  }
  return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="w-16 h-16 object-cover flex-shrink-0 border border-hairline" />;
};

/** Noticias del club con enlace directo al artículo original. */
export const NewsList = ({ articles, limit = 5 }) => {
  if (!articles.length) return <EmptyState>No hay noticias recientes de este club en la fuente.</EmptyState>;
  return (
    <ul className="space-y-3">
      {articles.slice(0, limit).map((n) => (
        <li key={n.id}>
          <a href={n.url} target="_blank" rel="noopener noreferrer"
            className="flex items-start gap-3 p-2.5 border border-hairline-subtle bg-pitch/40 hover:bg-surface-hover group">
            <Thumb src={n.imageUrl} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-muted mb-1">
                <span className="text-led font-semibold uppercase">{n.source}</span>
                {n.publishedAt && <time dateTime={n.publishedAt} title={formatShortDate(n.publishedAt)}>{formatRelative(n.publishedAt)}</time>}
              </div>
              <h3 className="text-xs font-semibold text-main line-clamp-2 group-hover:text-led">{n.title}</h3>
              {n.description && <p className="text-[11px] text-muted line-clamp-2 mt-0.5">{n.description}</p>}
              <span className="sr-only">(se abre en una pestaña nueva)</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted flex-shrink-0" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
};
