import { Position, type InternalNode } from '@xyflow/react';
import type { Route } from '../engine';

interface Anchor {
  x: number;
  y: number;
  position: Position;
}

function box(n: InternalNode) {
  const w = n.measured.width ?? 0;
  const h = n.measured.height ?? 0;
  const { x, y } = n.internals.positionAbsolute;
  return { cx: x + w / 2, cy: y + h / 2, w, h };
}

/** Pipes attach to whichever side faces the other component, so they re-route as things move. */
export function floatingAnchors(a: InternalNode, b: InternalNode): [Anchor, Anchor] {
  const s = box(a);
  const t = box(b);
  const dx = t.cx - s.cx;
  const dy = t.cy - s.cy;
  if (Math.abs(dy) > Math.abs(dx) * 0.6) {
    const down = dy > 0;
    return [
      { x: s.cx, y: s.cy + (down ? s.h / 2 : -s.h / 2), position: down ? Position.Bottom : Position.Top },
      { x: t.cx, y: t.cy + (down ? -t.h / 2 : t.h / 2), position: down ? Position.Top : Position.Bottom },
    ];
  }
  const right = dx > 0;
  return [
    { x: s.cx + (right ? s.w / 2 : -s.w / 2), y: s.cy, position: right ? Position.Right : Position.Left },
    { x: t.cx + (right ? -t.w / 2 : t.w / 2), y: t.cy, position: right ? Position.Left : Position.Right },
  ];
}

/** +1 if water runs source→target along the route, −1 if target→source, 0 if not on it. */
export function along(route: Route | undefined, source: string, target: string): number {
  if (!route) return 0;
  const i = route.nodeIds.indexOf(source);
  const j = route.nodeIds.indexOf(target);
  if (i < 0 || j < 0 || Math.abs(i - j) !== 1) return 0;
  return j > i ? 1 : -1;
}

export function velocityBand(v: number): 'slow' | 'good' | 'fast' | 'too-fast' {
  if (v < 0.7) return 'slow';
  if (v <= 4) return 'good';
  if (v <= 6) return 'fast';
  return 'too-fast';
}
