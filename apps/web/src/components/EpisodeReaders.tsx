import { memo, useLayoutEffect, useRef, useState } from 'react';
import { fetchChunk } from '@/lib/api';
import { attrsToProps } from '@/lib/attrs';
import type { Episode } from '@/lib/types';
import { Content } from './Content';
import { usePageData } from './PageData';

type Body = { bodyHtml: string; afterHtml: string };

/** Leitor de um episodio. No modo protegido o texto so e baixado e decifrado quando o episodio e aberto. */
function Reader({ e }: { e: Episode }) {
  const { ui, protected: locked } = usePageData();
  const [text, setText] = useState<Body | null>(locked ? null : { bodyHtml: e.bodyHtml, afterHtml: e.afterHtml });
  const started = useRef(false);

  // useLayoutEffect: o ouvinte precisa existir antes do JS legado abrir um episodio pelo #hash
  useLayoutEffect(() => {
    if (!locked || !e.chunk) return;
    const onOpen = (ev: Event) => {
      if ((ev as CustomEvent<string>).detail !== e.slug || started.current) return;
      started.current = true;
      fetchChunk<Body>(e.chunk as string)
        .then(setText)
        .catch(() => {
          started.current = false;
        });
    };
    window.addEventListener('ep:open', onOpen);
    return () => window.removeEventListener('ep:open', onOpen);
  }, [locked, e.chunk, e.slug]);

  return (
    <div {...attrsToProps(e.readerAttrs)}>
      <div className="ep-reader-header">
        <div className="ep-reader-tag">{e.readerTag}</div>
        <div className="ep-reader-title">{e.readerTitle}</div>
      </div>
      <div
        {...attrsToProps(e.bodyAttrs)}
        dangerouslySetInnerHTML={{ __html: text ? text.bodyHtml : '<p style="opacity:.6">// carregando…</p>' }}
      />
      {text && text.afterHtml ? <Content html={text.afterHtml} /> : null}
      <Content html={(ui['ep-reader-close'] ?? '').replace('{slug}', e.slug)} />
    </div>
  );
}

export const EpisodeReaders = memo(function EpisodeReaders() {
  const { episodes } = usePageData();
  const readers = [...episodes].sort((a, b) => a.readerOrder - b.readerOrder);
  return (
    <>
      {readers.map((e) => (
        <Reader key={e.slug} e={e} />
      ))}
    </>
  );
});
