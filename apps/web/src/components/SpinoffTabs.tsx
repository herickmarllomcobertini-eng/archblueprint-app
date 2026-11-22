import { memo } from 'react';
import { attrsToProps } from '@/lib/attrs';
import { usePageData } from './PageData';

export const SpinoffTabs = memo(function SpinoffTabs() {
  const { spinoffs } = usePageData();
  return (
    <>
      {spinoffs.map((s) => (
        <button key={s.slug} {...attrsToProps(s.attrs)}>{s.label}</button>
      ))}
    </>
  );
});
