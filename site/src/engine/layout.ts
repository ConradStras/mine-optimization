/**
 * Turns the layout an engineer builds on the canvas into a SystemSpec, then runs the physics
 * and costs. Also explains itself: issues (never blocking) and which components each headline
 * number depends on, so the UI can highlight them.
 */
import { WATER } from './constants';
import {
  INTAKE_K,
  MATERIALS,
  OUTLET_K,
  canGenerate,
  canPump,
  isHydraulic,
  isMachine,
  type Layout,
  type LayoutEdge,
  type LayoutNode,
  type NodeData,
} from './components';
import { machineRatingKW, nodeCost, pipeCost, pipeLength, summariseCosts, type CostSummary } from './costs';
import { simulateCycle, type CycleResult, type MachineSpec, type SystemSpec } from './cycle';
import type { PipeSegment } from './hydraulics';

export interface AnalysisSettings {
  /** Share of the smaller reservoir that is cycled each time [0–1]. */
  usableFraction: number;
}

export const DEFAULT_SETTINGS: AnalysisSettings = { usableFraction: 0.9 };

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface Issue {
  id: string;
  severity: IssueSeverity;
  message: string;
  nodeIds: string[];
  edgeIds: string[];
  /** Glossary term that explains the issue. */
  termId?: string;
}

export interface Route {
  nodeIds: string[];
  edgeIds: string[];
  machineId: string;
}

export type MetricKey =
  | 'grossHead'
  | 'storedEnergy'
  | 'headLoss'
  | 'netHead'
  | 'power'
  | 'pumpPower'
  | 'roundTripEfficiency'
  | 'duration'
  | 'capex';

export interface Dependency {
  nodeIds: string[];
  edgeIds: string[];
}

export interface EdgeFlow {
  length: number;
  generateVelocity?: number;
  pumpVelocity?: number;
  /** Friction + fitting loss on this pipe while generating [m]. */
  generateLoss?: number;
}

export interface Analysis {
  upperId?: string;
  lowerId?: string;
  grossHead: number;
  usableVolume: number;
  routes: { generate?: Route; pump?: Route };
  spec?: SystemSpec;
  cycle?: CycleResult;
  /** True when no pumping route exists and pumping figures are assumed from the generating route. */
  pumpAssumed: boolean;
  /** True when no transformer is placed, so electrical losses are left out. */
  electricalAssumed: boolean;
  issues: Issue[];
  costs: CostSummary;
  edgeFlows: Record<string, EdgeFlow>;
  dependsOn: Record<MetricKey, Dependency>;
  /** Capital cost per kW of generating capacity [USD/kW] and per kWh stored [USD/kWh]. */
  capexPerKW?: number;
  capexPerKWh?: number;
}

const MAX_ROUTES = 500;

/** All simple routes between two nodes through hydraulic components. */
export function findRoutes(layout: Layout, from: string, to: string): { nodeIds: string[]; edgeIds: string[] }[] {
  const kindOf = new Map(layout.nodes.map((n) => [n.id, n.data.kind]));
  const adjacency = new Map<string, { edge: LayoutEdge; other: string }[]>();
  for (const e of layout.edges) {
    if (!kindOf.has(e.source) || !kindOf.has(e.target)) continue;
    adjacency.set(e.source, [...(adjacency.get(e.source) ?? []), { edge: e, other: e.target }]);
    adjacency.set(e.target, [...(adjacency.get(e.target) ?? []), { edge: e, other: e.source }]);
  }
  const results: { nodeIds: string[]; edgeIds: string[] }[] = [];
  const visit = (node: string, nodes: string[], edges: string[]) => {
    if (results.length >= MAX_ROUTES) return;
    if (node === to) {
      results.push({ nodeIds: nodes, edgeIds: edges });
      return;
    }
    for (const { edge, other } of adjacency.get(node) ?? []) {
      if (nodes.includes(other)) continue;
      const kind = kindOf.get(other);
      if (!kind || !isHydraulic(kind)) continue;
      // Do not pass through another reservoir on the way.
      if ((kind === 'upperReservoir' || kind === 'lowerReservoir') && other !== to) continue;
      visit(other, [...nodes, other], [...edges, edge.id]);
    }
  };
  visit(from, [from], []);
  return results;
}

