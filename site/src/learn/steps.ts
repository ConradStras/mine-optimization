import type { Analysis, ComponentKind } from '../engine';
import type { ExplainerId } from './terms';

export interface StepContext {
  analysis: Analysis;
  kinds: Set<ComponentKind>;
  played: { generate: boolean; pump: boolean };
}

export interface GuideStep {
  id: string;
  title: string;
  /** What to do, in one or two sentences. */
  instruction: string;
  /** Hint shown under the instruction. */
  hint: string;
  unlocks: ComponentKind[];
  terms: string[];
  explainer: ExplainerId;
  done: (c: StepContext) => boolean;
}

export const STEPS: GuideStep[] = [
  {
    id: 'reservoirs',
    title: 'Two reservoirs, one drop',
    instruction: 'Drag an upper reservoir onto the surface and a lower reservoir deep underground.',
    hint: 'Drag the lower one deeper and watch the stored energy grow.',
    unlocks: ['upperReservoir', 'lowerReservoir'],
    terms: ['grossHead', 'potentialEnergy', 'powerEnergy'],
    explainer: 'head',
    done: ({ analysis }) => analysis.grossHead > 0,
  },
  {
    id: 'route',
    title: 'Pipe it through a turbine',
    instruction:
      'Add a reversible pump-turbine near the bottom, then draw pipes: drag from a dot on one component to a dot on the next.',
    hint: 'Route: upper reservoir → (valve, bends) → machine → lower reservoir.',
    unlocks: ['reversibleUnit', 'turbine', 'bend', 'valve'],
    terms: ['flowRate', 'velocity', 'headLoss', 'netHead'],
    explainer: 'friction',
    done: ({ analysis }) => analysis.routes.generate !== undefined,
  },
  {
    id: 'generate',
    title: 'Let it run: generate',
    instruction: 'Press Play in Generate mode and watch the upper reservoir drain through the turbine.',
    hint: 'Try a narrower pipe in the inspector: power drops as friction rises.',
    unlocks: [],
    terms: ['turbine', 'duration'],
    explainer: 'turbine',
    done: ({ played, analysis }) => played.generate && analysis.cycle !== undefined,
  },
  {
    id: 'pump',
    title: 'Pump it back up',
    instruction:
      'Switch to Pump mode and press Play. With a separate turbine you will need a pump on its own route.',
    hint: 'Pumping always takes more power than generating gives back. Why?',
    unlocks: ['pump'],
    terms: ['pump', 'pumpMode', 'roundTripEfficiency'],
    explainer: 'pump',
    done: ({ played, analysis }) => played.pump && analysis.routes.pump !== undefined,
  },
  {
    id: 'connect',
    title: 'Connect it and count the cost',
    instruction:
      'Add a transformer & switchgear and a control system. Then open Results to see where every kWh goes.',
    hint: 'Every component carries a cost card: select one to see it.',
    unlocks: ['transformer', 'controls'],
    terms: ['transformer', 'roundTripEfficiency', 'capex', 'costPerKW'],
    explainer: 'roundTrip',
    done: ({ kinds }) => kinds.has('transformer') && kinds.has('controls'),
  },
];

/** Kinds available at a given step (everything unlocked so far, including this step's). */
export function unlockedKinds(step: number): Set<ComponentKind> {
  return new Set(STEPS.slice(0, step + 1).flatMap((s) => s.unlocks));
}
