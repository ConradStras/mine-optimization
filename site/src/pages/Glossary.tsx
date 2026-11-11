import { useMemo, useState } from 'react';
import { Check } from '../components/Icons';
import { TermCard } from '../learn/Term';
import { TERMS } from '../learn/terms';
import { useStore } from '../state/store';

const PHASES: Record<number, string> = {
  1: 'Phase 1 · Power, energy and efficiency',
  2: 'Phase 2 · Costs and cash flow',
  3: 'Phase 3 · Solar, battery and hybrids',
  4: 'Phase 4 · Water hammer',
  5: 'Phase 5 · Heavy fluids',
};

export function Glossary() {
  const [q, setQ] = useState('');
  const discovered = useStore((s) => s.discovered);
  const found = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? TERMS.filter((t) => `${t.name} ${t.short} ${t.plain}`.toLowerCase().includes(s)) : TERMS;
  }, [q]);
  const phase1 = TERMS.filter((t) => t.phase === 1);
  const seen = phase1.filter((t) => discovered.includes(t.id)).length;

  return (
    <div className="glossary">
      <header className="glossary__head">
        <div>
          <p className="eyebrow">Glossary</p>
          <h1>Every term, in plain language</h1>
          <p className="lede">
            The same cards open from any underlined word in the builder, filled in with the numbers from your
            own design.
          </p>
        </div>
        <div
          className="glossary__progress"
          aria-label={`${seen} of ${phase1.length} Phase 1 terms discovered`}
        >
          <svg viewBox="0 0 36 36" width="64" height="64" aria-hidden="true">
            <circle cx="18" cy="18" r="15.5" className="ring-bg" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              className="ring-fg"
              strokeDasharray={`${(seen / phase1.length) * 97.4} 97.4`}
            />
          </svg>
          <div>
            <b className="mono">
              {seen}/{phase1.length}
            </b>
            <span>terms discovered while building</span>
          </div>
        </div>
      </header>
      <input
        className="search"
        type="search"
        placeholder="Search terms…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search terms"
      />
      {[1, 2, 3, 4, 5].map((p) => {
        const list = found.filter((t) => t.phase === p);
        if (list.length === 0) return null;
        return (
          <section key={p} className="glossary__phase">
            <h2>{PHASES[p]}</h2>
            <div className="glossary__grid">
              {list.map((t) => (
                <div
                  key={t.id}
                  className={`glossary__item${discovered.includes(t.id) ? ' is-seen' : ''}`}
                  id={`term-${t.id}`}
                >
                  {discovered.includes(t.id) && (
                    <span className="glossary__seen" title="Discovered">
                      <Check size={13} />
                    </span>
                  )}
                  <TermCard term={t} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
