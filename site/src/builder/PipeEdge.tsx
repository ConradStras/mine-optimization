import { EdgeLabelRenderer, getSmoothStepPath, useInternalNode, type EdgeProps } from '@xyflow/react';
import { memo } from 'react';
import { along, floatingAnchors, velocityBand } from './geometry';
import { num } from '../lib/format';
import { useAnalysis } from '../state/context';
import { useStore, type PipeEdge as PEdge } from '../state/store';

function PipeEdgeView({ id, source, target, data, selected }: EdgeProps<PEdge>) {
  const a = useInternalNode(source);
  const b = useInternalNode(target);
  const { analysis } = useAnalysis();
  const mode = useStore((s) => s.mode);
  const playing = useStore((s) => s.playing);
  const highlight = useStore((s) => s.highlight);
  const layers = useStore((s) => s.layers);
  const explainer = useStore((s) => s.explainer);
  if (!a || !b || !data) return null;
  // Explainers show water moving even while playback is paused.
  const demo =
    explainer === 'pump'
      ? 'pump'
      : explainer === 'friction' || explainer === 'turbine' || explainer === 'roundTrip'
        ? 'generate'
        : null;
  const flowMode = playing ? mode : (demo ?? mode);

  const [s, t] = floatingAnchors(a, b);
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX: s.x,
    sourceY: s.y,
    sourcePosition: s.position,
    targetX: t.x,
    targetY: t.y,
    targetPosition: t.position,
    borderRadius: 22,
    offset: 18,
  });

  const flow = analysis.edgeFlows[id];
  const route = flowMode === 'generate' ? analysis.routes.generate : analysis.routes.pump;
  // Generating, water runs from the upper reservoir down the route; pumping, it runs back up.
  const dir = along(route, source, target) * (flowMode === 'generate' ? 1 : -1);
  const v = flowMode === 'generate' ? flow?.generateVelocity : flow?.pumpVelocity;
  const flowing = (playing || demo !== null) && dir !== 0 && v !== undefined && v > 0;
  const width = 5 + data.diameter * 3.2;
  const vAny = flow?.generateVelocity ?? flow?.pumpVelocity;
  const band = vAny !== undefined ? velocityBand(vAny) : undefined;
  const lit = highlight?.edgeIds.includes(id) ?? false;
  const dim = highlight ? !lit : false;
  const onRoute =
    analysis.routes.generate?.edgeIds.includes(id) || analysis.routes.pump?.edgeIds.includes(id);

  const cls = [
    'pipe',
    selected && 'is-selected',
    lit && 'is-lit',
    dim && 'is-dim',
    !onRoute && 'is-idle',
    layers.frictionHeat && band && `heat-${band}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <g className={cls}>
      <path d={path} className="pipe__hit" strokeWidth={Math.max(width + 16, 24)} />
      <path d={path} className="pipe__casing" strokeWidth={width + 4} />
      <path d={path} className="pipe__bore" strokeWidth={width} />
      {flowing && (
        <path
          d={path}
          className="pipe__flow"
          strokeWidth={Math.max(width * 0.42, 2.5)}
          style={{
            animationDuration: `${Math.min(3, Math.max(0.18, 2.6 / v))}s`,
            animationDirection: dir > 0 ? 'normal' : 'reverse',
          }}
        />
      )}
      {(layers.flowLabels || selected) && (
        <EdgeLabelRenderer>
          <div
            className={`pipe-label nodrag nopan${selected ? ' is-selected' : ''}${band ? ` band-${band}` : ''}`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            <span>Ø{num(data.diameter * 1000)} mm</span>
            {vAny !== undefined && <span className="pipe-label__v">{num(vAny, 1)} m/s</span>}
            {flow && <span className="pipe-label__len">{num(flow.length)} m</span>}
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  );
}

export const PipeEdge = memo(PipeEdgeView);
