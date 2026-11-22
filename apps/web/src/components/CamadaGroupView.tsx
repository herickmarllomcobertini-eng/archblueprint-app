import { Fragment, memo } from 'react';
import { attrsToProps } from '@/lib/attrs';
import { Content } from './Content';
import { usePageData } from './PageData';

/** As 21 camadas da Escada da Solidificacao (C01...). */
export const CamadaGroupView = memo(function CamadaGroupView({ groupId }: { groupId: string }) {
  const group = usePageData().camadaGroups.find((g) => g.id === groupId);
  if (!group) return null;
  return (
    <div {...attrsToProps(group.attrs)}>
      {group.camadas.map((c) => (
        <Fragment key={c.id}>
          <Content html={c.beforeHtml} />
          <div {...attrsToProps(c.attrs)}>
            <span {...attrsToProps(c.codeAttrs)}>{c.code}</span>
            <div {...attrsToProps(c.midAttrs)}>
              <div {...attrsToProps(c.nameAttrs)}>{c.name}</div>
              <div {...attrsToProps(c.descAttrs)} dangerouslySetInnerHTML={{ __html: c.descHtml }} />
            </div>
          </div>
        </Fragment>
      ))}
      <Content html={group.trailingHtml} />
    </div>
  );
});
