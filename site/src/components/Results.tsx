import { useState, type ReactNode } from 'react';
import { CATEGORY_TERMS, type CostCategory, type CurvePoint, type MetricKey } from '../engine';
import { Term } from '../learn/Term';
import { energy, hours, metres, money, num, pct, power } from '../lib/format';
import { useAnalysis, useMoney } from '../state/context';
import { useStore } from '../state/store';
import { Alert, Info, Stop } from './Icons';

/* ---------- KPI tiles ---------- */

interface Tile {
  metric?: MetricKey;
  termId: string;
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: 'gen' | 'pump' | 'good' | 'muted';
  /** Raw number for comparing with the pinned baseline. */
  raw?: number;
  better?: 'up' | 'down';
  fmtDelta?: (d: number) => string;
}

function Delta({ t }: { t: Tile }) {
  const baseline = useStore((s) => s.baseline);
  const before = baseline?.[t.label];
  if (before === undefined || t.raw === undefined || !t.fmtDelta) return null;
  const d = t.raw - before;
  const rel = before !== 0 ? Math.abs(d / before) : Math.abs(d);
  if (rel < 0.002) return <span className="delta delta--same">= baseline</span>;
  const good = t.better === undefined ? undefined : d > 0 === (t.better === 'up');
  return (
    <span className={`delta ${good === undefined ? '' : good ? 'delta--good' : 'delta--bad'}`}>
      {d > 0 ? '▲' : '▼'} {t.fmtDelta(Math.abs(d))}
    </span>
  );
}

function KpiTile({ t }: { t: Tile }) {
  const { analysis } = useAnalysis();
  const setHighlight = useStore((s) => s.setHighlight);
  const highlight = useStore((s) => s.highlight);
  const on = highlight?.label === t.label;
  return (
    <div className={`kpi${t.tone ? ` kpi--${t.tone}` : ''}${on ? ' is-on' : ''}`}>
      <div className="kpi__label">
        <Term id={t.termId}>{t.label}</Term>
      </div>
      <div className="kpi__value">
        <span className="mono">{t.value}</span>
        {t.unit && <span className="kpi__unit">{t.unit}</span>}
      </div>
      {t.sub && <div className="kpi__sub">{t.sub}</div>}
      <Delta t={t} />
      {t.metric && (
        <button
          className="kpi__trace"
          aria-pressed={on}
          title="Highlight what affects this on the canvas"
          onClick={() => setHighlight(on ? null : { label: t.label, ...analysis.dependsOn[t.metric!] })}
        >
          Trace
        </button>
      )}
    </div>
  );
}

