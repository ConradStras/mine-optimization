/**
 * Hand-drawn SVG for each component. Water levels, runner spin and flow direction are
 * driven by the playback state so the canvas shows what the numbers say.
 */
import { useId } from 'react';
import type { NodeData } from '../engine';

interface ArtProps {
  data: NodeData;
  /** Fill of this component's reservoir, 0–1. */
  fill: number;
  spinning: boolean;
  reverse: boolean;
  /** Seconds per runner revolution. */
  spinPeriod: number;
}

function Waves({ x, y, w, id }: { x: number; y: number; w: number; id: string }) {
  return (
    <g clipPath={`url(#${id})`}>
      <path
        className="art-wave"
        d={`M${x - 40} ${y} q 10 -3 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 v 6 H ${x - 40} z`}
        fill="var(--water-hi)"
        opacity={0.55}
        style={{ ['--wave-w' as string]: `${w}px` }}
      />
    </g>
  );
}

function UpperReservoir({ fill }: { fill: number }) {
  const uid = useId().replace(/:/g, '');
  const top = 18;
  const bottom = 74;
  const y = bottom - (bottom - top) * fill;
  // Water surface spans the sloped banks.
  const t = (y - top) / (bottom - top);
  const xl = 22 + 22 * t;
  const xr = 168 - 22 * t;
  return (
    <svg viewBox="0 0 190 86" className="art">
      <defs>
        <linearGradient id={`${uid}w`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--water-hi)" />
          <stop offset="1" stopColor="var(--water-deep)" />
        </linearGradient>
        <clipPath id={`${uid}c`}>
          <path d="M22 18 L168 18 L146 74 L44 74 Z" />
        </clipPath>
      </defs>
      <path d="M2 18 L22 18 L44 74 L146 74 L168 18 L188 18 L188 84 L2 84 Z" fill="var(--earth)" />
      <path d="M2 18 L22 18 M168 18 L188 18" stroke="var(--grass)" strokeWidth={4} strokeLinecap="round" />
      <path d="M22 18 L44 74 L146 74 L168 18" fill="var(--void)" stroke="var(--liner)" strokeWidth={2.5} />
      {fill > 0.005 && (
        <>
          <path d={`M${xl} ${y} L${xr} ${y} L146 74 L44 74 Z`} fill={`url(#${uid}w)`} />
          <Waves x={xl} y={y} w={xr - xl} id={`${uid}c`} />
        </>
      )}
    </svg>
  );
}

function LowerReservoir({ fill, style }: { fill: number; style: string }) {
  const uid = useId().replace(/:/g, '');
  const top = 12;
  const bottom = 76;
  const y = bottom - (bottom - top) * fill;
  return (
    <svg viewBox="0 0 190 86" className="art">
      <defs>
        <linearGradient id={`${uid}w`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--water-hi)" />
          <stop offset="1" stopColor="var(--water-deep)" />
        </linearGradient>
        <clipPath id={`${uid}c`}>
          <rect x="10" y="10" width="170" height="68" rx={style === 'tank' ? 6 : 22} />
        </clipPath>
        <pattern
          id={`${uid}r`}
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <path d="M0 0 V10" stroke="var(--rock-line)" strokeWidth="1.2" />
        </pattern>
      </defs>
      <rect
        x="2"
        y="2"
        width="186"
        height="82"
        rx={style === 'tank' ? 10 : 30}
        fill={`url(#${uid}r)`}
        opacity={0.9}
      />
      <rect
        x="10"
        y="10"
        width="170"
        height="68"
        rx={style === 'tank' ? 6 : 22}
        fill="var(--void)"
        stroke="var(--liner)"
        strokeWidth={2.5}
      />
      {fill > 0.005 && (
        <g clipPath={`url(#${uid}c)`}>
          <rect x="10" y={y} width="170" height={bottom - y + 4} fill={`url(#${uid}w)`} />
          <Waves x={10} y={y} w={170} id={`${uid}c`} />
        </g>
      )}
    </svg>
  );
}