function pickRoute(
  routes: { nodeIds: string[]; edgeIds: string[] }[],
  byId: Map<string, LayoutNode>,
  mode: 'generate' | 'pump',
): Route | undefined {
  const fits = mode === 'generate' ? canGenerate : canPump;
  const candidates = routes
    .map((r) => {
      const machines = r.nodeIds.filter((id) => {
        const n = byId.get(id);
        return n !== undefined && isMachine(n.data.kind);
      });
      return { r, machines };
    })
    // Exactly one machine on the route, and it must work in this mode.
    .filter(({ machines }) => machines.length === 1 && fits(byId.get(machines[0]!)!.data.kind))
    // Prefer the shortest route (fewest pipes).
    .sort((a, b) => a.r.edgeIds.length - b.r.edgeIds.length);
  const best = candidates[0];
  return best ? { ...best.r, machineId: best.machines[0]! } : undefined;
}

function routeSegments(
  route: Route,
  edgesById: Map<string, LayoutEdge>,
  byId: Map<string, LayoutNode>,
  elevationOf: (id: string) => number,
): PipeSegment[] {
  const segments: PipeSegment[] = route.edgeIds.map((id) => {
    const e = edgesById.get(id)!;
    return {
      id,
      length: pipeLength(e, elevationOf),
      diameter: e.data.diameter,
      roughness: MATERIALS[e.data.material].roughness,
      minorK: 0,
    };
  });
  // Each fitting's loss coefficient goes to the pipe that leaves it along the route.
  route.nodeIds.forEach((nodeId, i) => {
    const d = byId.get(nodeId)?.data;
    if (!d || (d.kind !== 'bend' && d.kind !== 'valve')) return;
    const seg = segments[Math.min(i, segments.length - 1)];
    if (seg) seg.minorK += d.k;
  });
  if (segments.length > 0) {
    segments[0]!.minorK += INTAKE_K;
    segments[segments.length - 1]!.minorK += OUTLET_K;
  }
  return segments;
}

function machineSpec(data: NodeData, mode: 'generate' | 'pump'): MachineSpec {
  switch (data.kind) {
    case 'reversibleUnit':
      return { flow: data.flow, efficiency: mode === 'generate' ? data.etaTurbine : data.etaPump };
    case 'turbine':
    case 'pump':
      return { flow: data.flow, efficiency: data.eta };
    default:
      return { flow: 0, efficiency: 1 };
  }
}

const emptyDep = (): Dependency => ({ nodeIds: [], edgeIds: [] });
const merge = (...deps: Dependency[]): Dependency => ({
  nodeIds: [...new Set(deps.flatMap((d) => d.nodeIds))],
  edgeIds: [...new Set(deps.flatMap((d) => d.edgeIds))],
});

