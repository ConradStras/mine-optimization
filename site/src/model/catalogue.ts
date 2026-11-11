import type { ComponentKind } from '../engine';

export type PaletteGroup = 'Reservoirs' | 'Machines' | 'Pipework' | 'Electrical';

export interface CatalogueItem {
  kind: ComponentKind;
  name: string;
  group: PaletteGroup;
  blurb: string;
  /** Glossary term that explains this component. */
  termId: string;
  /** Where a click-to-add places it (elevation in m). */
  defaultElevation: number;
  defaultX: number;
  /** Footprint on the canvas in flow units. */
  size: { w: number; h: number };
}

export const CATALOGUE: Record<ComponentKind, CatalogueItem> = {
  upperReservoir: {
    kind: 'upperReservoir',
    name: 'Upper reservoir',
    group: 'Reservoirs',
    blurb: 'Surface dam or tank. Holds the water while it is “charged”.',
    termId: 'upperReservoir',
    defaultElevation: 10,
    defaultX: -320,
    size: { w: 190, h: 86 },
  },
  lowerReservoir: {
    kind: 'lowerReservoir',
    name: 'Lower reservoir',
    group: 'Reservoirs',
    blurb: 'Underground chamber or old workings that receive the water.',
    termId: 'lowerReservoir',
    defaultElevation: -400,
    defaultX: 460,
    size: { w: 190, h: 86 },
  },
  reversibleUnit: {
    kind: 'reversibleUnit',
    name: 'Reversible pump-turbine',
    group: 'Machines',
    blurb: 'One machine that generates going down and pumps going up.',
    termId: 'reversibleUnit',
    defaultElevation: -390,
    defaultX: 220,
    size: { w: 84, h: 84 },
  },
  turbine: {
    kind: 'turbine',
    name: 'Turbine',
    group: 'Machines',
    blurb: 'Turns falling water into electricity. Generates only.',
    termId: 'turbine',
    defaultElevation: -360,
    defaultX: 220,
    size: { w: 84, h: 84 },
  },
  pump: {
    kind: 'pump',
    name: 'Pump',
    group: 'Machines',
    blurb: 'Uses cheap power to lift water back up. Pumps only.',
    termId: 'pump',
    defaultElevation: -440,
    defaultX: 220,
    size: { w: 84, h: 84 },
  },
  bend: {
    kind: 'bend',
    name: 'Bend / tee',
    group: 'Pipework',
    blurb: 'Turns or splits the flow. Each one adds a little friction.',
    termId: 'minorLoss',
    defaultElevation: -380,
    defaultX: 0,
    size: { w: 44, h: 44 },
  },
  valve: {
    kind: 'valve',
    name: 'Valve',
    group: 'Pipework',
    blurb: 'Isolates the pipe for safety and maintenance.',
    termId: 'valve',
    defaultElevation: 0,
    defaultX: 0,
    size: { w: 44, h: 44 },
  },
  transformer: {
    kind: 'transformer',
    name: 'Transformer & switchgear',
    group: 'Electrical',
    blurb: 'Connects the machines to the mine’s electrical network.',
    termId: 'transformer',
    defaultElevation: 30,
    defaultX: 300,
    size: { w: 110, h: 64 },
  },
  controls: {
    kind: 'controls',
    name: 'Control & monitoring',
    group: 'Electrical',
    blurb: 'SCADA, sensors and protection that run the plant safely.',
    termId: 'controls',
    defaultElevation: 30,
    defaultX: 500,
    size: { w: 110, h: 64 },
  },
};

export const PALETTE_GROUPS: PaletteGroup[] = ['Reservoirs', 'Machines', 'Pipework', 'Electrical'];

/** Components shown in the palette but built in later phases. */
export const COMING_SOON = [
  { name: 'Solar PV array', phase: 3, blurb: 'Charge the store from the sun.' },
  { name: 'Battery bank', phase: 3, blurb: 'Fast, short-duration storage alongside the shaft.' },
  { name: 'Mine load', phase: 2, blurb: 'Hourly demand of the mine.' },
  { name: 'Grid tariff', phase: 2, blurb: 'Time-of-use prices that drive the cash flow.' },
  { name: 'Surge tank', phase: 4, blurb: 'Softens water hammer when a valve shuts.' },
] as const;
