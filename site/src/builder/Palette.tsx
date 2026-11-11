import type { DragEvent } from 'react';
import type { ComponentKind } from '../engine';
import { Lock } from '../components/Icons';
import { STEPS, unlockedKinds } from '../learn/steps';
import { CATALOGUE, COMING_SOON, PALETTE_GROUPS } from '../model/catalogue';
import { useStore } from '../state/store';
import { NodeArt } from './NodeArt';
import { DEFAULT_NODE_DATA } from '../engine';

export const DRAG_MIME = 'application/x-shaftline-component';

function Thumb({ kind }: { kind: ComponentKind }) {
  return (
    <span className={`palette__thumb palette__thumb--${kind}`}>
      <NodeArt data={DEFAULT_NODE_DATA[kind]} fill={0.7} spinning={false} reverse={false} spinPeriod={1} />
    </span>
  );
}

export function Palette() {
  const guided = useStore((s) => s.guideMode === 'guided');
  const step = useStore((s) => s.step);
  const addComponent = useStore((s) => s.addComponent);
  const unlocked = guided ? unlockedKinds(step) : null;

  const onDragStart = (e: DragEvent, kind: ComponentKind) => {
    e.dataTransfer.setData(DRAG_MIME, kind);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <nav className="palette" aria-label="Components">
      {PALETTE_GROUPS.map((group) => (
        <section key={group} className="palette__group">
          <h3>{group}</h3>
          <ul>
            {Object.values(CATALOGUE)
              .filter((c) => c.group === group)
              .map((c) => {
                const locked = unlocked !== null && !unlocked.has(c.kind);
                const unlockStep = STEPS.findIndex((s) => s.unlocks.includes(c.kind));
                return (
                  <li key={c.kind}>
                    <button
                      type="button"
                      className={`palette__item${locked ? ' is-locked' : ''}`}
                      draggable={!locked}
                      onDragStart={(e) => onDragStart(e, c.kind)}
                      onClick={() => !locked && addComponent(c.kind)}
                      disabled={locked}
                      title={
                        locked ? `Unlocks at step ${unlockStep + 1}` : `Drag onto the mine, or click to add`
                      }
                      data-testid={`palette-${c.kind}`}
                    >
                      <Thumb kind={c.kind} />
                      <span className="palette__text">
                        <span className="palette__name">{c.name}</span>
                        <span className="palette__blurb">
                          {locked ? `Unlocks at step ${unlockStep + 1}` : c.blurb}
                        </span>
                      </span>
                      {locked && <Lock size={14} className="palette__lock" />}
                    </button>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
      <section className="palette__group palette__group--pipes">
        <h3>Pipes</h3>
        <p className="palette__tip">
          Drag from a <span className="dot" /> dot on one component to a dot on another to lay a pipe. Select
          a pipe to set its diameter and material.
        </p>
      </section>
      <section className="palette__group palette__group--soon">
        <h3>Coming next</h3>
        <ul>
          {COMING_SOON.map((c) => (
            <li key={c.name} className="palette__soon">
              <span className="palette__name">{c.name}</span>
              <span className="badge">Phase {c.phase}</span>
              <span className="palette__blurb">{c.blurb}</span>
            </li>
          ))}
        </ul>
      </section>
    </nav>
  );
}
