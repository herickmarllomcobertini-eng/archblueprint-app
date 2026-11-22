import { Fragment, memo } from 'react';
import { attrsToProps } from '@/lib/attrs';
import { Content } from './Content';
import { usePageData } from './PageData';

/** Cosmo-layers: camadas inalcancaveis, escada, mecanicas, auréolas N1 a N12, patamares. */
export const LayerGroupView = memo(function LayerGroupView({ groupId }: { groupId: string }) {
  const group = usePageData().layerGroups.find((g) => g.id === groupId);
  if (!group) return null;
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
});
