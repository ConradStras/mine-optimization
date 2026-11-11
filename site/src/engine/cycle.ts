/**
 * One full storage cycle: pump the usable volume up, then let it run back down
 * through the turbine. Technical note §2–4.
 *
 * Assumptions (Phase 1, stated in the UI and README):
 * - Gross head is constant: the difference between the two reservoir water levels.
 *   Level changes inside each reservoir during a cycle are ignored.
 * - Machine efficiencies are constant (no part-load curve).
 * - Steady flow at the rated flow rate in each mode.
 * - Seepage and evaporation are taken as a fraction of the stored volume per cycle.
 * - Transformer and switchgear losses are a fraction of power each way.
 */
import { SECONDS_PER_HOUR, jToKWh, type Fluid } from './constants';
import { potentialEnergy } from './energy';
import { pathLoss, type PathLoss, type PipeSegment } from './hydraulics';
import { pumpPower, turbinePower } from './power';

export interface MachineSpec {
  /** Rated volumetric flow [m³/s]. */
  flow: number;
  /** Combined machine efficiency, e.g. turbine × generator [0–1]. */
  efficiency: number;
}

export interface SystemSpec {
  fluid: Fluid;
  /** Upper water level minus lower water level [m]. */
  grossHead: number;
  /** Volume moved in one full cycle [m³]. */
  usableVolume: number;
  generatePath: PipeSegment[];
  pumpPath: PipeSegment[];
  turbine: MachineSpec;
  pump: MachineSpec;
  /** Transformer + switchgear loss, each way [0–1]. */
  electricalLoss: number;
  /** Seepage + evaporation per cycle, as a fraction of stored volume [0–1]. */
  storageLoss: number;
}

export interface ModeResult {
  flow: number;
  hydraulics: PathLoss;
  /** Head the machine works against (net head in generation, pump head in pumping) [m]. */
  machineHead: number;
  /** Power at the machine shaft/terminals [W]. */
  machinePower: number;
  /** Power at the grid connection [W]. */
  gridPower: number;
  /** Time to move the cycle volume [h]. */
  hours: number;
}

export type LossKey =
  | 'transformerIn'
  | 'pumpMotor'
  | 'frictionPump'
  | 'storage'
  | 'frictionGenerate'
  | 'turbineGenerator'
  | 'transformerOut';

export interface LossItem {
  key: LossKey;
  label: string;
  kWh: number;
}

export interface CycleResult {
  generate: ModeResult;
  pump: ModeResult;
  /** Potential energy of the usable volume at gross head [kWh]. */
  storedEnergy: number;
  gridEnergyIn: number;
  gridEnergyOut: number;
  /** Grid-to-grid round-trip efficiency [0–1]. */
  roundTripEfficiency: number;
  losses: LossItem[];
  /** Net head ÷ gross head while generating [0–1]. */
  hydraulicEfficiencyGenerate: number;
}