function Machine({
  kind,
  spinning,
  reverse,
  spinPeriod,
}: { kind: 'reversibleUnit' | 'turbine' | 'pump' } & Omit<ArtProps, 'data' | 'fill'>) {
  const blades = Array.from({ length: 7 }, (_, i) => i * (360 / 7));
  const accent = kind === 'pump' ? 'var(--pump)' : kind === 'turbine' ? 'var(--accent)' : 'var(--accent)';
  return (
    <svg viewBox="0 0 84 84" className="art">
      {/* Spiral casing */}
      <path
        d="M42 6 a36 36 0 1 1 -33.5 23 L2 26 L14 18 a30 30 0 0 1 28 -12z"
        fill="var(--machine)"
        stroke="var(--machine-edge)"
        strokeWidth={2}
      />
      <circle cx="42" cy="42" r="25" fill="var(--void)" stroke="var(--machine-edge)" strokeWidth={2} />
      <g
        className="art-runner"
        style={{
          animationPlayState: spinning ? 'running' : 'paused',
          animationDirection: reverse ? 'reverse' : 'normal',
          animationDuration: `${spinPeriod}s`,
        }}
      >
        {blades.map((a) => (
          <path
            key={a}
            d="M42 42 C 46 34, 52 28, 60 24"
            stroke={accent}
            strokeWidth={3.2}
            fill="none"
            strokeLinecap="round"
            transform={`rotate(${a} 42 42)`}
          />
        ))}
        <circle cx="42" cy="42" r="6" fill={accent} />
      </g>
      <g transform="translate(70 70)">
        <circle r="11" fill="var(--panel)" stroke="var(--machine-edge)" strokeWidth={1.5} />
        {kind !== 'pump' && (
          <path
            d="M-4 -5 v8 m-3 -3 l3 3 l3 -3"
            stroke="var(--accent)"
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {kind !== 'turbine' && (
          <path
            d="M4 5 v-8 m-3 3 l3 -3 l3 3"
            stroke="var(--pump)"
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </g>
    </svg>
  );
}

function Bend() {
  return (
    <svg viewBox="0 0 44 44" className="art">
      <path
        d="M10 4 V22 a12 12 0 0 0 12 12 H40"
        fill="none"
        stroke="var(--pipe-casing)"
        strokeWidth={12}
        strokeLinecap="round"
      />
      <path
        d="M10 4 V22 a12 12 0 0 0 12 12 H40"
        fill="none"
        stroke="var(--pipe)"
        strokeWidth={7}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Valve({ spherical }: { spherical: boolean }) {
  return (
    <svg viewBox="0 0 44 44" className="art">
      <rect x="2" y="16" width="40" height="12" rx="3" fill="var(--pipe-casing)" />
      {spherical ? (
        <circle cx="22" cy="22" r="13" fill="var(--machine)" stroke="var(--machine-edge)" strokeWidth={2} />
      ) : (
        <path
          d="M8 10 L22 22 L8 34 Z M36 10 L22 22 L36 34 Z"
          fill="var(--machine)"
          stroke="var(--machine-edge)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}
      <path d="M22 22 V4 M15 4 H29" stroke="var(--machine-edge)" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

function Transformer() {
  return (
    <svg viewBox="0 0 110 64" className="art">
      <rect
        x="4"
        y="12"
        width="102"
        height="48"
        rx="6"
        fill="var(--machine)"
        stroke="var(--machine-edge)"
        strokeWidth={2}
      />
      {[20, 34, 48, 62, 76, 90].map((x) => (
        <rect key={x} x={x - 3} y="18" width="6" height="36" rx="2" fill="var(--void)" />
      ))}
      {[30, 55, 80].map((x) => (
        <g key={x}>
          <rect x={x - 4} y="2" width="8" height="12" rx="2" fill="var(--liner)" />
          <circle cx={x} cy="3" r="2.5" fill="var(--accent)" />
        </g>
      ))}
    </svg>
  );
}

function Controls() {
  return (
    <svg viewBox="0 0 110 64" className="art">
      <rect
        x="4"
        y="4"
        width="102"
        height="56"
        rx="8"
        fill="var(--machine)"
        stroke="var(--machine-edge)"
        strokeWidth={2}
      />
      <rect x="12" y="12" width="60" height="40" rx="4" fill="var(--void)" />
      <polyline
        points="16,42 26,34 34,38 44,24 54,30 66,18"
        fill="none"
        stroke="var(--good)"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx="88"
          cy={18 + i * 14}
          r="4"
          fill={i === 0 ? 'var(--good)' : i === 1 ? 'var(--accent)' : 'var(--liner)'}
        />
      ))}
    </svg>
  );
}

export function NodeArt(props: ArtProps) {
  const { data } = props;
  switch (data.kind) {
    case 'upperReservoir':
      return <UpperReservoir fill={props.fill} />;
    case 'lowerReservoir':
      return <LowerReservoir fill={props.fill} style={data.style} />;
    case 'reversibleUnit':
    case 'turbine':
    case 'pump':
      return (
        <Machine
          kind={data.kind}
          spinning={props.spinning}
          reverse={props.reverse}
          spinPeriod={props.spinPeriod}
        />
      );
    case 'bend':
      return <Bend />;
    case 'valve':
      return <Valve spherical={data.valveType === 'spherical'} />;
    case 'transformer':
      return <Transformer />;
    case 'controls':
      return <Controls />;
  }
}
