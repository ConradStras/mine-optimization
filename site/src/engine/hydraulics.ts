/**
 * Pipe hydraulics: velocity, Reynolds number, friction factor and head loss.
 *
 * Major (friction) loss uses Darcy–Weisbach: h_f = f · (L/D) · v² / 2g
 * Minor (fitting) loss:                       h_m = ΣK · v² / 2g
 * Friction factor: laminar f = 64/Re below Re = 2300, otherwise Swamee–Jain,
 * an explicit fit to Colebrook–White, good to about 1% for 5e3 < Re < 1e8.
 */
import { G, type Fluid } from './constants';

export interface PipeSegment {
  id: string;
  /** Total pipe length [m]. */
  length: number;
  /** Internal diameter [m]. */
  diameter: number;
  /** Absolute wall roughness ε [m]. */
  roughness: number;
  /** Sum of minor-loss coefficients of fittings attached to this segment [-]. */
  minorK: number;
}

export interface SegmentLoss {
  id: string;
  velocity: number;
  reynolds: number;
  frictionFactor: number;
  majorLoss: number;
  minorLoss: number;
  totalLoss: number;
}

export const pipeArea = (diameter: number): number => (Math.PI * diameter * diameter) / 4;

export const velocity = (flow: number, diameter: number): number => flow / pipeArea(diameter);

export const reynolds = (fluid: Fluid, v: number, diameter: number): number =>
  (fluid.density * Math.abs(v) * diameter) / fluid.viscosity;

export function frictionFactor(re: number, roughness: number, diameter: number): number {
  if (re <= 0) return 0;
  if (re < 2300) return 64 / re;
  const term = roughness / (3.7 * diameter) + 5.74 / Math.pow(re, 0.9);
  return 0.25 / Math.pow(Math.log10(term), 2);
}

/** Velocity head v²/2g [m]. */
export const velocityHead = (v: number): number => (v * v) / (2 * G);

export function segmentLoss(segment: PipeSegment, flow: number, fluid: Fluid): SegmentLoss {
  const v = velocity(flow, segment.diameter);
  const re = reynolds(fluid, v, segment.diameter);
  const f = frictionFactor(re, segment.roughness, segment.diameter);
  const hv = velocityHead(v);
  const majorLoss = f * (segment.length / segment.diameter) * hv;
  const minorLoss = segment.minorK * hv;
  return {
    id: segment.id,
    velocity: v,
    reynolds: re,
    frictionFactor: f,
    majorLoss,
    minorLoss,
    totalLoss: majorLoss + minorLoss,
  };
}

export interface PathLoss {
  segments: SegmentLoss[];
  totalLoss: number;
  maxVelocity: number;
}

/** Head loss through segments in series carrying the same flow. */
export function pathLoss(segments: readonly PipeSegment[], flow: number, fluid: Fluid): PathLoss {
  const losses = segments.map((s) => segmentLoss(s, flow, fluid));
  return {
    segments: losses,
    totalLoss: losses.reduce((sum, l) => sum + l.totalLoss, 0),
    maxVelocity: losses.reduce((m, l) => Math.max(m, Math.abs(l.velocity)), 0),
  };
}
