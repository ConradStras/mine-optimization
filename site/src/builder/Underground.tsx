/**
 * The mine behind the components: surface, rock strata, the shaft and headframe, a depth
 * ruler and the power cables. Drawn in flow coordinates (1 unit = 1 m vertically) so it pans
 * and zooms with the canvas.
 */
import { useViewport } from '@xyflow/react';
import { useMemo } from 'react';
import { num } from '../lib/format';
import { CATALOGUE } from '../model/catalogue';
import { useAnalysis } from '../state/context';
import { useStore } from '../state/store';

const STRATA = ['Overburden', 'Sandstone', 'Shale', 'Quartzite', 'Conglomerate', 'Dolerite sill', 'Lava'];
const BAND = 140;
const FAR = 6000;

export function Underground() {
  const { x, y, zoom } = useViewport();
  const nodes = useStore((s) => s.nodes);
  const playing = useStore((s) => s.playing);
  const mode = useStore((s) => s.mode);
  const { analysis } = useAnalysis();

  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: -400, maxX: 600, maxDepth: 500 };
    let minX = Infinity;
    let maxX = -Infinity;
    let maxDepth = 0;
    for (const n of nodes) {
      const item = CATALOGUE[n.data.kind];
      minX = Math.min(minX, n.position.x - item.size.w / 2);
      maxX = Math.max(maxX, n.position.x + item.size.w / 2);
      maxDepth = Math.max(maxDepth, n.position.y + item.size.h / 2);
    }
    return { minX: Math.min(minX, -120), maxX: Math.max(maxX, 120), maxDepth: Math.max(maxDepth, 300) };
  }, [nodes]);

  const machines = nodes.filter((n) => ['reversibleUnit', 'turbine', 'pump'].includes(n.data.kind));
  const transformer = nodes.find((n) => n.data.kind === 'transformer');
  const activeMachine =
    mode === 'generate' ? analysis.routes.generate?.machineId : analysis.routes.pump?.machineId;

  const k = 1 / zoom; // keep text and strokes a constant size on screen
  const rulerX = bounds.minX - 70;
  const labelX = bounds.maxX + 90;
  const shaftBottom = bounds.maxDepth + 40;
  const bands = Math.ceil((bounds.maxDepth + 600) / BAND);
  const tickStep = zoom < 0.35 ? 200 : zoom < 0.8 ? 100 : 50;
  const ticks: number[] = [];
  for (let d = 0; d <= bounds.maxDepth + 100; d += tickStep) ticks.push(d);

  return (
    <svg className="underground" aria-hidden="true">
      <defs>
        <pattern
          id="ug-hatch"
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(35)"
        >
          <path d="M0 0 V14" stroke="var(--rock-line)" strokeWidth="1" />
        </pattern>
        <pattern id="ug-dots" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="1.3" fill="var(--rock-line)" />
          <circle cx="13" cy="12" r="1" fill="var(--rock-line)" />
        </pattern>
        <linearGradient id="ug-depth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--stratum-top)" />
          <stop offset="1" stopColor="var(--stratum-deep)" />
        </linearGradient>
        <linearGradient id="ug-shaft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--shaft-edge)" />
          <stop offset="0.5" stopColor="var(--shaft)" />
          <stop offset="1" stopColor="var(--shaft-edge)" />
        </linearGradient>
      </defs>
      <g transform={`translate(${x} ${y}) scale(${zoom})`}>
        {/* Rock */}
        <rect x={-FAR} y={0} width={FAR * 2} height={bands * BAND} fill="url(#ug-depth)" />
        {Array.from({ length: bands }, (_, i) => (
          <g key={i}>
            <rect
              x={-FAR}
              y={i * BAND}
              width={FAR * 2}
              height={BAND}
              fill={i % 2 ? 'url(#ug-hatch)' : 'url(#ug-dots)'}
              opacity={0.55}
            />
            <line x1={-FAR} x2={FAR} y1={i * BAND} y2={i * BAND} stroke="var(--rock-line)" strokeWidth={k} />
            <text x={labelX} y={i * BAND + 18 * k} className="ug-stratum" fontSize={11 * k}>
              {STRATA[i % STRATA.length]}
            </text>
          </g>
        ))}
        {/* Surface */}
        <rect x={-FAR} y={-3 * k} width={FAR * 2} height={6 * k} fill="var(--grass)" />

        {/* Shaft and headframe */}
        <rect x={-38} y={0} width={76} height={shaftBottom} fill="url(#ug-shaft)" />
        <rect x={-38} y={shaftBottom - 6} width={76} height={6} fill="var(--shaft-edge)" />
        {Array.from({ length: Math.floor(shaftBottom / 40) }, (_, i) => (
          <line
            key={i}
            x1={-38}
            x2={38}
            y1={(i + 1) * 40}
            y2={(i + 1) * 40}
            stroke="var(--shaft-edge)"
            strokeWidth={1.5}
            opacity={0.6}
          />
        ))}
        <g
          className="ug-headframe"
          stroke="var(--headframe)"
          strokeWidth={4}
          fill="none"
          strokeLinejoin="round"
        >
          <path d="M-46 0 L-14 -120 L14 -120 L46 0" />
          <path d="M-36 -40 L36 -40 M-26 -80 L26 -80 M-46 0 L26 -80 M46 0 L-26 -80" strokeWidth={2.2} />
          <path d="M14 -120 L96 0" strokeWidth={3} />
          <circle cx="0" cy="-124" r="11" strokeWidth={3} />
        </g>
        <text x={-52} y={-8 * k} className="ug-surface" fontSize={11 * k} textAnchor="end">
          Collar
        </text>

        {/* Power cables down the shaft */}
        {transformer &&
          machines.map((m) => {
            const xs = 26;
            const d = `M${transformer.position.x} ${transformer.position.y + 32} V ${-8} H ${xs} V ${m.position.y} H ${m.position.x}`;
            const live = playing && m.id === activeMachine;
            return (
              <path
                key={m.id}
                d={d}
                className={`ug-cable${live ? ' is-live' : ''}`}
                strokeWidth={2.5 * Math.max(k, 1)}
                style={live ? { animationDirection: mode === 'generate' ? 'reverse' : 'normal' } : undefined}
              />
            );
          })}

        {/* Depth ruler */}
        <g className="ug-ruler">
          <line x1={rulerX} x2={rulerX} y1={0} y2={bounds.maxDepth + 100} strokeWidth={1.2 * k} />
          {ticks.map((d) => (
            <g key={d}>
              <line x1={rulerX} x2={rulerX + 5 * k} y1={d} y2={d} strokeWidth={1.2 * k} />
              <text x={rulerX + 8 * k} y={d + 4 * k} fontSize={11 * k}>
                {d === 0 ? '0 m' : `−${num(d)} m`}
              </text>
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}
