import { memo } from 'react';
import { attrsToProps } from '@/lib/attrs';
import { usePageData } from './PageData';

export const GlossaryList = memo(function GlossaryList({ page }: { page: string }) {
  const { glossary } = usePageData();
  return (
    <>
      {glossary.filter((g) => g.page === page).map((g) => (
        <div key={g.id} {...attrsToProps(g.attrs)}>
          <div {...attrsToProps(g.termAttrs)}>{g.term}</div>
          <div {...attrsToProps(g.defAttrs)} dangerouslySetInnerHTML={{ __html: g.defHtml }} />
        </div>
      ))}
    </>
  );
});
