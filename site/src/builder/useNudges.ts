import { useEffect, useRef } from 'react';
import type { Analysis } from '../engine';
import { energy, pct, power } from '../lib/format';
import { useAnalysis } from '../state/context';
import { useStore, type ChangeKind } from '../state/store';

interface Snapshot {
  rte?: number;
  power?: number;
  energy?: number;
  head: number;
  loss?: number;
}

const snap = (a: Analysis): Snapshot => ({
  rte: a.pumpAssumed ? undefined : a.cycle?.roundTripEfficiency,
  power: a.cycle?.generate.gridPower,
  energy: a.cycle?.storedEnergy,
  head: a.grossHead,
  loss: a.cycle?.generate.hydraulics.totalLoss,
});

const CAUSE: Partial<Record<ChangeKind, { text: string; termId: string }>> = {
  diameter: {
    text: 'A narrower pipe makes the same flow move faster, and friction grows with the square of velocity. A wider one does the opposite, but costs more.',
    termId: 'headLoss',
  },
  flow: {
    text: 'More flow means more power, but friction grows with the square of the flow and the reservoir empties sooner.',
    termId: 'flowRate',
  },
  elevation: {
    text: 'Moving a reservoir changes the head, and stored energy and power scale directly with it.',
    termId: 'grossHead',
  },
  length: { text: 'A longer pipe adds friction in proportion to its length.', termId: 'headLoss' },
  material: {
    text: 'Rougher pipe walls grip the water more and raise the friction factor.',
    termId: 'frictionFactor',
  },
  efficiency: {
    text: 'Machine and electrical efficiencies multiply through the whole cycle.',
    termId: 'roundTripEfficiency',
  },
  volume: {
    text: 'Energy stored scales with the volume cycled; power does not change.',
    termId: 'powerEnergy',
  },
  fitting: { text: 'Each fitting adds K × v²/2g of loss.', termId: 'minorLoss' },
};

/** Explains a sharp change in results right after the user changes something. */
export function useNudges() {
  const { analysis } = useAnalysis();
  const lastChange = useStore((s) => s.lastChange);
  const setNudge = useStore((s) => s.setNudge);
  const prev = useRef<Snapshot | null>(null);

  useEffect(() => {
    const now = snap(analysis);
    const before = prev.current;
    prev.current = now;
    if (!before || !lastChange || Date.now() - lastChange.at > 1500) return;
    const cause = CAUSE[lastChange.kind];
    if (!cause) return;
    const parts: string[] = [];
    if (before.rte !== undefined && now.rte !== undefined && Math.abs(now.rte - before.rte) >= 0.015)
      parts.push(
        `Round-trip efficiency ${now.rte > before.rte ? 'rose' : 'fell'} from ${pct(before.rte)} to ${pct(now.rte)}.`,
      );
    if (before.power && now.power && Math.abs(now.power / before.power - 1) >= 0.12) {
      const a = power(before.power);
      const b = power(now.power);
      parts.push(
        `Power ${now.power > before.power ? 'rose' : 'fell'} from ${a.value} ${a.unit} to ${b.value} ${b.unit}.`,
      );
    }
    if (
      parts.length === 0 &&
      before.energy &&
      now.energy &&
      Math.abs(now.energy / before.energy - 1) >= 0.15
    ) {
      const a = energy(before.energy);
      const b = energy(now.energy);
      parts.push(`Stored energy went from ${a.value} ${a.unit} to ${b.value} ${b.unit}.`);
    }
    if (parts.length === 0) return;
    setNudge({
      kicker: 'Why did that change?',
      text: `${parts.join(' ')} ${cause.text}`,
      termId: cause.termId,
    });
  }, [analysis, lastChange, setNudge]);
}
