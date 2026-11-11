import { createContext, useContext, useMemo } from 'react';
import type { Analysis, CurvePoint } from '../engine';
import { useStore } from './store';

export interface AnalysisValue {
  analysis: Analysis;
  sweeps: { flow: CurvePoint[]; diameter: CurvePoint[] } | null;
}

export const AnalysisContext = createContext<AnalysisValue | null>(null);

export function useAnalysis(): AnalysisValue {
  const v = useContext(AnalysisContext);
  if (!v) throw new Error('useAnalysis must be used inside <AnalysisProvider>');
  return v;
}

export function useMoney() {
  const currency = useStore((s) => s.currency);
  const zarPerUsd = useStore((s) => s.zarPerUsd);
  return useMemo(() => ({ currency, zarPerUsd }), [currency, zarPerUsd]);
}
