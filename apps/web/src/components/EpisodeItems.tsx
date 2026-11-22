import { memo } from 'react';
import { attrsToProps } from '@/lib/attrs';
import { usePageData } from './PageData';

/** Cartoes da lista de episodios (temporadas ou spin-offs). */
export const EpisodeItems = memo(function EpisodeItems({ variant }: { variant: 'season' | 'spinoff' }) {
  const { episodes } = usePageData();
  const rows = episodes.filter((e) => (e.seasonNumber !== null) === (variant === 'season'));
  return (
    <>
      {rows.map((e) => (
        <div key={e.slug} {...attrsToProps(e.itemAttrs)}>
          <span className="ep-num">{e.numLabel}</span>
          <div>
            <div className="ep-title">{e.title}</div>
            {e.subtitle ? <div className="ep-sub">{e.subtitle}</div> : null}
          </div>
          <span className="ep-arrow">→</span>
        </div>
      ))}
    </>
  );
});
