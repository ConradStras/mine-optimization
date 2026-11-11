import { useStore, type Theme } from '../state/store';
import { Monitor, Moon, Sun } from './Icons';

export function Brand() {
  return (
    <a href="#/" className="brand" aria-label="Shaftline home">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="brand__bg" />
        <path d="M9 8h14M16 8v17M10 25h12" stroke="var(--water-hi)" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="16" cy="18" r="3.2" fill="var(--accent)" />
      </svg>
      <span>Shaftline</span>
    </a>
  );
}

const NEXT_THEME: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };

export function Header({ route }: { route: string }) {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const currency = useStore((s) => s.currency);
  const setCurrency = useStore((s) => s.setCurrency);
  const guideMode = useStore((s) => s.guideMode);
  const setGuideMode = useStore((s) => s.setGuideMode);
  const onTool = route === 'pump-storage';

  return (
    <header className="topbar">
      <Brand />
      <nav className="topbar__nav" aria-label="Main">
        <a href="#/pump-storage" aria-current={onTool ? 'page' : undefined}>
          Pumped storage
        </a>
        <a href="#/glossary" aria-current={route === 'glossary' ? 'page' : undefined}>
          Glossary
        </a>
      </nav>
      <div className="topbar__tools">
        {onTool && (
          <div className="segmented segmented--sm" role="radiogroup" aria-label="Guidance">
            <button
              role="radio"
              aria-checked={guideMode === 'guided'}
              className={guideMode === 'guided' ? 'is-on' : ''}
              onClick={() => setGuideMode('guided')}
              data-testid="mode-guided"
            >
              Guided
            </button>
            <button
              role="radio"
              aria-checked={guideMode === 'expert'}
              className={guideMode === 'expert' ? 'is-on' : ''}
              onClick={() => setGuideMode('expert')}
            >
              Expert
            </button>
          </div>
        )}
        <div className="segmented segmented--sm" role="radiogroup" aria-label="Currency">
          {(['ZAR', 'USD'] as const).map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={currency === c}
              className={currency === c ? 'is-on' : ''}
              onClick={() => setCurrency(c)}
            >
              {c === 'ZAR' ? 'R' : '$'}
            </button>
          ))}
        </div>
        <button
          className="icon-btn"
          onClick={() => setTheme(NEXT_THEME[theme])}
          aria-label={`Theme: ${theme}. Switch to ${NEXT_THEME[theme]}`}
          title={`Theme: ${theme}`}
        >
          {theme === 'light' ? <Sun /> : theme === 'dark' ? <Moon /> : <Monitor />}
        </button>
      </div>
    </header>
  );
}
