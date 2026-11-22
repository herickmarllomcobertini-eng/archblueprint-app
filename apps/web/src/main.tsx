import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const HomePage = lazy(() => import('./pages/HomePage'));
const HierarquiaPage = lazy(() => import('./pages/HierarquiaPage'));

// O site original tem duas paginas: / e /hierarquia/index.html (links continuam os mesmos).
const isHierarquia = location.pathname.replace(/\/+$/, '').startsWith('/hierarquia');

createRoot(document.getElementById('root')!).render(
  <Suspense fallback={null}>{isHierarquia ? <HierarquiaPage /> : <HomePage />}</Suspense>,
);
