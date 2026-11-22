import { memo } from 'react';
import { attrsToProps } from '@/lib/attrs';
import type { Entity } from '@/lib/types';
import { usePageData } from './PageData';

function Card({ e }: { e: Entity }) {
  const parts: Record<string, JSX.Element | null> = {
    'entity-rank': <div key="r" className="entity-rank">{e.rank}</div>,
    'entity-name': <div key="n" className="entity-name">{e.name}</div>,
    img: e.imgAttrs ? <img key="i" {...attrsToProps(e.imgAttrs)} /> : null,
    'entity-desc': <div key="d" {...attrsToProps(e.descAttrs)} dangerouslySetInnerHTML={{ __html: e.descHtml }} />,
    'entity-tags': (
      <div key="t" {...attrsToProps(e.tagsAttrs)}>
        {e.tags.map((t) => <span key={t.id} {...attrsToProps(t.attrs)}>{t.text}</span>)}
      </div>
    ),
  };
  return <div {...attrsToProps(e.attrs)}>{e.order.map((k) => parts[k] ?? null)}</div>;
}

export const EntityGrid = memo(function EntityGrid({ groupId }: { groupId: string }) {
  const group = usePageData().entityGroups.find((g) => g.id === groupId);
  if (!group) return null;
  return (
    <div {...attrsToProps(group.attrs)}>
      {group.entities.map((e) => <Card key={e.id} e={e} />)}
    </div>
  );
});
