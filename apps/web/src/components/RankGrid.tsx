import { memo } from 'react';
import { attrsToProps } from '@/lib/attrs';
import { Content } from './Content';
import { usePageData } from './PageData';

export const RankGrid = memo(function RankGrid({ groupId }: { groupId: string }) {
  const group = usePageData().rankGroups.find((g) => g.id === groupId);
  if (!group) return null;
  return (
    <div {...attrsToProps(group.attrs)}>
      {group.ranks.map((r) => (
        <div key={r.id} {...attrsToProps(r.attrs)}>
          <div {...attrsToProps(r.labelAttrs)}>{r.label}</div>
          <div {...attrsToProps(r.midAttrs)}>
            <div {...attrsToProps(r.nameAttrs)}>{r.name}</div>
            <div {...attrsToProps(r.descAttrs)} dangerouslySetInnerHTML={{ __html: r.descHtml }} />
            <Content html={r.extraHtml} />
          </div>
        </div>
      ))}
    </div>
  );
});
