import { Handle, Position, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { isHydraulic, type NodeData } from '../engine';
import { num, power } from '../lib/format';
import { CATALOGUE } from '../model/catalogue';
import { useAnalysis } from '../state/context';
import { useStore, type ComponentNode as CNode } from '../state/store';
import { NodeArt } from './NodeArt';

const SIDES = [
  { id: 't', position: Position.Top },
  { id: 'r', position: Position.Right },
  { id: 'b', position: Position.Bottom },
  { id: 'l', position: Position.Left },
] as const;

function caption(data: NodeData, ratingW: number | undefined): string {
  switch (data.kind) {
    case 'upperReservoir':
    case 'lowerReservoir':
      return `${num(data.volume)} m³`;
    case 'reversibleUnit':
    case 'turbine':
    case 'pump': {
      const p = power(ratingW);
      return ratingW ? `${num(data.flow, 1)} m³/s · ${p.value} ${p.unit}` : `${num(data.flow, 1)} m³/s`;
    }
    case 'bend':
    case 'valve':
      return `K ${num(data.k, 2)}`;
    case 'transformer':
      return `${num(data.lossPct, 1)}% loss`;
    case 'controls':
      return 'SCADA';
  }
}

function ComponentNodeView({ id, data, selected }: NodeProps<CNode>) {
  const d = data as NodeData;
  const item = CATALOGUE[d.kind];
  const { analysis } = useAnalysis();
  const mode = useStore((s) => s.mode);
  const playing = useStore((s) => s.playing);
  const level = useStore((s) => s.level);
  const highlight = useStore((s) => s.highlight);
  const elevation = useStore((s) => Math.round(-(s.nodes.find((n) => n.id === id)?.position.y ?? 0)));

  const genMachine = analysis.routes.generate?.machineId;
  const pumpMachine = analysis.routes.pump?.machineId;
  const explainer = useStore((s) => s.explainer);
  const activeMachine = mode === 'generate' ? genMachine : pumpMachine;
  const demoMachine =
    explainer === 'turbine' || explainer === 'roundTrip'
      ? genMachine
      : explainer === 'pump'
        ? pumpMachine
        : undefined;
  const spinning = (playing && activeMachine === id) || (!playing && demoMachine === id);
  const reverse = playing ? mode === 'pump' : explainer === 'pump';

  let fill = 0;
  if (d.kind === 'upperReservoir') fill = id === analysis.upperId ? level : 0.5;
  if (d.kind === 'lowerReservoir') fill = id === analysis.lowerId ? 1 - level : 0.5;

  const cycle = analysis.cycle;
  let ratingW: number | undefined;
  if (cycle && id === genMachine) ratingW = cycle.generate.gridPower;
  else if (cycle && id === pumpMachine && !analysis.pumpAssumed) ratingW = cycle.pump.gridPower;

  const lit = highlight ? highlight.nodeIds.includes(id) : false;
  const dim = highlight ? !lit : false;
  const hasIssue = analysis.issues.some((i) => i.severity !== 'info' && i.nodeIds.includes(id));

  return (
    <div
      className={`cnode cnode--${d.kind}${selected ? ' is-selected' : ''}${lit ? ' is-lit' : ''}${dim ? ' is-dim' : ''}${spinning ? ' is-running' : ''}`}
      style={{ width: item.size.w, height: item.size.h }}
      data-testid={`node-${d.kind}`}
    >
      {isHydraulic(d.kind) &&
        SIDES.map((s) => (
          <Handle key={s.id} id={s.id} type="source" position={s.position} className="port" />
        ))}
      <NodeArt data={d} fill={fill} spinning={spinning} reverse={reverse} spinPeriod={0.9} />
      <div className="cnode__label">
        <span className="cnode__name">{item.name}</span>
        <span className="cnode__meta">{caption(d, ratingW)}</span>
      </div>
      {isHydraulic(d.kind) && (
        <span className="cnode__elev" title="Elevation relative to the shaft collar">
          {elevation > 0 ? '+' : ''}
          {elevation} m
        </span>
      )}
      {hasIssue && <span className="cnode__flag" title="See the checks in Results" />}
    </div>
  );
}

export const ComponentNode = memo(ComponentNodeView);
