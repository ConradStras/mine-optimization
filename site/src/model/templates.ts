import { DEFAULT_PIPE, type Layout, type NodeData, type PipeData } from '../engine';

/** A layout plus where each component sits across the canvas. y is always −elevation. */
export interface PlacedNode {
  id: string;
  x: number;
  elevation: number;
  data: NodeData;
}

export interface PlacedEdge {
  id: string;
  source: string;
  target: string;
  data: PipeData;
}

export interface Template {
  id: string;
  name: string;
  summary: string;
  nodes: PlacedNode[];
  edges: PlacedEdge[];
}

const pipe = (id: string, source: string, target: string, over: Partial<PipeData> = {}): PlacedEdge => ({
  id,
  source,
  target,
  data: { ...DEFAULT_PIPE, ...over },
});

export const TEMPLATES: Template[] = [
  {
    id: 'reversible',
    name: 'Single shaft, reversible unit',
    summary: '≈26 MW for 4–5 hours. One pump-turbine at shaft bottom runs both ways through a 500 m shaft.',
    nodes: [
      { id: 'upper', x: -320, elevation: 10, data: { kind: 'upperReservoir', volume: 120_000, style: 'linedDam', seepagePct: 1 } },
      { id: 'valve', x: 0, elevation: 0, data: { kind: 'valve', k: 0.2, valveType: 'butterfly' } },
      { id: 'bend', x: 0, elevation: -480, data: { kind: 'bend', k: 0.3 } },
      { id: 'unit', x: 220, elevation: -490, data: { kind: 'reversibleUnit', flow: 6, etaTurbine: 0.9, etaPump: 0.89 } },
      { id: 'lower', x: 460, elevation: -500, data: { kind: 'lowerReservoir', volume: 130_000, style: 'excavated' } },
      { id: 'xfmr', x: 300, elevation: 30, data: { kind: 'transformer', lossPct: 1 } },
      { id: 'scada', x: 500, elevation: 30, data: { kind: 'controls' } },
    ],
    edges: [
      pipe('p1', 'upper', 'valve', { horizontalRun: 60 }),
      pipe('p2', 'valve', 'bend', { horizontalRun: 0 }),
      pipe('p3', 'bend', 'unit', { horizontalRun: 30 }),
      pipe('p4', 'unit', 'lower', { horizontalRun: 20 }),
    ],
  },
  {
    id: 'separate',
    name: 'Separate pump and turbine',
    summary: 'A turbine and a pump on parallel branches at shaft bottom, each tuned to its own job.',
    nodes: [
      { id: 'upper', x: -320, elevation: 10, data: { kind: 'upperReservoir', volume: 120_000, style: 'linedDam', seepagePct: 1 } },
      { id: 'valve', x: 0, elevation: 0, data: { kind: 'valve', k: 0.2, valveType: 'butterfly' } },
      { id: 'bend', x: 0, elevation: -470, data: { kind: 'bend', k: 0.9 } },
      { id: 'turbine', x: 220, elevation: -420, data: { kind: 'turbine', flow: 6, eta: 0.91 } },
      { id: 'pump', x: 220, elevation: -560, data: { kind: 'pump', flow: 5, eta: 0.89 } },
      { id: 'lower', x: 480, elevation: -500, data: { kind: 'lowerReservoir', volume: 130_000, style: 'excavated' } },
      { id: 'xfmr', x: 300, elevation: 30, data: { kind: 'transformer', lossPct: 1 } },
      { id: 'scada', x: 500, elevation: 30, data: { kind: 'controls' } },
    ],
    edges: [
      pipe('p1', 'upper', 'valve', { horizontalRun: 60 }),
      pipe('p2', 'valve', 'bend', { horizontalRun: 0 }),
      pipe('p3', 'bend', 'turbine', { horizontalRun: 25, diameter: 1.3 }),
      pipe('p4', 'turbine', 'lower', { horizontalRun: 25, diameter: 1.3 }),
      pipe('p5', 'bend', 'pump', { horizontalRun: 25, diameter: 1.2 }),
      pipe('p6', 'pump', 'lower', { horizontalRun: 25, diameter: 1.2 }),
    ],
  },
  {
    id: 'note200',
    name: '200 MW / 1 600 MWh reference',
    summary: 'The scale used in the technical note’s spreadsheet: a 600 m deep, 8-hour plant.',
    nodes: [
      { id: 'upper', x: -340, elevation: 15, data: { kind: 'upperReservoir', volume: 1_250_000, style: 'linedDam', seepagePct: 0.5 } },
      { id: 'valve', x: 0, elevation: 0, data: { kind: 'valve', k: 0.1, valveType: 'spherical' } },
      { id: 'bend', x: 0, elevation: -585, data: { kind: 'bend', k: 0.25 } },
      { id: 'unit', x: 230, elevation: -595, data: { kind: 'reversibleUnit', flow: 38, etaTurbine: 0.91, etaPump: 0.9 } },
      { id: 'lower', x: 480, elevation: -600, data: { kind: 'lowerReservoir', volume: 1_300_000, style: 'excavated' } },
      { id: 'xfmr', x: 300, elevation: 30, data: { kind: 'transformer', lossPct: 0.8 } },
      { id: 'scada', x: 500, elevation: 30, data: { kind: 'controls' } },
    ],
    edges: [
      pipe('p1', 'upper', 'valve', { horizontalRun: 80, diameter: 3.6 }),
      pipe('p2', 'valve', 'bend', { horizontalRun: 0, diameter: 3.6 }),
      pipe('p3', 'bend', 'unit', { horizontalRun: 40, diameter: 3.6 }),
      pipe('p4', 'unit', 'lower', { horizontalRun: 30, diameter: 3.6 }),
    ],
  },
];

export const toLayout = (t: { nodes: PlacedNode[]; edges: PlacedEdge[] }): Layout => ({
  nodes: t.nodes.map(({ id, elevation, data }) => ({ id, elevation, data })),
  edges: t.edges.map(({ id, source, target, data }) => ({ id, source, target, data })),
});
