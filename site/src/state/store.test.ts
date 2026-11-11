import { beforeEach, describe, expect, it } from 'vitest';
import { analyse } from '../engine';
import { STEPS, unlockedKinds } from '../learn/steps';
import { toLayout, useStore } from './store';

const initial = useStore.getState();
beforeEach(() => useStore.setState(initial, true));

describe('store', () => {
  it('starts with the reversible template, which analyses cleanly', () => {
    const { nodes, edges } = useStore.getState();
    const a = analyse(toLayout(nodes, edges));
    expect(a.cycle?.generate.gridPower).toBeGreaterThan(20e6);
  });

  it('maps canvas y to elevation (up is positive)', () => {
    const upper = useStore.getState().nodes.find((n) => n.id === 'upper')!;
    expect(upper.position.y).toBe(-10);
    useStore.getState().setElevation('upper', 25);
    expect(useStore.getState().nodes.find((n) => n.id === 'upper')!.position.y).toBe(-25);
  });

  it('keeps the expert layout aside during the guided build and brings it back', () => {
    const before = useStore.getState().nodes.length;
    useStore.getState().setGuideMode('guided');
    expect(useStore.getState().nodes).toHaveLength(0);
    expect(useStore.getState().step).toBe(0);
    useStore.getState().setGuideMode('expert');
    expect(useStore.getState().nodes).toHaveLength(before);
  });

  it('keeps what was built in guided mode when switching to expert', () => {
    useStore.getState().setGuideMode('guided');
    useStore.getState().addComponent('upperReservoir');
    useStore.getState().setGuideMode('expert');
    expect(useStore.getState().nodes.map((n) => n.data.kind)).toEqual(['upperReservoir']);
  });

  it('can undo a clear', () => {
    const before = useStore.getState().nodes.length;
    useStore.getState().clear();
    expect(useStore.getState().nodes).toHaveLength(0);
    expect(useStore.getState().nudge?.undo).toBe(true);
    useStore.getState().undoLastClear();
    expect(useStore.getState().nodes).toHaveLength(before);
  });

  it('removing a component also removes its pipes', () => {
    useStore.getState().remove('unit');
    const { edges } = useStore.getState();
    expect(edges.some((e) => e.source === 'unit' || e.target === 'unit')).toBe(false);
  });

  it('does not lay a second pipe between the same two components', () => {
    const n = useStore.getState().edges.length;
    useStore
      .getState()
      .onConnect({ source: 'unit', target: 'lower', sourceHandle: null, targetHandle: null });
    useStore
      .getState()
      .onConnect({ source: 'lower', target: 'unit', sourceHandle: null, targetHandle: null });
    expect(useStore.getState().edges).toHaveLength(n);
  });

  it('remembers that each mode has been played, for the guided steps', () => {
    useStore.getState().setPlaying(true);
    expect(useStore.getState().played.generate).toBe(true);
    useStore.getState().setMode('pump');
    useStore.getState().setPlaying(true);
    expect(useStore.getState().played.pump).toBe(true);
  });
});

describe('guided steps', () => {
  it('unlock components step by step, ending with everything', () => {
    expect([...unlockedKinds(0)].sort()).toEqual(['lowerReservoir', 'upperReservoir']);
    expect(unlockedKinds(STEPS.length - 1).size).toBe(9);
  });
});