export function Kpis() {
  const { analysis } = useAnalysis();
  const m = useMoney();
  const baseline = useStore((s) => s.baseline);
  const setBaseline = useStore((s) => s.setBaseline);
  const c = analysis.cycle;
  const gen = power(c?.generate.gridPower);
  const pmp = power(c && !analysis.pumpAssumed ? c.pump.gridPower : undefined);
  const stored = energy(c?.gridEnergyOut);
  const tiles: Tile[] = [
    {
      metric: 'power',
      termId: 'turbine',
      label: 'Generating power',
      value: gen.value,
      unit: gen.unit,
      sub: 'at the grid',
      tone: 'gen',
      raw: c ? c.generate.gridPower / 1e6 : undefined,
      better: 'up',
      fmtDelta: (d) => `${num(d, 1)} MW`,
    },
    {
      metric: 'pumpPower',
      termId: 'pump',
      label: 'Pumping power',
      value: pmp.value,
      unit: pmp.unit,
      sub: analysis.pumpAssumed ? 'needs a pumping route' : 'drawn from the grid',
      tone: 'pump',
      raw: c && !analysis.pumpAssumed ? c.pump.gridPower / 1e6 : undefined,
      fmtDelta: (d) => `${num(d, 1)} MW`,
    },
    {
      metric: 'storedEnergy',
      termId: 'potentialEnergy',
      label: 'Energy per cycle',
      value: stored.value,
      unit: stored.unit,
      sub: 'delivered to the grid',
      raw: c ? c.gridEnergyOut / 1000 : undefined,
      better: 'up',
      fmtDelta: (d) => `${num(d, 1)} MWh`,
    },
    {
      metric: 'duration',
      termId: 'duration',
      label: 'Duration',
      value: c ? hours(c.generate.hours) : '—',
      sub: 'at full power',
      raw: c?.generate.hours,
      fmtDelta: (d) => hours(d),
    },
    {
      metric: 'roundTripEfficiency',
      termId: 'roundTripEfficiency',
      label: 'Round-trip efficiency',
      value: c && !analysis.pumpAssumed ? num(c.roundTripEfficiency * 100, 1) : '—',
      unit: '%',
      sub: 'typical small PSH: 70–80%',
      tone: 'good',
      raw: c && !analysis.pumpAssumed ? c.roundTripEfficiency * 100 : undefined,
      better: 'up',
      fmtDelta: (d) => `${num(d, 1)} pts`,
    },
    {
      metric: 'netHead',
      termId: 'netHead',
      label: 'Net head',
      value: c ? num(c.generate.machineHead, 0) : '—',
      unit: 'm',
      sub:
        analysis.grossHead > 0
          ? `of ${metres(analysis.grossHead)} gross · ${pct(c?.hydraulicEfficiencyGenerate)}`
          : undefined,
      raw: c?.generate.machineHead,
      better: 'up',
      fmtDelta: (d) => `${num(d, 1)} m`,
    },
    {
      metric: 'capex',
      termId: 'capex',
      label: 'Capital cost',
      value: money(analysis.costs.totalCapex, m),
      sub: `${money(analysis.costs.totalOmPerYear, m)} O&M / year`,
      raw: analysis.costs.totalCapex,
      better: 'down',
      fmtDelta: (d) => money(d, m),
    },
    {
      termId: 'costPerKW',
      label: 'Cost per kW · per kWh',
      value: analysis.capexPerKW ? money(analysis.capexPerKW, m, 0) : '—',
      sub: analysis.capexPerKWh ? `${money(analysis.capexPerKWh, m, 0)} per kWh stored` : undefined,
      tone: 'muted',
      raw: analysis.capexPerKW,
      better: 'down',
      fmtDelta: (d) => money(d, m, 0),
    },
  ];
  const pin = () =>
    setBaseline(Object.fromEntries(tiles.filter((t) => t.raw !== undefined).map((t) => [t.label, t.raw!])));
  return (
    <div className="kpi-block">
      <div className="kpi-block__bar">
        {baseline ? (
          <>
            <span className="kpi-block__note">
              <span className="dot dot--pin" /> Comparing with your pinned design
            </span>
            <button className="btn btn--ghost btn--sm" onClick={pin}>
              Re-pin
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setBaseline(null)}>
              Clear
            </button>
          </>
        ) : (
          <>
            <span className="kpi-block__note">Try a change and compare it with this design.</span>
            <button className="btn btn--ghost btn--sm" onClick={pin} disabled={!c} data-testid="pin">
              Pin as baseline
            </button>
          </>
        )}
      </div>
      <div className="kpis" data-testid="kpis">
        {tiles.map((t) => (
          <KpiTile key={t.label} t={t} />
        ))}
      </div>
    </div>
  );
}

/* ---------- Issues ---------- */

export function Issues() {
  const { analysis } = useAnalysis();
  const setHighlight = useStore((s) => s.setHighlight);
  if (analysis.issues.length === 0)
    return (
      <p className="issues-ok">
        <span className="dot dot--good" /> No issues. The layout makes engineering sense.
      </p>
    );
  const order = { error: 0, warning: 1, info: 2 };
  return (
    <ul className="issues">
      {[...analysis.issues]
        .sort((a, b) => order[a.severity] - order[b.severity])
        .map((i) => (
          <li key={i.id} className={`issue issue--${i.severity}`}>
            <span className="issue__icon" aria-label={i.severity}>
              {i.severity === 'error' ? (
                <Stop size={15} />
              ) : i.severity === 'warning' ? (
                <Alert size={15} />
              ) : (
                <Info size={15} />
              )}
            </span>
            <span className="issue__text">
              {i.message}{' '}
              {(i.nodeIds.length > 0 || i.edgeIds.length > 0) && (
                <button
                  className="link"
                  onClick={() =>
                    setHighlight({ label: 'this check', nodeIds: i.nodeIds, edgeIds: i.edgeIds })
                  }
                >
                  Show
                </button>
              )}
              {i.termId && (
                <>
                  {' · '}
                  <Term id={i.termId}>Why?</Term>
                </>
              )}
            </span>
          </li>
        ))}
    </ul>
  );
}

