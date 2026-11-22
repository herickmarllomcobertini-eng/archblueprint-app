import { useEffect, useLayoutEffect, useState } from 'react';
import { Content } from '@/components/Content';
import { PageDataProvider } from '@/components/PageData';
import { initBehaviors } from '@/legacy/behaviors';
import { initHierarquiaEffects } from '@/legacy/hierarquia';
import { fetchPage } from '@/lib/api';
import type { PagePayload } from '@/lib/types';

/** Carrega uma pagina do banco (via API) e monta os blocos na mesma ordem do HTML original. */
export default function SitePage({ slug }: { slug: 'home' | 'hierarquia' }) {
  const [data, setData] = useState<PagePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPage(slug).then(setData).catch((e: Error) => setError(e.message));
  }, [slug]);

  useEffect(() => {
    if (data) document.title = data.page.title;
  }, [data]);

  // depois que o DOM existe, liga os comportamentos (equivale aos scripts do original)
  useLayoutEffect(() => {
    if (!data) return;
    const stop = initBehaviors(slug, data.relmap);
    const stopFx = slug === 'hierarquia' ? initHierarquiaEffects() : () => {};
    // o original rolava ate o #hash ao carregar
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
    return () => { stop(); stopFx(); };
  }, [data, slug]);

  if (error) return <pre style={{ color: '#ece3cc', padding: '2rem' }}>{error}</pre>;
  if (!data) return null;
  return (
    <PageDataProvider value={data}>
      {data.blocks.filter((b) => b.kind !== 'comment').map((b) => <Content key={b.id} html={b.html} />)}
    </PageDataProvider>
  );
}
