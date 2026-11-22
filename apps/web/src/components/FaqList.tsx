import { memo } from 'react';
import { attrsToProps } from '@/lib/attrs';
import { usePageData } from './PageData';

export const FaqList = memo(function FaqList() {
  const { faq } = usePageData();
  return (
    <>
      {faq.map((f) => (
        <details key={f.id} {...attrsToProps(f.attrs)}>
          <summary {...attrsToProps(f.questionAttrs)}>{f.question}</summary>
          <div {...attrsToProps(f.answerAttrs)} dangerouslySetInnerHTML={{ __html: f.answerHtml }} />
        </details>
      ))}
    </>
  );
});