export function simulateCycle(spec: SystemSpec): CycleResult {
  const { fluid, grossHead, usableVolume: V, electricalLoss: eL, storageLoss: s } = spec;
  const rho = fluid.density;

  // Pumping (charging)
  const pumpHyd = pathLoss(spec.pumpPath, spec.pump.flow, fluid);
  const pumpHead = grossHead + pumpHyd.totalLoss;
  const pumpShaft = pumpPower(spec.pump.efficiency, rho, pumpHead, spec.pump.flow);
  const pumpGrid = pumpShaft / (1 - eL);
  const pumpHours = spec.pump.flow > 0 ? V / spec.pump.flow / SECONDS_PER_HOUR : Infinity;

  // Generating (discharging)
  const genHyd = pathLoss(spec.generatePath, spec.turbine.flow, fluid);
  const netHead = grossHead - genHyd.totalLoss;
  const genShaft = turbinePower(spec.turbine.efficiency, rho, netHead, spec.turbine.flow);
  const genGrid = genShaft * (1 - eL);
  const deliveredVolume = V * (1 - s);
  const genHours = spec.turbine.flow > 0 ? deliveredVolume / spec.turbine.flow / SECONDS_PER_HOUR : Infinity;

  // Energy chain for one cycle [J]. Each step's loss is what the next step does not receive.
  const atPumpShaft = potentialEnergy(rho, V, pumpHead) / spec.pump.efficiency;
  const gridIn = atPumpShaft / (1 - eL);
  const stored = potentialEnergy(rho, V, grossHead);
  const afterStorage = stored * (1 - s);
  const atTurbine = potentialEnergy(rho, deliveredVolume, Math.max(netHead, 0));
  const atGenerator = atTurbine * spec.turbine.efficiency;
  const gridOut = atGenerator * (1 - eL);

  const losses: LossItem[] = [
    { key: 'transformerIn', label: 'Transformer (in)', kWh: jToKWh(gridIn - atPumpShaft) },
    { key: 'pumpMotor', label: 'Pump & motor', kWh: jToKWh(atPumpShaft * (1 - spec.pump.efficiency)) },
    {
      key: 'frictionPump',
      label: 'Pipe friction (up)',
      kWh: jToKWh(potentialEnergy(rho, V, pumpHyd.totalLoss)),
    },
    { key: 'storage', label: 'Seepage & evaporation', kWh: jToKWh(stored - afterStorage) },
    { key: 'frictionGenerate', label: 'Pipe friction (down)', kWh: jToKWh(afterStorage - atTurbine) },
    { key: 'turbineGenerator', label: 'Turbine & generator', kWh: jToKWh(atTurbine - atGenerator) },
    { key: 'transformerOut', label: 'Transformer (out)', kWh: jToKWh(atGenerator - gridOut) },
  ];

  return {
    pump: {
      flow: spec.pump.flow,
      hydraulics: pumpHyd,
      machineHead: pumpHead,
      machinePower: pumpShaft,
      gridPower: pumpGrid,
      hours: pumpHours,
    },
    generate: {
      flow: spec.turbine.flow,
      hydraulics: genHyd,
      machineHead: netHead,
      machinePower: genShaft,
      gridPower: genGrid,
      hours: genHours,
    },
    storedEnergy: jToKWh(stored),
    gridEnergyIn: jToKWh(gridIn),
    gridEnergyOut: jToKWh(gridOut),
    roundTripEfficiency: gridIn > 0 ? gridOut / gridIn : 0,
    losses,
    hydraulicEfficiencyGenerate: grossHead > 0 ? Math.max(netHead, 0) / grossHead : 0,
  };
}

export interface CurvePoint {
  x: number;
  power: number;
  rte: number;
}

/** Sweep both machines' flow together from `minFactor` to `maxFactor` × rated. */
export function flowSweep(spec: SystemSpec, steps = 40, minFactor = 0.1, maxFactor = 2.5): CurvePoint[] {
  const base = spec.turbine.flow;
  const ratio = spec.turbine.flow > 0 ? spec.pump.flow / spec.turbine.flow : 1;
  const points: CurvePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const q = base * (minFactor + ((maxFactor - minFactor) * i) / steps);
    const r = simulateCycle({
      ...spec,
      turbine: { ...spec.turbine, flow: q },
      pump: { ...spec.pump, flow: q * ratio },
    });
    points.push({ x: q, power: r.generate.gridPower, rte: r.roundTripEfficiency });
  }
  return points;
}

/** Sweep every pipe diameter by a common scale factor. x is the scale factor. */
export function diameterSweep(spec: SystemSpec, steps = 40, minFactor = 0.4, maxFactor = 2.0): CurvePoint[] {
  const points: CurvePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const k = minFactor + ((maxFactor - minFactor) * i) / steps;
    const scale = (segs: PipeSegment[]) => segs.map((p) => ({ ...p, diameter: p.diameter * k }));
    const r = simulateCycle({
      ...spec,
      generatePath: scale(spec.generatePath),
      pumpPath: scale(spec.pumpPath),
    });
    points.push({ x: k, power: r.generate.gridPower, rte: r.roundTripEfficiency });
  }
  return points;
}
