/**
 * On-canvas explainers. Each one points at the user's own system and fills the equation with
 * the user's own numbers, so a term is learnt from the thing they just built.
 */
import { useViewport } from '@xyflow/react';
import { useEffect, type ReactNode } from 'react';
import { G, RHO_WATER } from '../engine';
import { energy, hours, metres, num, pct, power } from '../lib/format';
import { useAnalysis } from '../state/context';
import { useStore } from '../state/store';
import { X } from '../components/Icons';
import { Term } from './Term';
import { TITLES } from './titles';

const fmtP = (w: number) => {
  const p = power(w);
  return `${p.value} ${p.unit}`;
};
const fmtE = (k: number) => {
  const e = energy(k);
  return `${e.value} ${e.unit}`;
};

/** Drawn in flow coordinates on top of the components. */
export function ExplainerLayer() {
  const explainer = useStore((s) => s.explainer);
  const nodes = useStore((s) => s.nodes);
  const { x, y, zoom } = useViewport();
  const { analysis } = useAnalysis();
  const upper = nodes.find((n) => n.id === analysis.upperId);
  const lower = nodes.find((n) => n.id === analysis.lowerId);
  if (explainer !== 'head' || !upper || !lower || analysis.grossHead <= 0) return null;

  const k = 1 / zoom;
  const ax = Math.min(upper.position.x, lower.position.x) - 130;
  const top = upper.position.y;
  const bottom = lower.position.y;
  const mid = (top + bottom) / 2;
  const drops = [0, 1, 2, 3];
  return (
    <svg className="explainer-layer" aria-hidden="true">
      <g transform={`translate(${x} ${y}) scale(${zoom})`}>
        <line
          x1={upper.position.x}
          x2={ax - 10 * k}
          y1={top}
          y2={top}
          className="xp-guide"
          strokeWidth={1.4 * k}
        />
        <line
          x1={lower.position.x}
          x2={ax - 10 * k}
          y1={bottom}
          y2={bottom}
          className="xp-guide"
          strokeWidth={1.4 * k}
        />
        <line x1={ax} x2={ax} y1={top} y2={bottom} className="xp-dim" strokeWidth={2.4 * k} />
        <path
          d={`M${ax - 7 * k} ${top + 12 * k} L${ax} ${top} L${ax + 7 * k} ${top + 12 * k}`}
          className="xp-dim"
          strokeWidth={2.4 * k}
          fill="none"
        />
        <path
          d={`M${ax - 7 * k} ${bottom - 12 * k} L${ax} ${bottom} L${ax + 7 * k} ${bottom - 12 * k}`}
          className="xp-dim"
          strokeWidth={2.4 * k}
          fill="none"
        />
        {drops.map((i) => (
          <circle
            key={i}
            cx={ax + 22 * k}
            cy={top}
            r={5 * k}
            className="xp-drop"
            style={{
              animationDelay: `${i * 0.45}s`,
              ['--fall' as string]: `${bottom - top}px`,
            }}
          />
        ))}
        <g transform={`translate(${ax + 40 * k} ${mid})`}>
          <rect x={0} y={-26 * k} width={130 * k} height={52 * k} rx={10 * k} className="xp-tag" />
          <text x={65 * k} y={-4 * k} fontSize={12 * k} textAnchor="middle" className="xp-tag__label">
            Gross head H
          </text>
          <text x={65 * k} y={16 * k} fontSize={17 * k} textAnchor="middle" className="xp-tag__value">
            {metres(analysis.grossHead)}
          </text>
        </g>
      </g>
    </svg>
  );
}

function Eq({ children }: { children: ReactNode }) {
  return <div className="xp-eq">{children}</div>;
}

