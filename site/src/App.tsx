import { lazy, Suspense, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Glossary } from './pages/Glossary';
import { Home } from './pages/Home';
import { AnalysisProvider } from './state/analysis';
import { useStore } from './state/store';

// The builder (and React Flow) loads only when it is opened, keeping the landing page light.
const Tool = lazy(() => import('./pages/Tool').then((m) => ({ default: m.Tool })));

export type Route = 'home' | 'pump-storage' | 'glossary';

const parse = (hash: string): Route => {
  const h = hash.replace(/^#\/?/, '');
  if (h.startsWith('pump-storage')) return 'pump-storage';
  if (h.startsWith('glossary')) return 'glossary';
  return 'home';
};

/** Minimal hash router: the site is static and needs no server routes. */
function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

function useTheme() {
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);
}

export function App() {
  const route = useRoute();
  useTheme();
  return (
    <AnalysisProvider>
      <div className={`app app--${route}`}>
        <Header route={route} />
        {route === 'home' && <Home />}
        {route === 'pump-storage' && (
          <Suspense fallback={<div className="loading">Loading the builder…</div>}>
            <Tool />
          </Suspense>
        )}
        {route === 'glossary' && <Glossary />}
      </div>
    </AnalysisProvider>
  );
}
