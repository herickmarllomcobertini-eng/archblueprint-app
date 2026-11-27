import { Fragment, memo, useEffect, useState } from 'react';
import { fetchChunk } from '@/lib/api';
import { attrsToProps } from '@/lib/attrs';
import type { CamadaGroup, LayerGroup } from '@/lib/types';
import { Content } from './Content';
import { PageDataProvider, usePageData } from './PageData';

function GroupBody({ group }: { group: LayerGroup }) {
  return (
    <div {...attrsToProps(group.attrs)}>
      {group.layers.map((l) => (
        <Fragment key={l.id}>
          <Content html={l.beforeHtml} />
          <div {...attrsToProps(l.attrs)}>
            <Content html={l.numHtml} />
            <div {...attrsToProps(l.midAttrs)}>
              <Content html={l.preNameHtml} />
              <div {...attrsToProps(l.nameAttrs)}>{l.name}</div>
              <Content html={l.bodyHtml} />
            </div>
            <span {...attrsToProps(l.badgeAttrs)}>{l.badgeText}</span>
          </div>
        </Fragment>
      ))}
      <Content html={group.trailingHtml} />
    </div>
  );
}

type Full = { group: LayerGroup; camadaGroups: CamadaGroup[] };

/** Cosmo-layers: camadas inalcancaveis, escada, mecanicas, auréolas N1 a N12, patamares.
 *  No modo protegido o grupo chega cifrado e e decifrado logo apos a pagina montar. */
export const LayerGroupView = memo(function LayerGroupView({ groupId }: { groupId: string }) {
  const data = usePageData();
  const stub = data.layerGroups.find((g) => g.id === groupId);
  const [full, setFull] = useState<Full | null>(null);
  const locked = !!data.protected && !!stub?.chunk;
  const chunk = stub?.chunk;

  useEffect(() => {
    if (!locked || !chunk) return;
    let alive = true;
    fetchChunk<Full>(chunk)
      .then((r) => {
        if (alive) setFull(r);
      })
      .catch((err) => console.error('camadas', err));
    return () => {
      alive = false;
    };
  }, [locked, chunk]);

  // avisa o JS legado (ancoras do indice, #hash) que o conteudo apareceu
  useEffect(() => {
    if (full) window.dispatchEvent(new Event('chunks:loaded'));
  }, [full]);

  if (!stub) return null;
  if (!locked) return <GroupBody group={stub} />;
  if (!full) return <div {...attrsToProps(stub.attrs)} />;
  return (
    <PageDataProvider value={{ ...data, camadaGroups: [...data.camadaGroups, ...full.camadaGroups] }}>
      <GroupBody group={full.group} />
    </PageDataProvider>
  );
});
