import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import {
  DEFAULT_NODE_DATA,
  DEFAULT_PIPE,
  type ComponentKind,
  type Layout,
  type NodeData,
  type PipeData,
} from '../engine';
import type { Currency } from '../lib/format';
import type { ExplainerId } from '../learn/terms';
import { CATALOGUE } from '../model/catalogue';
import { TEMPLATES, type PlacedEdge, type PlacedNode } from '../model/templates';

export type ComponentNode = Node<NodeData & Record<string, unknown>, 'component'>;
export type PipeEdge = Edge<PipeData & Record<string, unknown>, 'pipe'>;

export type Mode = 'generate' | 'pump';
export type GuideMode = 'guided' | 'expert';
export type Theme = 'system' | 'light' | 'dark';
export type PanelTab = 'results' | 'inspect' | 'costs';

/** What the user changed last, so a sharp change in results can be explained. */
export type ChangeKind =
  | 'diameter'
  | 'flow'
  | 'elevation'
  | 'efficiency'
  | 'volume'
  | 'material'
  | 'length'
  | 'fitting'
  | 'structure';

export interface Highlight {
  label: string;
  nodeIds: string[];
  edgeIds: string[];
}

export interface Nudge {
  id: number;
  kicker: string;
  text: string;
  termId?: string;
  /** Offer to undo the last clear. */
  undo?: boolean;
}

interface Snapshot {
  nodes: ComponentNode[];
  edges: PipeEdge[];
  templateId: string | null;
}

interface State {
  nodes: ComponentNode[];
  edges: PipeEdge[];
  selectedId: string | null;
  mode: Mode;
  playing: boolean;
  /** Fill of the upper reservoir, 0–1. The lower one is the complement. */
  level: number;
  played: { generate: boolean; pump: boolean };
  guideMode: GuideMode;
  step: number;
  discovered: string[];
  explainer: ExplainerId | null;
  highlight: Highlight | null;
  lastChange: { kind: ChangeKind; at: number } | null;
  nudge: Nudge | null;
  currency: Currency;
  zarPerUsd: number;
  usableFraction: number;
  theme: Theme;
  panelTab: PanelTab;
  layers: { flowLabels: boolean; frictionHeat: boolean };
  templateId: string | null;
  /** The expert layout, kept while the guided build uses an empty mine. */
  stash: Snapshot | null;
  /** The layout before the last clear, for undo. */
  undoClear: Snapshot | null;

  onNodesChange: (changes: NodeChange<ComponentNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<PipeEdge>[]) => void;
  onConnect: (c: Connection) => void;
  addComponent: (kind: ComponentKind, at?: { x: number; y: number }) => string;
  updateNode: (id: string, patch: Partial<NodeData>, change: ChangeKind) => void;
  setElevation: (id: string, elevation: number) => void;
  updateEdge: (id: string, patch: Partial<PipeData>, change: ChangeKind) => void;
  remove: (id: string) => void;
  select: (id: string | null) => void;
  loadTemplate: (id: string) => void;
  loadLayout: (nodes: PlacedNode[], edges: PlacedEdge[]) => void;
  clear: () => void;
  undoLastClear: () => void;
  setMode: (m: Mode) => void;
  setPlaying: (p: boolean) => void;
  setLevel: (l: number) => void;
  setGuideMode: (g: GuideMode) => void;
  setStep: (s: number) => void;
  discover: (termId: string) => void;
  showExplainer: (e: ExplainerId | null) => void;
  setHighlight: (h: Highlight | null) => void;
  setNudge: (n: Omit<Nudge, 'id'> | null) => void;
  setCurrency: (c: Currency) => void;
  setZarPerUsd: (r: number) => void;
  setUsableFraction: (f: number) => void;
  setTheme: (t: Theme) => void;
  setPanelTab: (t: PanelTab) => void;
  toggleLayer: (l: keyof State['layers']) => void;
}

let counter = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export const toFlowNode = (n: PlacedNode): ComponentNode => ({
  id: n.id,
  type: 'component',
  position: { x: n.x, y: -n.elevation },
  data: { ...n.data },
});

export const toFlowEdge = (e: PlacedEdge): PipeEdge => ({
  id: e.id,
  type: 'pipe',
  source: e.source,
  target: e.target,
  data: { ...e.data },
});

export const elevationOf = (n: ComponentNode): number => Math.round(-n.position.y);

export const toLayout = (nodes: ComponentNode[], edges: PipeEdge[]): Layout => ({
  nodes: nodes.map((n) => ({ id: n.id, elevation: elevationOf(n), data: n.data as NodeData })),
  edges: edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    data: (e.data ?? DEFAULT_PIPE) as PipeData,
  })),
});