export function analyse(layout: Layout, settings: AnalysisSettings = DEFAULT_SETTINGS): Analysis {
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  const edgesById = new Map(layout.edges.map((e) => [e.id, e]));
  const elevationOf = (id: string) => byId.get(id)?.elevation ?? 0;
  const issues: Issue[] = [];
  const issue = (i: Omit<Issue, 'nodeIds' | 'edgeIds'> & Partial<Pick<Issue, 'nodeIds' | 'edgeIds'>>) =>
    issues.push({ nodeIds: [], edgeIds: [], ...i });

  const uppers = layout.nodes.filter((n) => n.data.kind === 'upperReservoir');
  const lowers = layout.nodes.filter((n) => n.data.kind === 'lowerReservoir');
  const upper = uppers[0];
  const lower = lowers[0];

  if (!upper) issue({ id: 'no-upper', severity: 'error', message: 'Place an upper reservoir at the surface.', termId: 'upperReservoir' });
  if (!lower) issue({ id: 'no-lower', severity: 'error', message: 'Place a lower reservoir underground.', termId: 'lowerReservoir' });
  if (uppers.length > 1)
    issue({ id: 'many-upper', severity: 'warning', message: 'Only the first upper reservoir is used in the calculation.', nodeIds: uppers.slice(1).map((n) => n.id) });
  if (lowers.length > 1)
    issue({ id: 'many-lower', severity: 'warning', message: 'Only the first lower reservoir is used in the calculation.', nodeIds: lowers.slice(1).map((n) => n.id) });

  const grossHead = upper && lower ? upper.elevation - lower.elevation : 0;
  if (upper && lower && grossHead <= 0)
    issue({
      id: 'head-negative',
      severity: 'error',
      message: 'The upper reservoir must sit higher than the lower one: drag it up, or the lower one deeper.',
      nodeIds: [upper.id, lower.id],
      termId: 'grossHead',
    });

  const upperData = upper?.data.kind === 'upperReservoir' ? upper.data : undefined;
  const lowerData = lower?.data.kind === 'lowerReservoir' ? lower.data : undefined;
  const usableVolume =
    upperData && lowerData ? Math.min(upperData.volume, lowerData.volume) * settings.usableFraction : 0;
  if (upperData && lowerData) {
    const ratio = Math.max(upperData.volume, lowerData.volume) / Math.min(upperData.volume, lowerData.volume);
    if (ratio > 1.25)
      issue({
        id: 'volume-mismatch',
        severity: 'info',
        message: `The reservoirs differ in size by ${Math.round((ratio - 1) * 100)}%. Only the smaller volume can be cycled, so the extra space is paid for but unused.`,
        nodeIds: [upper!.id, lower!.id],
        termId: 'usableVolume',
      });
  }

  // Routes
  const routes: Analysis['routes'] = {};
  if (upper && lower) {
    const all = findRoutes(layout, upper.id, lower.id);
    routes.generate = pickRoute(all, byId, 'generate');
    routes.pump = pickRoute(all, byId, 'pump');
    if (!routes.generate)
      issue({
        id: 'no-generate-route',
        severity: 'error',
        message: 'Connect the reservoirs with pipes through a turbine or a reversible pump-turbine to generate power.',
        nodeIds: [upper.id, lower.id],
        termId: 'turbine',
      });
    else if (!routes.pump)
      issue({
        id: 'no-pump-route',
        severity: 'warning',
        message: 'There is no pumping route yet. Add a pump (or use a reversible unit) so water can be pumped back up.',
        nodeIds: [routes.generate.machineId],
        termId: 'pumpMode',
      });
  }

  // Components not connected to anything hydraulic
  const connected = new Set(layout.edges.flatMap((e) => [e.source, e.target]));
  const loose = layout.nodes.filter((n) => isHydraulic(n.data.kind) && !connected.has(n.id));
  if (loose.length > 0 && layout.edges.length > 0)
    issue({
      id: 'loose',
      severity: 'warning',
      message: `${loose.length === 1 ? 'One component is' : `${loose.length} components are`} not connected to any pipe.`,
      nodeIds: loose.map((n) => n.id),
    });

  const transformer = layout.nodes.find((n) => n.data.kind === 'transformer');
  const electricalLoss = transformer?.data.kind === 'transformer' ? transformer.data.lossPct / 100 : 0;
  const electricalAssumed = !transformer;

  let spec: SystemSpec | undefined;
  let cycle: CycleResult | undefined;
  let pumpAssumed = false;
  const edgeFlows: Record<string, EdgeFlow> = {};
  for (const e of layout.edges) edgeFlows[e.id] = { length: pipeLength(e, elevationOf) };

  if (upper && lower && grossHead > 0 && routes.generate && upperData) {
    const genRoute = routes.generate;
    const pumpRoute = routes.pump ?? genRoute;
    pumpAssumed = !routes.pump;
    const turbine = machineSpec(byId.get(genRoute.machineId)!.data, 'generate');
    const pump = routes.pump
      ? machineSpec(byId.get(routes.pump.machineId)!.data, 'pump')
      : { flow: turbine.flow * 0.85, efficiency: 0.88 };
    spec = {
      fluid: WATER,
      grossHead,
      usableVolume,
      generatePath: routeSegments(genRoute, edgesById, byId, elevationOf),
      pumpPath: routeSegments(pumpRoute, edgesById, byId, elevationOf),
      turbine,
      pump,
      electricalLoss,
      storageLoss: upperData.seepagePct / 100,
    };
    cycle = simulateCycle(spec);

    for (const s of cycle.generate.hydraulics.segments) {
      const ef = edgeFlows[s.id];
      if (ef) {
        ef.generateVelocity = s.velocity;
        ef.generateLoss = s.totalLoss;
      }
    }
    if (!pumpAssumed)
      for (const s of cycle.pump.hydraulics.segments) {
        const ef = edgeFlows[s.id];
        if (ef) ef.pumpVelocity = s.velocity;
      }

    // Engineering sense checks — advice, never a block.
    for (const [id, ef] of Object.entries(edgeFlows)) {
      const v = Math.max(ef.generateVelocity ?? 0, ef.pumpVelocity ?? 0);
      if (v > 6)
        issue({
          id: `fast-${id}`,
          severity: 'warning',
          message: `Water moves at ${v.toFixed(1)} m/s in this pipe. Above about 6 m/s friction climbs steeply and water hammer gets worse: try a wider pipe.`,
          edgeIds: [id],
          termId: 'velocity',
        });
      else if (v > 0 && v < 0.7)
        issue({
          id: `slow-${id}`,
          severity: 'info',
          message: `Water only moves at ${v.toFixed(2)} m/s here, so this pipe is probably larger (and dearer) than it needs to be.`,
          edgeIds: [id],
          termId: 'velocity',
        });
    }
    for (const e of layout.edges) {
      const m = MATERIALS[e.data.material];
      if (grossHead > m.maxHead && (genRoute.edgeIds.includes(e.id) || pumpRoute.edgeIds.includes(e.id)))
        issue({
          id: `pressure-${e.id}`,
          severity: 'warning',
          message: `${m.label} pipe is usually rated to about ${m.maxHead} m of head, less than the ${Math.round(grossHead)} m here. Use steel for the deep sections.`,
          edgeIds: [e.id],
          termId: 'penstock',
        });
    }
    if (cycle.hydraulicEfficiencyGenerate < 0.85)
      issue({
        id: 'low-net-head',
        severity: 'warning',
        message: `Pipe friction eats ${Math.round((1 - cycle.hydraulicEfficiencyGenerate) * 100)}% of the head while generating. Wider pipes or a lower flow would recover much of it.`,
        edgeIds: genRoute.edgeIds,
        termId: 'netHead',
      });
    const hours = cycle.generate.hours;
    if (hours < 1)
      issue({
        id: 'short-duration',
        severity: 'info',
        message: `The upper reservoir empties in ${(hours * 60).toFixed(0)} minutes at full flow. For a mine's evening peak, aim for several hours: more volume or less flow.`,
        nodeIds: [upper.id, genRoute.machineId],
        termId: 'duration',
      });
    if (electricalAssumed)
      issue({
        id: 'no-transformer',
        severity: 'info',
        message: 'Add a transformer & switchgear to connect to the mine grid. Until then, electrical losses and their cost are left out.',
        termId: 'transformer',
      });
  }

  // Costs for every placed component and pipe
  const peakPowerKW = layout.nodes.reduce((m, n) => Math.max(m, machineRatingKW(n.data, grossHead)), 0);
  const ctx = { grossHead, elevationOf, peakPowerKW };
  const costs = summariseCosts([
    ...layout.nodes.map((n) => nodeCost(n, ctx)),
    ...layout.edges.map((e) => pipeCost(e, ctx)),
  ]);

  // What each headline number depends on (for "explain this" highlighting)
  const reservoirs: Dependency = { nodeIds: [upper?.id, lower?.id].filter((x): x is string => !!x), edgeIds: [] };
  const genDep: Dependency = routes.generate ? { nodeIds: routes.generate.nodeIds, edgeIds: routes.generate.edgeIds } : emptyDep();
  const pumpDep: Dependency = routes.pump ? { nodeIds: routes.pump.nodeIds, edgeIds: routes.pump.edgeIds } : emptyDep();
  const pipesOnly = (d: Dependency): Dependency => ({
    nodeIds: d.nodeIds.filter((id) => {
      const k = byId.get(id)?.data.kind;
      return k === 'bend' || k === 'valve';
    }),
    edgeIds: d.edgeIds,
  });
  const transformerDep: Dependency = transformer ? { nodeIds: [transformer.id], edgeIds: [] } : emptyDep();
  const dependsOn: Record<MetricKey, Dependency> = {
    grossHead: reservoirs,
    storedEnergy: reservoirs,
    headLoss: pipesOnly(genDep),
    netHead: merge(reservoirs, pipesOnly(genDep)),
    power: merge(genDep, transformerDep),
    pumpPower: merge(pumpDep, transformerDep),
    roundTripEfficiency: merge(genDep, pumpDep, transformerDep, reservoirs),
    duration: merge(reservoirs, routes.generate ? { nodeIds: [routes.generate.machineId], edgeIds: [] } : emptyDep()),
    capex: { nodeIds: layout.nodes.map((n) => n.id), edgeIds: layout.edges.map((e) => e.id) },
  };

  const genKW = cycle ? cycle.generate.gridPower / 1000 : 0;
  return {
    upperId: upper?.id,
    lowerId: lower?.id,
    grossHead,
    usableVolume,
    routes,
    spec,
    cycle,
    pumpAssumed,
    electricalAssumed,
    issues,
    costs,
    edgeFlows,
    dependsOn,
    capexPerKW: genKW > 0 ? costs.totalCapex / genKW : undefined,
    capexPerKWh: cycle && cycle.gridEnergyOut > 0 ? costs.totalCapex / cycle.gridEnergyOut : undefined,
  };
}