/** Caption card in screen space, bottom-left of the canvas. */
export function ExplainerCard() {
  const explainer = useStore((s) => s.explainer);
  const show = useStore((s) => s.showExplainer);
  const setHighlight = useStore((s) => s.setHighlight);
  const setPanelTab = useStore((s) => s.setPanelTab);
  const { analysis } = useAnalysis();
  const c = analysis.cycle;

  // Light up the parts of the system the explainer talks about.
  useEffect(() => {
    if (!explainer) return;
    const dep =
      explainer === 'head'
        ? analysis.dependsOn.grossHead
        : explainer === 'friction'
          ? analysis.dependsOn.headLoss
          : explainer === 'turbine'
            ? analysis.dependsOn.power
            : explainer === 'pump'
              ? analysis.dependsOn.pumpPower
              : analysis.dependsOn.roundTripEfficiency;
    if (dep.nodeIds.length + dep.edgeIds.length > 0) setHighlight({ label: TITLES[explainer], ...dep });
    return () => setHighlight(null);
    // Re-run only when the explainer changes, not on every drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explainer]);

  if (!explainer) return null;

  let body: ReactNode = null;
  const H = analysis.grossHead;
  switch (explainer) {
    case 'head':
      body =
        H > 0 ? (
          <>
            <p>
              The water surfaces are <strong>{metres(H)}</strong> apart. That drop is the{' '}
              <Term id="grossHead">head</Term>. Every cubic metre that falls it releases its{' '}
              <Term id="potentialEnergy">potential energy</Term>:
            </p>
            <Eq>
              E = ρ·g·H = 1 000 × 9.81 × {num(H)} = <b>{num((RHO_WATER * G * H) / 3.6e6, 2)} kWh per m³</b>
            </Eq>
            {analysis.usableVolume > 0 && (
              <p>
                Your {num(analysis.usableVolume)} m³ of usable water stores{' '}
                <strong>{fmtE((RHO_WATER * G * H * analysis.usableVolume) / 3.6e6)}</strong>. Drag the lower
                reservoir deeper and watch it grow.
              </p>
            )}
          </>
        ) : (
          <p>Place the upper reservoir above the lower one to create a drop.</p>
        );
      break;
    case 'friction':
      body = c ? (
        <>
          <p>
            Water rubs along {num(c.generate.hydraulics.segments.length)} pipes and loses{' '}
            <strong>{num(c.generate.hydraulics.totalLoss, 1)} m</strong> of its {metres(H)} drop to{' '}
            <Term id="headLoss">friction</Term>. The fastest water moves at{' '}
            {num(c.generate.hydraulics.maxVelocity, 1)} m/s.
          </p>
          <Eq>
            h<sub>L</sub> = (f·L/D + ΣK)·v²/2g = <b>{num(c.generate.hydraulics.totalLoss, 1)} m</b> → net head{' '}
            <b>{num(c.generate.machineHead, 1)} m</b> ({pct(c.hydraulicEfficiencyGenerate)})
          </Eq>
          <p>Select a pipe and make it narrower: friction grows with the square of the velocity.</p>
        </>
      ) : (
        <p>Connect the reservoirs through a machine to see friction.</p>
      );
      break;
    case 'turbine':
      body = c ? (
        <>
          <p>
            The turbine turns the <Term id="netHead">net head</Term> and the <Term id="flowRate">flow</Term>{' '}
            into electricity:
          </p>
          <Eq>
            P = η·ρ·g·H<sub>net</sub>·Q = {num(analysis.spec?.turbine.efficiency, 2)} × 1 000 × 9.81 ×{' '}
            {num(c.generate.machineHead, 1)} × {num(c.generate.flow, 1)} ={' '}
            <b>{fmtP(c.generate.machinePower)}</b>
          </Eq>
          <p>
            Full power lasts <strong>{hours(c.generate.hours)}</strong> before the upper reservoir is empty.
          </p>
        </>
      ) : (
        <p>Add a turbine on a route between the reservoirs.</p>
      );
      break;
    case 'pump':
      body =
        c && !analysis.pumpAssumed ? (
          <>
            <p>
              Going up, friction works <em>against</em> you: the pump lifts {metres(H)} <em>plus</em>{' '}
              {num(c.pump.hydraulics.totalLoss, 1)} m of friction.
            </p>
            <Eq>
              P = ρ·g·H<sub>pump</sub>·Q / η = 1 000 × 9.81 × {num(c.pump.machineHead, 1)} ×{' '}
              {num(c.pump.flow, 1)} / {num(analysis.spec?.pump.efficiency, 2)} ={' '}
              <b>{fmtP(c.pump.machinePower)}</b>
            </Eq>
            <p>That is why pumping always takes more energy than generating gives back.</p>
          </>
        ) : (
          <p>Add a pump (or use a reversible pump-turbine) on a route between the reservoirs.</p>
        );
      break;
    case 'roundTrip':
      body =
        c && !analysis.pumpAssumed ? (
          <>
            <p>
              Follow 100 kWh from the grid through one full cycle. Each step keeps a share; what is left is
              the <Term id="roundTripEfficiency">round-trip efficiency</Term>.
            </p>
            <ol className="xp-chain">
              {c.losses.map((l) => (
                <li key={l.key}>
                  <span>{l.label}</span>
                  <span className="mono">−{num((l.kWh / c.gridEnergyIn) * 100, 1)}</span>
                </li>
              ))}
              <li className="xp-chain__total">
                <span>Back to the grid</span>
                <span className="mono">{num(c.roundTripEfficiency * 100, 1)} kWh</span>
              </li>
            </ol>
            <button className="btn btn--ghost btn--sm" onClick={() => setPanelTab('results')}>
              Open the energy waterfall
            </button>
          </>
        ) : (
          <p>The round trip needs both a generating and a pumping route.</p>
        );
      break;
  }

  return (
    <aside className="xp-card" role="dialog" aria-label={TITLES[explainer]}>
      <header>
        <span className="xp-card__kicker">Explainer</span>
        <h3>{TITLES[explainer]}</h3>
        <button className="icon-btn" aria-label="Close explainer" onClick={() => show(null)}>
          <X />
        </button>
      </header>
      <div className="xp-card__body">{body}</div>
    </aside>
  );
}
