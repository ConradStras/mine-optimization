import { useMemo, type ReactNode } from 'react';
import { analyse, diameterSweep, flowSweep } from '../engine';
import { AnalysisContext, type AnalysisValue } from './context';
import { toLayout, useStore } from './store';

/** Runs the engine once per change of the layout and shares the result with every view. */
export function AnalysisProvider({ children }: { children: ReactNode }) {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const usableFraction = useStore((s) => s.usableFraction);
  const value = useMemo<AnalysisValue>(() => {
    const analysis = analyse(toLayout(nodes, edges), { usableFraction });
    const sweeps = analysis.spec
      ? { flow: flowSweep(analysis.spec, 48, 0.1, 3), diameter: diameterSweep(analysis.spec, 48, 0.4, 2) }
      : null;
    return { analysis, sweeps };
  }, [nodes, edges, usableFraction]);
  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}