export const toPlaced = (nodes: ComponentNode[], edges: PipeEdge[]) => ({
  nodes: nodes.map<PlacedNode>((n) => ({
    id: n.id,
    x: Math.round(n.position.x),
    elevation: elevationOf(n),
    data: n.data as NodeData,
  })),
  edges: edges.map<PlacedEdge>((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    data: (e.data ?? DEFAULT_PIPE) as PipeData,
  })),
});

/** localStorage can throw (private windows, blocked storage); the app must work without it. */
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* storage unavailable: keep working in memory */
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

const firstTemplate = TEMPLATES[0]!;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      nodes: firstTemplate.nodes.map(toFlowNode),
      edges: firstTemplate.edges.map(toFlowEdge),
      selectedId: null,
      mode: 'generate',
      playing: false,
      level: 1,
      played: { generate: false, pump: false },
      guideMode: 'expert',
      step: 0,
      discovered: [],
      explainer: null,
      highlight: null,
      lastChange: null,
      nudge: null,
      currency: 'ZAR',
      zarPerUsd: 18,
      usableFraction: 0.9,
      theme: 'system',
      panelTab: 'results',
      layers: { flowLabels: true, frictionHeat: false },
      templateId: firstTemplate.id,
      stash: null,
      undoClear: null,

      onNodesChange: (changes) => {
        const moved = changes.some((c) => c.type === 'position' && c.dragging === false);
        const removed = changes.some((c) => c.type === 'remove');
        set((s) => ({
          nodes: applyNodeChanges(changes, s.nodes),
          ...(moved ? { lastChange: { kind: 'elevation' as const, at: Date.now() } } : {}),
          ...(removed
            ? { lastChange: { kind: 'structure' as const, at: Date.now() }, selectedId: null }
            : {}),
        }));
      },
      onEdgesChange: (changes) => {
        const removed = changes.some((c) => c.type === 'remove');
        set((s) => ({
          edges: applyEdgeChanges(changes, s.edges),
          ...(removed
            ? { lastChange: { kind: 'structure' as const, at: Date.now() }, selectedId: null }
            : {}),
        }));
      },
      onConnect: (c) => {
        if (!c.source || !c.target || c.source === c.target) return;
        const exists = get().edges.some(
          (e) =>
            (e.source === c.source && e.target === c.target) ||
            (e.source === c.target && e.target === c.source),
        );
        if (exists) return;
        const id = newId('pipe');
        set((s) => ({
          edges: addEdge({ ...c, id, type: 'pipe', data: { ...DEFAULT_PIPE } }, s.edges) as PipeEdge[],
          selectedId: id,
          panelTab: 'inspect',
          lastChange: { kind: 'structure', at: Date.now() },
        }));
      },
      addComponent: (kind, at) => {
        const item = CATALOGUE[kind];
        const id = newId(kind);
        const taken = get().nodes;
        let position = at ?? { x: item.defaultX, y: -item.defaultElevation };
        // Nudge click-added components so they do not land exactly on top of one another.
        while (
          !at &&
          taken.some(
            (n) => Math.abs(n.position.x - position.x) < 20 && Math.abs(n.position.y - position.y) < 20,
          )
        ) {
          position = { x: position.x + 40, y: position.y + 30 };
        }
        const node: ComponentNode = {
          id,
          type: 'component',
          position,
          data: { ...DEFAULT_NODE_DATA[kind] },
        };
        set((s) => ({
          nodes: [...s.nodes.map((n) => ({ ...n, selected: false })), { ...node, selected: true }],
          selectedId: id,
          panelTab: 'inspect',
          lastChange: { kind: 'structure', at: Date.now() },
          templateId: null,
        }));
        return id;
      },
      updateNode: (id, patch, change) =>
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...patch } as ComponentNode['data'] } : n,
          ),
          lastChange: { kind: change, at: Date.now() },
        })),
      setElevation: (id, elevation) =>
        set((s) => ({
          nodes: s.nodes.map((n) => (n.id === id ? { ...n, position: { ...n.position, y: -elevation } } : n)),
          lastChange: { kind: 'elevation', at: Date.now() },
        })),
      updateEdge: (id, patch, change) =>
        set((s) => ({
          edges: s.edges.map((e) =>
            e.id === id ? { ...e, data: { ...(e.data ?? DEFAULT_PIPE), ...patch } } : e,
          ),
          lastChange: { kind: change, at: Date.now() },
        })),
      remove: (id) =>
        set((s) => ({
          nodes: s.nodes.filter((n) => n.id !== id),
          edges: s.edges.filter((e) => e.id !== id && e.source !== id && e.target !== id),
          selectedId: null,
          lastChange: { kind: 'structure', at: Date.now() },
        })),
      select: (id) =>
        set((s) => ({
          selectedId: id,
          panelTab: id ? 'inspect' : s.panelTab === 'inspect' ? 'results' : s.panelTab,
        })),
      loadTemplate: (id) => {
        const t = TEMPLATES.find((x) => x.id === id);
        if (!t) return;
        set({
          nodes: t.nodes.map(toFlowNode),
          edges: t.edges.map(toFlowEdge),
          selectedId: null,
          templateId: id,
          level: 1,
          playing: false,
          highlight: null,
          lastChange: null,
          panelTab: 'results',
        });
      },
      loadLayout: (nodes, edges) =>
        set({
          nodes: nodes.map(toFlowNode),
          edges: edges.map(toFlowEdge),
          selectedId: null,
          templateId: null,
          level: 1,
          playing: false,
          highlight: null,
          lastChange: null,
        }),
      clear: () =>
        set((s) => ({
          undoClear: { nodes: s.nodes, edges: s.edges, templateId: s.templateId },
          nodes: [],
          edges: [],
          selectedId: null,
          templateId: null,
          level: 1,
          playing: false,
          highlight: null,
          lastChange: null,
          nudge: {
            id: Date.now(),
            kicker: 'Canvas cleared',
            text: 'Every component was removed.',
            undo: true,
          },
        })),
      undoLastClear: () =>
        set((s) =>
          s.undoClear
            ? {
                nodes: s.undoClear.nodes,
                edges: s.undoClear.edges,
                templateId: s.undoClear.templateId,
                undoClear: null,
                nudge: null,
              }
            : s,
        ),
      setMode: (mode) => set({ mode, playing: false }),
      setPlaying: (playing) =>
        set((s) => {
          if (!playing) return { playing };
          // Restart from the sensible end if the reservoir is already empty/full.
          const level =
            s.mode === 'generate' && s.level <= 0.001
              ? 1
              : s.mode === 'pump' && s.level >= 0.999
                ? 0
                : s.level;
          return { playing, level, played: { ...s.played, [s.mode]: true } };
        }),
      setLevel: (level) => set({ level: Math.min(1, Math.max(0, level)) }),
      setGuideMode: (guideMode) =>
        set((s) => {
          if (guideMode === s.guideMode) return s;
          if (guideMode === 'guided')
            // Keep the expert layout aside; the guided build starts in an empty mine.
            return {
              guideMode,
              step: 0,
              stash:
                s.nodes.length > 0 ? { nodes: s.nodes, edges: s.edges, templateId: s.templateId } : s.stash,
              nodes: [],
              edges: [],
              selectedId: null,
              templateId: null,
              played: { generate: false, pump: false },
              level: 1,
              playing: false,
              explainer: null,
              highlight: null,
            };
          // Back to expert: keep what was built in guided mode, or bring back the stashed layout.
          if (s.nodes.length === 0 && s.stash)
            return {
              guideMode,
              nodes: s.stash.nodes,
              edges: s.stash.edges,
              templateId: s.stash.templateId,
              stash: null,
              explainer: null,
            };
          return { guideMode, explainer: null };
        }),
      setStep: (step) => set({ step, explainer: null, highlight: null }),
      discover: (termId) =>
        set((s) => (s.discovered.includes(termId) ? s : { discovered: [...s.discovered, termId] })),
      showExplainer: (explainer) => set({ explainer }),
      setHighlight: (highlight) => set({ highlight }),
      setNudge: (n) => set({ nudge: n ? { ...n, id: Date.now() } : null }),
      setCurrency: (currency) => set({ currency }),
      setZarPerUsd: (zarPerUsd) => set({ zarPerUsd }),
      setUsableFraction: (usableFraction) =>
        set({ usableFraction, lastChange: { kind: 'volume', at: Date.now() } }),
      setTheme: (theme) => set({ theme }),
      setPanelTab: (panelTab) => set({ panelTab }),
      toggleLayer: (l) => set((s) => ({ layers: { ...s.layers, [l]: !s.layers[l] } })),
    }),
    {
      name: 'shaftline.pumpStorage.v1',
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        nodes: s.nodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
        edges: s.edges.map(({ id, type, source, target, sourceHandle, targetHandle, data }) => ({
          id,
          type,
          source,
          target,
          sourceHandle,
          targetHandle,
          data,
        })),
        guideMode: s.guideMode,
        step: s.step,
        played: s.played,
        discovered: s.discovered,
        currency: s.currency,
        zarPerUsd: s.zarPerUsd,
        usableFraction: s.usableFraction,
        theme: s.theme,
        layers: s.layers,
        templateId: s.templateId,
        mode: s.mode,
        stash: s.stash
          ? {
              nodes: s.stash.nodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
              edges: s.stash.edges.map(({ id, type, source, target, data }) => ({
                id,
                type,
                source,
                target,
                data,
              })),
              templateId: s.stash.templateId,
            }
          : null,
      }),
    },
  ),
);