/* ---------- Energy waterfall ---------- */

export function LossWaterfall() {
  const { analysis } = useAnalysis();
  const [hover, setHover] = useState<number | null>(null);
  const c = analysis.cycle;
  if (!c || analysis.pumpAssumed)
    return (
      <p className="chart-empty">
        Build a generating and a pumping route to follow the energy through a full cycle.
      </p>
    );

  const total = c.gridEnergyIn;
  const rows: { label: string; value: number; start: number; kind: 'energy' | 'loss' }[] = [];
  let running = total;
  rows.push({ label: 'Grid in', value: total, start: 0, kind: 'energy' });
  for (const l of c.losses) {
    running -= l.kWh;
    rows.push({ label: l.label, value: l.kWh, start: running, kind: 'loss' });
  }
  rows.push({ label: 'Grid out', value: c.gridEnergyOut, start: 0, kind: 'energy' });

  const W = 340;
  const labelW = 132;
  const valueW = 64;
  const plotW = W - labelW - valueW;
  const rowH = 22;
  const H = rows.length * rowH + 6;
  const x = (v: number) => labelW + (v / total) * plotW;

  return (
    <figure className="chart" aria-label="Where the energy goes in one cycle">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Energy waterfall from grid in to grid out">
        {rows.map((r, i) => {
          const y = i * rowH + 3;
          const x0 = x(r.start);
          const w = Math.max((r.value / total) * plotW, 1.5);
          const share = r.value / total;
          return (
            <g
              key={r.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className={hover !== null && hover !== i ? 'is-faded' : ''}
            >
              <rect x={0} y={y - 2} width={W} height={rowH} fill="transparent" />
              <text x={labelW - 8} y={y + rowH / 2 + 1} textAnchor="end" className="chart__label">
                {r.label}
              </text>
              {r.kind === 'loss' && (
                <line
                  x1={x(r.start + r.value)}
                  x2={x(r.start + r.value)}
                  y1={y - rowH + 15}
                  y2={y + 3}
                  className="chart__connector"
                />
              )}
              <rect
                x={x0}
                y={y + 3}
                width={w}
                height={rowH - 8}
                rx={3}
                className={r.kind === 'energy' ? 'bar bar--energy' : 'bar bar--loss'}
              />
              <text x={W - 2} y={y + rowH / 2 + 1} textAnchor="end" className="chart__value">
                {r.kind === 'loss' ? `−${num(share * 100, 1)}%` : `${num(share * 100, 1)}%`}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="legend">
        <span>
          <i className="swatch swatch--energy" /> Energy
        </span>
        <span>
          <i className="swatch swatch--loss" /> Loss
        </span>
        <span className="legend__note">
          {hover !== null && rows[hover]
            ? `${rows[hover]!.label}: ${energy(rows[hover]!.value).value} ${energy(rows[hover]!.value).unit}`
            : 'Hover a row for kWh'}
        </span>
      </figcaption>
    </figure>
  );
}

/* ---------- Trade-off curves ---------- */

function LineChart({
  points,
  y,
  current,
  xLabel,
  yLabel,
  fmtX,
  fmtY,
  tone,
}: {
  points: CurvePoint[];
  y: (p: CurvePoint) => number;
  current: number;
  xLabel: string;
  yLabel: string;
  fmtX: (v: number) => string;
  fmtY: (v: number) => string;
  tone: 'gen' | 'good';
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 300;
  const H = 150;
  const pad = { l: 40, r: 10, t: 12, b: 26 };
  const xs = points.map((p) => p.x);
  const ys = points.map(y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMax = Math.max(...ys) * 1.08 || 1;
  const yMin = 0;
  const sx = (v: number) => pad.l + ((v - xMin) / (xMax - xMin)) * (W - pad.l - pad.r);
  const sy = (v: number) => H - pad.b - ((v - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(y(p)).toFixed(1)}`).join(' ');
  // Current design point: interpolate on the curve.
  const ci = points.findIndex((p) => p.x >= current);
  const cp = ci > 0 ? points[ci - 1]! : points[0]!;
  const cn = ci >= 0 ? points[ci]! : points[points.length - 1]!;
  const f = cn.x === cp.x ? 0 : (current - cp.x) / (cn.x - cp.x);
  const cy = y(cp) + (y(cn) - y(cp)) * f;
  const gridY = [0, 0.25, 0.5, 0.75, 1].map((t) => yMin + (yMax - yMin) * t);
  const h = hover !== null ? points[hover] : undefined;

  return (
    <div className="linechart">
      <div className="linechart__title">{yLabel}</div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${yLabel} against ${xLabel}`}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          let best = 0;
          points.forEach((p, i) => {
            if (Math.abs(sx(p.x) - px) < Math.abs(sx(points[best]!.x) - px)) best = i;
          });
          setHover(best);
        }}
        onMouseLeave={() => setHover(null)}
      >
        {gridY.map((g) => (
          <g key={g}>
            <line x1={pad.l} x2={W - pad.r} y1={sy(g)} y2={sy(g)} className="chart__grid" />
            <text x={pad.l - 6} y={sy(g) + 3} textAnchor="end" className="chart__tick">
              {fmtY(g)}
            </text>
          </g>
        ))}
        {[0, 0.5, 1].map((t) => {
          const v = xMin + (xMax - xMin) * t;
          return (
            <text
              key={t}
              x={sx(v)}
              y={H - 8}
              textAnchor={t === 0 ? 'start' : t === 1 ? 'end' : 'middle'}
              className="chart__tick"
            >
              {fmtX(v)}
            </text>
          );
        })}
        <path d={d} className={`line line--${tone}`} />
        <line x1={sx(current)} x2={sx(current)} y1={pad.t} y2={H - pad.b} className="chart__now-line" />
        <circle cx={sx(current)} cy={sy(cy)} r={5} className={`dot-mark dot-mark--${tone}`} />
        {h && (
          <g>
            <line x1={sx(h.x)} x2={sx(h.x)} y1={pad.t} y2={H - pad.b} className="chart__crosshair" />
            <circle cx={sx(h.x)} cy={sy(y(h))} r={4} className={`dot-mark dot-mark--${tone}`} />
          </g>
        )}
      </svg>
      <div className="linechart__foot">
        {h ? (
          <span>
            {fmtX(h.x)} → <b className="mono">{fmtY(y(h))}</b>
          </span>
        ) : (
          <span>
            <i className="ring" /> your design: <b className="mono">{fmtY(cy)}</b>
          </span>
        )}
        <span className="linechart__x">{xLabel}</span>
      </div>
    </div>
  );
}

export function TradeOffs() {
  const { analysis, sweeps } = useAnalysis();
  const [axis, setAxis] = useState<'flow' | 'diameter'>('flow');
  if (!sweeps || !analysis.spec)
    return <p className="chart-empty">Connect a turbine between the reservoirs to explore trade-offs.</p>;
  const pts = axis === 'flow' ? sweeps.flow : sweeps.diameter;
  const current = axis === 'flow' ? analysis.spec.turbine.flow : 1;
  const fmtX = axis === 'flow' ? (v: number) => `${num(v, 1)} m³/s` : (v: number) => `${num(v * 100, 0)}%`;
  const xLabel = axis === 'flow' ? 'flow rate' : 'pipe diameter vs yours';
  return (
    <div>
      <div className="segmented segmented--sm" role="radiogroup" aria-label="Vary">
        <button
          role="radio"
          aria-checked={axis === 'flow'}
          className={axis === 'flow' ? 'is-on' : ''}
          onClick={() => setAxis('flow')}
        >
          Vary flow
        </button>
        <button
          role="radio"
          aria-checked={axis === 'diameter'}
          className={axis === 'diameter' ? 'is-on' : ''}
          onClick={() => setAxis('diameter')}
        >
          Vary pipe size
        </button>
      </div>
      <p className="chart-note">
        {axis === 'flow'
          ? 'More flow gives more power until friction (∝ Q²) wins. Efficiency falls all the way.'
          : 'Wider pipes recover head lost to friction, with diminishing returns. Compare with their cost.'}
      </p>
      <div className="smallmultiples">
        <LineChart
          points={pts}
          y={(p) => p.power / 1e6}
          current={current}
          xLabel={xLabel}
          yLabel="Generating power (MW)"
          fmtX={fmtX}
          fmtY={(v) => num(v, v < 10 ? 1 : 0)}
          tone="gen"
        />
        <LineChart
          points={pts}
          y={(p) => p.rte * 100}
          current={current}
          xLabel={xLabel}
          yLabel="Round-trip efficiency (%)"
          fmtX={fmtX}
          fmtY={(v) => num(v, 0)}
          tone="good"
        />
      </div>
    </div>
  );
}

/* ---------- Capital cost breakdown ---------- */

const CATS: CostCategory[] = ['civil', 'piping', 'mechanical', 'electrical', 'controls'];

export function CapexBar() {
  const { analysis } = useAnalysis();
  const m = useMoney();
  const total = analysis.costs.totalCapex;
  if (total <= 0) return <p className="chart-empty">Place components to see their cost.</p>;
  return (
    <figure className="capex">
      <div className="capex__bar" role="img" aria-label="Capital cost by category">
        {CATS.map((c, i) => {
          const v = analysis.costs.byCategory[c];
          if (v <= 0) return null;
          return (
            <span
              key={c}
              className={`capex__seg s${i + 1}`}
              style={{ flexGrow: v }}
              title={`${CATEGORY_TERMS[c].label}: ${money(v, m)}`}
            />
          );
        })}
      </div>
      <figcaption>
        <ul className="capex__legend">
          {CATS.map((c, i) => {
            const v = analysis.costs.byCategory[c];
            return (
              <li key={c}>
                <i className={`swatch s${i + 1}`} />
                <span>{CATEGORY_TERMS[c].label}</span>
                <span className="mono">{money(v, m)}</span>
                <span className="mono capex__pct">{pct(v / total, 0)}</span>
              </li>
            );
          })}
        </ul>
      </figcaption>
    </figure>
  );
}

export function BillOfQuantities() {
  const { analysis } = useAnalysis();
  const m = useMoney();
  const select = useStore((s) => s.select);
  const lines = [...analysis.costs.lines].sort((a, b) => b.capex - a.capex);
  return (
    <div className="boq">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th className="num">Quantity</th>
            <th className="num">CAPEX</th>
            <th className="num">O&amp;M / yr</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr
              key={l.id}
              onClick={() => select(l.id)}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && select(l.id)}
            >
              <td>{l.label}</td>
              <td className="num mono">
                {num(l.quantity, l.quantity < 10 ? 1 : 0)} {l.unit}
              </td>
              <td className="num mono">{money(l.capex, m)}</td>
              <td className="num mono">{money(l.omPerYear, m)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td />
            <td className="num mono">{money(analysis.costs.totalCapex, m)}</td>
            <td className="num mono">{money(analysis.costs.totalOmPerYear, m)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="chart-note">
        Indicative 2026 rates for early comparison, excluding owner’s costs, contingency and VAT.
      </p>
    </div>
  );
}

export function Section({
  title,
  children,
  aside,
}: {
  title: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="rsection">
      <header>
        <h3>{title}</h3>
        {aside}
      </header>
      {children}
    </section>
  );
}
