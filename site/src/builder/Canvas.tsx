import {
  ConnectionMode,
  Controls,
  ReactFlow,
  useNodesInitialized,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import { useCallback, useEffect, useRef, type DragEvent } from 'react';
import type { ComponentKind } from '../engine';
import { ExplainerCard, ExplainerLayer } from '../learn/Explainer';
import { CATALOGUE } from '../model/catalogue';
import { useStore } from '../state/store';
import { CanvasToolbar, HighlightBanner, NudgeToast, PlaybackHud } from './CanvasChrome';
import { useNudges } from './useNudges';
import { ComponentNode } from './ComponentNode';
import { DRAG_MIME } from './Palette';
import { PipeEdge } from './PipeEdge';
import { Underground } from './Underground';

const nodeTypes: NodeTypes = { component: ComponentNode };
const edgeTypes: EdgeTypes = { pipe: PipeEdge };

export function Canvas() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const onNodesChange = useStore((s) => s.onNodesChange);
  const onEdgesChange = useStore((s) => s.onEdgesChange);
  const onConnect = useStore((s) => s.onConnect);
  const select = useStore((s) => s.select);
  const addComponent = useStore((s) => s.addComponent);
  const templateId = useStore((s) => s.templateId);
  const guided = useStore((s) => s.guideMode === 'guided');
  const { screenToFlowPosition, fitView, setViewport } = useReactFlow();
  const wrapper = useRef<HTMLDivElement>(null);
  useNudges();

  // Frame the whole mine once components have been measured, and again when a template loads.
  // Adding a single component must not move the camera, so only template changes re-frame.
  const initialised = useNodesInitialized();
  const framed = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (nodes.length > 0 && !initialised) return;
    if (framed.current === templateId) return;
    framed.current = templateId;
    const t = setTimeout(
      () =>
        nodes.length > 0
          ? fitView({ padding: 0.16, duration: 400 })
          : setViewport({ x: 420, y: 160, zoom: 0.7 }, { duration: 300 }),
      30,
    );
    return () => clearTimeout(t);
  }, [initialised, templateId, nodes.length, fitView, setViewport]);

  const onSelectionChange = useCallback(
    ({ nodes: n, edges: e }: OnSelectionChangeParams) => {
      const id = n[0]?.id ?? e[0]?.id ?? null;
      if (useStore.getState().selectedId !== id) select(id);
    },
    [select],
  );

  const onDragOver = (e: DragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const onDrop = (e: DragEvent) => {
    const kind = e.dataTransfer.getData(DRAG_MIME) as ComponentKind;
    if (!kind || !(kind in CATALOGUE)) return;
    e.preventDefault();
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addComponent(kind, { x: Math.round(p.x / 10) * 10, y: Math.round(p.y / 5) * 5 });
  };

  return (
    <div className="canvas" ref={wrapper} onDragOver={onDragOver} onDrop={onDrop}>
      <Underground />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onPaneClick={() => select(null)}
        nodeOrigin={[0.5, 0.5]}
        connectionMode={ConnectionMode.Loose}
        snapToGrid
        snapGrid={[10, 5]}
        deleteKeyCode={['Backspace', 'Delete']}
        minZoom={0.08}
        maxZoom={3}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        proOptions={{ hideAttribution: false }}
        connectionLineStyle={{ stroke: 'var(--water)', strokeWidth: 4, strokeDasharray: '6 6' }}
        aria-label="Mine cross-section. Place and connect components."
      >
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
      <ExplainerLayer />
      <div className="canvas__top">
        <CanvasToolbar />
        <PlaybackHud />
      </div>
      <HighlightBanner />
      <ExplainerCard />
      <NudgeToast />
      {nodes.length === 0 && (
        <div className="canvas__empty">
          <p className="canvas__empty-title">{guided ? 'Start with two reservoirs' : 'An empty mine'}</p>
          <p>Drag components from the left onto the cross-section, or click one to add it.</p>
        </div>
      )}
    </div>
  );
}
