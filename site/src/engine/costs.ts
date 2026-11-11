/**
 * Indicative capital and running costs for every placed component (technical note §8 a–g).
 * Rates are placeholders in US dollars for early comparison only. Phase 2 replaces them with an
 * editable cost library. Other currencies are converted with a user-set exchange rate.
 */
import { G, RHO_WATER } from './constants';
import { MATERIALS, type LayoutEdge, type LayoutNode, type NodeData } from './components';

export type CostCategory = 'civil' | 'piping' | 'mechanical' | 'electrical' | 'controls';

export interface CostLine {
  id: string;
  label: string;
  category: CostCategory;
  quantity: number;
  unit: string;
  /** Rate in USD per unit (after any size scaling). */
  rate: number;
  /** Fixed amount in USD added to quantity × rate. */
  fixed: number;
  capex: number;
  omPerYear: number;
  lifeYears: number;
}

export const CATEGORY_TERMS: Record<CostCategory, { omPct: number; life: number; label: string }> = {
  civil: { omPct: 0.5, life: 50, label: 'Civil works' },
  piping: { omPct: 0.8, life: 40, label: 'Piping & fittings' },
  mechanical: { omPct: 2.5, life: 30, label: 'Pump-turbines' },
  electrical: { omPct: 1.5, life: 30, label: 'Electrical' },
  controls: { omPct: 4, life: 15, label: 'Control & monitoring' },
};

const UPPER_RATES = {
  linedDam: { rate: 28, fixed: 200_000, label: 'Lined surface dam' },
  tank: { rate: 160, fixed: 50_000, label: 'Steel/concrete tank' },
  existingDam: { rate: 4, fixed: 100_000, label: 'Existing dam (rehabilitated)' },
} as const;

const LOWER_RATES = {
  excavated: { rate: 110, fixed: 500_000, label: 'Excavated underground chamber' },
  oldWorkings: { rate: 12, fixed: 250_000, label: 'Sealed old workings' },
  tank: { rate: 180, fixed: 80_000, label: 'Underground tank' },
} as const;

const MACHINE_RATES = { reversibleUnit: 1100, turbine: 800, pump: 600 } as const;

export interface CostContext {
  grossHead: number;
  /** Elevation lookup for pipe ends. */
  elevationOf: (nodeId: string) => number;
  /** Largest machine power on site [kW], used to size the transformer. */
  peakPowerKW: number;
}

/** Hydraulic power rating of a machine at gross head [kW]. */
export function machineRatingKW(data: NodeData, grossHead: number): number {
  const hydraulic = (q: number) => (RHO_WATER * G * Math.max(grossHead, 0) * q) / 1000;
  switch (data.kind) {
    case 'reversibleUnit':
      return Math.max(hydraulic(data.flow) * data.etaTurbine, hydraulic(data.flow) / data.etaPump);
    case 'turbine':
      return hydraulic(data.flow) * data.eta;
    case 'pump':
      return hydraulic(data.flow) / data.eta;
    default:
      return 0;
  }
}

function line(
  id: string,
  label: string,
  category: CostCategory,
  quantity: number,
  unit: string,
  rate: number,
  fixed = 0,
): CostLine {
  const capex = quantity * rate + fixed;
  const terms = CATEGORY_TERMS[category];
  return {
    id,
    label,
    category,
    quantity,
    unit,
    rate,
    fixed,
    capex,
    omPerYear: (capex * terms.omPct) / 100,
    lifeYears: terms.life,
  };
}

export function nodeCost(node: LayoutNode, ctx: CostContext): CostLine {
  const d = node.data;
  switch (d.kind) {
    case 'upperReservoir': {
      const r = UPPER_RATES[d.style];
      return line(node.id, r.label, 'civil', d.volume, 'm³', r.rate, r.fixed);
    }
    case 'lowerReservoir': {
      const r = LOWER_RATES[d.style];
      return line(node.id, r.label, 'civil', d.volume, 'm³', r.rate, r.fixed);
    }
    case 'reversibleUnit':
      return line(
        node.id,
        'Reversible pump-turbine',
        'mechanical',
        machineRatingKW(d, ctx.grossHead),
        'kW',
        MACHINE_RATES.reversibleUnit,
      );
    case 'turbine':
      return line(
        node.id,
        'Turbine & generator',
        'mechanical',
        machineRatingKW(d, ctx.grossHead),
        'kW',
        MACHINE_RATES.turbine,
      );
    case 'pump':
      return line(
        node.id,
        'Pump & motor',
        'mechanical',
        machineRatingKW(d, ctx.grossHead),
        'kW',
        MACHINE_RATES.pump,
      );
    case 'bend':
      return line(node.id, 'Bend', 'piping', 1, 'item', 15_000);
    case 'valve':
      return d.valveType === 'spherical'
        ? line(node.id, 'Spherical valve', 'piping', 1, 'item', 180_000)
        : line(node.id, 'Butterfly valve', 'piping', 1, 'item', 45_000);
    case 'transformer': {
      const kva = ctx.peakPowerKW / 0.9;
      return line(node.id, 'Transformer & switchgear', 'electrical', kva, 'kVA', 45, 80_000);
    }
    case 'controls':
      return line(node.id, 'Control & monitoring (SCADA)', 'controls', 1, 'system', 0, 300_000);
  }
}

export function pipeLength(edge: LayoutEdge, elevationOf: (id: string) => number): number {
  return Math.abs(elevationOf(edge.source) - elevationOf(edge.target)) + edge.data.horizontalRun;
}

export function pipeCost(edge: LayoutEdge, ctx: CostContext): CostLine {
  const m = MATERIALS[edge.data.material];
  const length = pipeLength(edge, ctx.elevationOf);
  // Supply cost grows with diameter and with the pressure the pipe must hold.
  const pressureFactor = 1 + Math.max(ctx.grossHead, 0) / 1000;
  const supply = 1800 * Math.pow(edge.data.diameter, 1.2) * m.costFactor * pressureFactor;
  const install = 350;
  return line(
    edge.id,
    `${m.label} pipe Ø${Math.round(edge.data.diameter * 1000)} mm`,
    'piping',
    length,
    'm',
    supply + install,
  );
}

export interface CostSummary {
  lines: CostLine[];
  totalCapex: number;
  totalOmPerYear: number;
  byCategory: Record<CostCategory, number>;
}

export function summariseCosts(lines: CostLine[]): CostSummary {
  const byCategory: Record<CostCategory, number> = {
    civil: 0,
    piping: 0,
    mechanical: 0,
    electrical: 0,
    controls: 0,
  };
  for (const l of lines) byCategory[l.category] += l.capex;
  return {
    lines,
    totalCapex: lines.reduce((s, l) => s + l.capex, 0),
    totalOmPerYear: lines.reduce((s, l) => s + l.omPerYear, 0),
    byCategory,
  };
}
