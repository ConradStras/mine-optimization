import { describe, expect, it } from 'vitest';
import {
  G,
  WATER,
  diameterSweep,
  flowSweep,
  frictionFactor,
  jToKWh,
  potentialEnergy,
  pumpPower,
  reynolds,
  segmentLoss,
  simulateCycle,
  turbinePower,
  type SystemSpec,
} from './index';

/** Independent Colebrook–White solution by fixed-point iteration, to check Swamee–Jain. */
function colebrook(re: number, eps: number, d: number): number {
  let x = 0.02;
  for (let i = 0; i < 100; i++) {
    x = Math.pow(-2 * Math.log10(eps / (3.7 * d) + 2.51 / (re * Math.sqrt(x))), -2);
  }
  return x;
}

describe('hydraulics', () => {
  it('Swamee–Jain stays within 1.5% of Colebrook–White over the working range', () => {
    for (const re of [1e4, 1e5, 1e6, 5e6, 2e7]) {
      for (const [eps, d] of [
        [4.5e-5, 1.4],
        [1.5e-6, 0.5],
        [3e-5, 3.5],
      ] as const) {
        const sj = frictionFactor(re, eps, d);
        expect(Math.abs(sj / colebrook(re, eps, d) - 1)).toBeLessThan(0.015);
      }
    }
  });

  it('uses 64/Re for laminar flow', () => {
    expect(frictionFactor(1000, 1e-5, 1)).toBeCloseTo(0.064, 10);
  });

  it('computes the Darcy–Weisbach loss by hand for a 1 m pipe at 1 m/s', () => {
    const q = Math.PI / 4; // gives v = 1 m/s in D = 1 m
    const loss = segmentLoss({ id: 'p', length: 1000, diameter: 1, roughness: 4.5e-5, minorK: 2 }, q, WATER);
    expect(loss.velocity).toBeCloseTo(1, 10);
    expect(loss.reynolds).toBeCloseTo(reynolds(WATER, 1, 1), 6);
    const hv = 1 / (2 * G);
    expect(loss.majorLoss).toBeCloseTo(loss.frictionFactor * 1000 * hv, 10);
    expect(loss.minorLoss).toBeCloseTo(2 * hv, 10);
  });
});

describe('power and energy (technical note §2–3)', () => {
  it('turbine power P = η·ρ·g·H·Q', () => {
    expect(turbinePower(0.9, 1000, 100, 10)).toBeCloseTo(0.9 * 1000 * 9.81 * 100 * 10, 6); // 8.829 MW
  });
  it('turbine power is zero when friction eats all the head', () => {
    expect(turbinePower(0.9, 1000, -5, 10)).toBe(0);
  });
  it('pump power P = ρ·g·H·Q / η', () => {
    expect(pumpPower(0.85, 1000, 120, 2)).toBeCloseTo((1000 * 9.81 * 120 * 2) / 0.85, 6);
  });
  it('stored energy E = ρ·V·g·h, 100 000 m³ at 500 m is 136 250 kWh', () => {
    expect(jToKWh(potentialEnergy(1000, 100_000, 500))).toBeCloseTo(136_250, 6);
  });
});

const frictionless = (over: Partial<SystemSpec> = {}): SystemSpec => ({
  fluid: WATER,
  grossHead: 300,
  usableVolume: 50_000,
  generatePath: [{ id: 'a', length: 0, diameter: 1, roughness: 0, minorK: 0 }],
  pumpPath: [{ id: 'a', length: 0, diameter: 1, roughness: 0, minorK: 0 }],
  turbine: { flow: 3, efficiency: 1 },
  pump: { flow: 3, efficiency: 1 },
  electricalLoss: 0,
  storageLoss: 0,
  ...over,
});

describe('storage cycle (technical note §4)', () => {
  it('is 100% efficient with ideal machines and no losses', () => {
    expect(simulateCycle(frictionless()).roundTripEfficiency).toBeCloseTo(1, 12);
  });

  it('multiplies machine, electrical and storage efficiencies when pipes are frictionless', () => {
    const r = simulateCycle(
      frictionless({ turbine: { flow: 3, efficiency: 0.9 }, pump: { flow: 3, efficiency: 0.9 }, electricalLoss: 0.01, storageLoss: 0.02 }),
    );
    expect(r.roundTripEfficiency).toBeCloseTo(0.9 * 0.9 * 0.99 * 0.99 * 0.98, 12);
  });

  it('conserves energy: grid in = every loss + grid out', () => {
    const r = simulateCycle({
      ...frictionless({ electricalLoss: 0.012, storageLoss: 0.01 }),
      generatePath: [{ id: 'a', length: 600, diameter: 1.2, roughness: 4.5e-5, minorK: 2.5 }],
      pumpPath: [{ id: 'a', length: 600, diameter: 1.2, roughness: 4.5e-5, minorK: 2.5 }],
      turbine: { flow: 4, efficiency: 0.9 },
      pump: { flow: 3.5, efficiency: 0.88 },
    });
    const losses = r.losses.reduce((s, l) => s + l.kWh, 0);
    expect((losses + r.gridEnergyOut) / r.gridEnergyIn).toBeCloseTo(1, 10);
    expect(r.losses.every((l) => l.kWh >= 0)).toBe(true);
    expect(r.roundTripEfficiency).toBeGreaterThan(0.7);
    expect(r.roundTripEfficiency).toBeLessThan(0.85);
  });

  it('net head is gross head minus friction, pump head is gross head plus friction', () => {
    const r = simulateCycle({
      ...frictionless(),
      generatePath: [{ id: 'a', length: 500, diameter: 1, roughness: 4.5e-5, minorK: 1.5 }],
      pumpPath: [{ id: 'a', length: 500, diameter: 1, roughness: 4.5e-5, minorK: 1.5 }],
    });
    const hL = r.generate.hydraulics.totalLoss;
    expect(hL).toBeGreaterThan(0);
    expect(r.generate.machineHead).toBeCloseTo(300 - hL, 10);
    expect(r.pump.machineHead).toBeCloseTo(300 + hL, 10);
  });

  it('generating hours = usable volume ÷ flow', () => {
    const r = simulateCycle(frictionless());
    expect(r.generate.hours).toBeCloseTo(50_000 / 3 / 3600, 10);
  });
});

describe('design trade-off sweeps', () => {
  const real = frictionless({
    generatePath: [{ id: 'a', length: 800, diameter: 0.8, roughness: 4.5e-5, minorK: 2 }],
    pumpPath: [{ id: 'a', length: 800, diameter: 0.8, roughness: 4.5e-5, minorK: 2 }],
    turbine: { flow: 2, efficiency: 0.9 },
    pump: { flow: 2, efficiency: 0.88 },
  });

  it('power peaks at an interior flow, because friction grows with Q²', () => {
    const pts = flowSweep(real, 60, 0.1, 6);
    const best = pts.reduce((a, b) => (b.power > a.power ? b : a));
    expect(best.x).toBeGreaterThan(pts[0]!.x);
    expect(best.x).toBeLessThan(pts[pts.length - 1]!.x);
  });

  it('round-trip efficiency rises with pipe diameter', () => {
    const pts = diameterSweep(real);
    for (let i = 1; i < pts.length; i++) expect(pts[i]!.rte).toBeGreaterThanOrEqual(pts[i - 1]!.rte);
  });
});
