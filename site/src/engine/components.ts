/**
 * The physical components an engineer can place, as pure data.
 * The UI catalogue (labels, icons, explanations) lives in src/model and refers to these kinds.
 */

export type PipeMaterial = 'steel' | 'ductileIron' | 'grp' | 'hdpe';

export interface MaterialSpec {
  label: string;
  /** Absolute roughness ε [m]. */
  roughness: number;
  /** Young's modulus E [Pa]. Used from Phase 4 for wave speed. */
  modulus: number;
  /** Cost relative to welded steel. */
  costFactor: number;
  /** Rough upper limit of head the material is usually rated for [m]. */
  maxHead: number;
}

export const MATERIALS: Record<PipeMaterial, MaterialSpec> = {
  steel: { label: 'Welded steel', roughness: 4.5e-5, modulus: 200e9, costFactor: 1, maxHead: 2000 },
  ductileIron: { label: 'Ductile iron (cement lined)', roughness: 3e-5, modulus: 170e9, costFactor: 0.9, maxHead: 600 },
  grp: { label: 'Glass-reinforced plastic', roughness: 1e-5, modulus: 20e9, costFactor: 0.8, maxHead: 320 },
  hdpe: { label: 'HDPE', roughness: 1.5e-6, modulus: 1e9, costFactor: 0.55, maxHead: 160 },
};

export type UpperStyle = 'linedDam' | 'tank' | 'existingDam';
export type LowerStyle = 'excavated' | 'oldWorkings' | 'tank';
export type ValveType = 'butterfly' | 'spherical';

export type NodeData =
  | { kind: 'upperReservoir'; volume: number; style: UpperStyle; seepagePct: number }
  | { kind: 'lowerReservoir'; volume: number; style: LowerStyle }
  | { kind: 'reversibleUnit'; flow: number; etaTurbine: number; etaPump: number }
  | { kind: 'turbine'; flow: number; eta: number }
  | { kind: 'pump'; flow: number; eta: number }
  | { kind: 'bend'; k: number }
  | { kind: 'valve'; k: number; valveType: ValveType }
  | { kind: 'transformer'; lossPct: number }
  | { kind: 'controls' };

export type ComponentKind = NodeData['kind'];

export interface PipeData {
  diameter: number;
  material: PipeMaterial;
  /** Pipe length that is not vertical (drives, bends, surface runs) [m]. */
  horizontalRun: number;
}

export interface LayoutNode {
  id: string;
  /** Elevation of the component's reference point relative to the surface collar [m]. Negative is below. */
  elevation: number;
  data: NodeData;
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  data: PipeData;
}

export interface Layout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

export const HYDRAULIC_KINDS: readonly ComponentKind[] = [
  'upperReservoir',
  'lowerReservoir',
  'reversibleUnit',
  'turbine',
  'pump',
  'bend',
  'valve',
];

export const isHydraulic = (kind: ComponentKind): boolean => HYDRAULIC_KINDS.includes(kind);
export const canGenerate = (kind: ComponentKind): boolean => kind === 'turbine' || kind === 'reversibleUnit';
export const canPump = (kind: ComponentKind): boolean => kind === 'pump' || kind === 'reversibleUnit';
export const isMachine = (kind: ComponentKind): boolean => canGenerate(kind) || canPump(kind);

export const DEFAULT_NODE_DATA: { [K in ComponentKind]: Extract<NodeData, { kind: K }> } = {
  upperReservoir: { kind: 'upperReservoir', volume: 120_000, style: 'linedDam', seepagePct: 1 },
  lowerReservoir: { kind: 'lowerReservoir', volume: 130_000, style: 'excavated' },
  reversibleUnit: { kind: 'reversibleUnit', flow: 6, etaTurbine: 0.9, etaPump: 0.89 },
  turbine: { kind: 'turbine', flow: 6, eta: 0.91 },
  pump: { kind: 'pump', flow: 5, eta: 0.89 },
  bend: { kind: 'bend', k: 0.3 },
  valve: { kind: 'valve', k: 0.2, valveType: 'butterfly' },
  transformer: { kind: 'transformer', lossPct: 1 },
  controls: { kind: 'controls' },
};

export const DEFAULT_PIPE: PipeData = { diameter: 1.4, material: 'steel', horizontalRun: 30 };

/** Standard entry and exit loss coefficients at the reservoir ends of a route. */
export const INTAKE_K = 0.5;
export const OUTLET_K = 1.0;
