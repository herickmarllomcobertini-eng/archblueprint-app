import { memo } from 'react';
import { attrsToProps } from '@/lib/attrs';
import { Content } from './Content';
import { usePageData } from './PageData';

/** Leitor de cada episodio (o texto em si vem de Episode.bodyHtml). */
export const EpisodeReaders = memo(function EpisodeReaders() {
  const { episodes, ui } = usePageData();
  const readers = [...episodes].sort((a, b) => a.readerOrder - b.readerOrder);
  return (
    <>
      {readers.map((e) => (
        <div key={e.slug} {...attrsToProps(e.readerAttrs)}>
          <div className="ep-reader-header">
            <div className="ep-reader-tag">{e.readerTag}</div>
            <div className="ep-reader-title">{e.readerTitle}</div>
          </div>
          <div {...attrsToProps(e.bodyAttrs)} dangerouslySetInnerHTML={{ __html: e.bodyHtml }} />
          {e.afterHtml ? <Content html={e.afterHtml} /> : null}
          <Content html={(ui['ep-reader-close'] ?? '').replace('{slug}', e.slug)} />
        </div>
      ))}
    </>
  );
});
