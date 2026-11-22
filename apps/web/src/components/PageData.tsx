import { createContext, useContext } from 'react';
import type { PagePayload } from '@/lib/types';

const Ctx = createContext<PagePayload | null>(null);
export const PageDataProvider = Ctx.Provider;

export function usePageData(): PagePayload {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePageData fora do PageDataProvider');
  return v;
}
