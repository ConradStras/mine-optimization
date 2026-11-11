import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAnalysis } from '../state/context';
import { useStore } from '../state/store';
import { Eye, Play } from '../components/Icons';
import { TERM_BY_ID, type Term as TermT } from './terms';

export function TermCard({ term, onAction }: { term: TermT; onAction?: () => void }) {
  const { analysis } = useAnalysis();
  const showExplainer = useStore((s) => s.showExplainer);
  const setHighlight = useStore((s) => s.setHighlight);
  const live = term.live?.(analysis);
  const onTool = typeof window !== 'undefined' && window.location.hash.startsWith('#/pump-storage');
  return (
    <div className="term-card">
      <div className="term-card__head">
        <h4>{term.name}</h4>
        {term.phase > 1 && <span className="badge">Phase {term.phase}</span>}
      </div>
      <p className="term-card__short">{term.short}</p>
      <p>{term.plain}</p>
      {term.analogy && (
        <p className="term-card__analogy">
          <span>In the mine</span>
          {term.analogy}
        </p>
      )}
      {term.equation && <div className="term-card__eq">{term.equation}</div>}
      {term.symbols && (
        <dl className="term-card__symbols">
          {term.symbols.map((s) => (
            <div key={s.sym}>
              <dt>{s.sym}</dt>
              <dd>
                {s.meaning} <span>{s.unit}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {live && <p className="term-card__live">{live}</p>}
      {onTool && (term.animation || term.metric) && (
        <div className="term-card__actions">
          {term.animation && (
            <button
              className="btn btn--primary btn--sm"
              onClick={() => {
                showExplainer(term.animation!);
                onAction?.();
              }}
            >
              <Play size={13} /> Show me on my system
            </button>
          )}
          {term.metric && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => {
                const dep = analysis.dependsOn[term.metric!];
                setHighlight({ label: term.name, ...dep });
                onAction?.();
              }}
            >
              <Eye size={14} /> What affects it
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** A dotted-underlined technical term. Tap or hover-click to learn what it means. */
export function Term({ id, children }: { id: string; children?: ReactNode }) {
  const term = TERM_BY_ID[id];
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const anchor = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const discover = useStore((s) => s.discover);

  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const r = anchor.current.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    const left = Math.max(12, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - 12));
    const above = r.bottom + 360 > window.innerHeight && r.top > 360;
    setPos({ left, top: above ? r.top - 8 : r.bottom + 8, above });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    discover(id);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!pop.current?.contains(t) && !anchor.current?.contains(t)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [open, id, discover]);

  if (!term) return <>{children}</>;
  return (
    <>
      <button
        ref={anchor}
        type="button"
        className={`term${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {children ?? term.name}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={pop}
            role="dialog"
            aria-label={term.name}
            className={`term-pop${pos.above ? ' is-above' : ''}`}
            style={{ left: pos.left, top: pos.top }}
          >
            <TermCard term={term} onAction={() => setOpen(false)} />
          </div>,
          document.body,
        )}
    </>
  );
}
