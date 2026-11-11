import { useEffect, useMemo, useRef } from 'react';
import type { ComponentKind, NodeData } from '../engine';
import { Check, Play } from '../components/Icons';
import { useAnalysis } from '../state/context';
import { useStore } from '../state/store';
import { STEPS, type StepContext } from './steps';
import { Term } from './Term';

export function GuidePanel() {
  const step = useStore((s) => s.step);
  const setStep = useStore((s) => s.setStep);
  const played = useStore((s) => s.played);
  const nodes = useStore((s) => s.nodes);
  const showExplainer = useStore((s) => s.showExplainer);
  const setGuideMode = useStore((s) => s.setGuideMode);
  const { analysis } = useAnalysis();

  const ctx: StepContext = useMemo(
    () => ({
      analysis,
      played,
      kinds: new Set(nodes.map((n) => (n.data as NodeData).kind as ComponentKind)),
    }),
    [analysis, played, nodes],
  );
  const current = STEPS[step];
  const done = current ? current.done(ctx) : true;

  // The moment a step is achieved, play its explainer on the user's own system.
  const celebrated = useRef<number>(-1);
  useEffect(() => {
    if (current && done && celebrated.current !== step) {
      celebrated.current = step;
      showExplainer(current.explainer);
    }
  }, [done, step, current, showExplainer]);

  const finished = step >= STEPS.length;

  return (
    <section className="guide" aria-label="Guided build">
      <header className="guide__head">
        <span className="guide__kicker">Guided build</span>
        <span className="guide__count mono">
          {Math.min(step + 1, STEPS.length)}/{STEPS.length}
        </span>
      </header>
      <div className="guide__track" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span
            key={s.id}
            className={i < step || (i === step && done) ? 'is-done' : i === step ? 'is-now' : ''}
          />
        ))}
      </div>
      {finished ? (
        <div className="guide__step">
          <h3>You built a pumped storage plant</h3>
          <p>
            You have met head, friction, power, pumping and round-trip efficiency on your own design. Expert
            mode opens every component and the reference templates.
          </p>
          <div className="guide__actions">
            <button className="btn btn--primary btn--sm" onClick={() => setGuideMode('expert')}>
              Switch to expert mode
            </button>
            <a className="btn btn--ghost btn--sm" href="#/glossary">
              Review the glossary
            </a>
          </div>
        </div>
      ) : (
        current && (
          <div className={`guide__step${done ? ' is-done' : ''}`}>
            <h3>
              {done && <Check size={16} className="guide__tick" />}
              {current.title}
            </h3>
            <p>{current.instruction}</p>
            <p className="guide__hint">{current.hint}</p>
            <div className="guide__terms">
              <span>Terms</span>
              {current.terms.map((t) => (
                <Term key={t} id={t} />
              ))}
            </div>
            <div className="guide__actions">
              <button className="btn btn--ghost btn--sm" onClick={() => showExplainer(current.explainer)}>
                <Play size={12} /> Explain on my system
              </button>
              <button
                className="btn btn--primary btn--sm"
                disabled={!done}
                onClick={() => setStep(step + 1)}
                data-testid="guide-next"
              >
                {step === STEPS.length - 1 ? 'Finish' : 'Next step'}
              </button>
            </div>
          </div>
        )
      )}
      {step > 0 && !finished && (
        <button className="link guide__back" onClick={() => setStep(step - 1)}>
          ← Back a step
        </button>
      )}
    </section>
  );
}
