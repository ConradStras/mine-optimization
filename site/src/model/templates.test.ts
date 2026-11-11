import { describe, expect, it } from 'vitest';
import { analyse, DEFAULT_SETTINGS, type Layout } from '../engine';
import { TEMPLATES, toLayout } from './templates';

const template = (id: string) => toLayout(TEMPLATES.find((t) => t.id === id)!);

describe('templates', () => {
  it.each(TEMPLATES.map((t) => t.id))(
    '%s analyses without errors and lands in the 70–85%% efficiency band',
    (id) => {
      const a = analyse(template(id));
      expect(a.issues.filter((i) => i.severity === 'error')).toEqual([]);
      expect(a.cycle).toBeDefined();
      expect(a.pumpAssumed).toBe(false);
      expect(a.cycle!.roundTripEfficiency).toBeGreaterThan(0.7);
      expect(a.cycle!.roundTripEfficiency).toBeLessThan(0.85);
    },
  );

  it('reversible template: head comes from reservoir elevations and pipe lengths from geometry', () => {
    const a = analyse(template('reversible'));
    expect(a.grossHead).toBe(510);
    expect(a.usableVolume).toBeCloseTo(120_000 * DEFAULT_SETTINGS.usableFraction, 6);
    expect(a.edgeFlows.p2!.length).toBe(480); // vertical shaft from collar to shaft bottom
    expect(a.edgeFlows.p1!.length).toBe(70); // 10 m drop + 60 m horizontal run
    expect(a.routes.generate!.machineId).toBe('unit');
    expect(a.routes.pump!.machineId).toBe('unit');
  });

  it('separate template routes generation through the turbine and pumping through the pump', () => {
    const a = analyse(template('separate'));
    expect(a.routes.generate!.machineId).toBe('turbine');
    expect(a.routes.pump!.machineId).toBe('pump');
    expect(a.routes.generate!.edgeIds).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('the 200 MW reference delivers roughly 200 MW for roughly 8 hours', () => {
    const c = analyse(template('note200')).cycle!;
    expect(c.generate.gridPower / 1e6).toBeGreaterThan(180);
    expect(c.generate.gridPower / 1e6).toBeLessThan(220);
    expect(c.generate.hours).toBeGreaterThan(7);
    expect(c.generate.hours).toBeLessThan(9.5);
  });

  it('total capital cost is the sum of every component and pipe cost line', () => {
    const t = template('reversible');
    const a = analyse(t);
    expect(a.costs.lines).toHaveLength(t.nodes.length + t.edges.length);
    const sum = a.costs.lines.reduce((s, l) => s + l.capex, 0);
    expect(a.costs.totalCapex).toBeCloseTo(sum, 6);
    expect(Object.values(a.costs.byCategory).reduce((s, v) => s + v, 0)).toBeCloseTo(sum, 6);
  });
});

describe('layout checks (warn, never block)', () => {
  it('reports missing reservoirs', () => {
    const a = analyse({ nodes: [], edges: [] });
    expect(a.issues.map((i) => i.id)).toEqual(expect.arrayContaining(['no-upper', 'no-lower']));
    expect(a.cycle).toBeUndefined();
  });

  it('reports an upper reservoir placed below the lower one', () => {
    const t = template('reversible');
    const flipped: Layout = {
      ...t,
      nodes: t.nodes.map((n) => (n.id === 'upper' ? { ...n, elevation: -700 } : n)),
    };
    expect(analyse(flipped).issues.some((i) => i.id === 'head-negative')).toBe(true);
  });

  it('assumes pumping figures and says so when only a turbine is on the route', () => {
    const t = template('reversible');
    const turbineOnly: Layout = {
      ...t,
      nodes: t.nodes.map((n) =>
        n.id === 'unit' ? { ...n, data: { kind: 'turbine', flow: 6, eta: 0.9 } } : n,
      ),
    };
    const a = analyse(turbineOnly);
    expect(a.pumpAssumed).toBe(true);
    expect(a.issues.some((i) => i.id === 'no-pump-route')).toBe(true);
    expect(a.cycle!.generate.gridPower).toBeGreaterThan(0);
  });

  it('flags a pipe that is too narrow', () => {
    const t = template('reversible');
    const narrow: Layout = {
      ...t,
      edges: t.edges.map((e) => ({ ...e, data: { ...e.data, diameter: 0.8 } })),
    };
    const a = analyse(narrow);
    expect(a.issues.some((i) => i.id.startsWith('fast-'))).toBe(true);
    expect(a.cycle!.roundTripEfficiency).toBeLessThan(analyse(t).cycle!.roundTripEfficiency);
  });

  it('leaves electrical losses out, and says so, without a transformer', () => {
    const t = template('reversible');
    const a = analyse({ ...t, nodes: t.nodes.filter((n) => n.data.kind !== 'transformer') });
    expect(a.electricalAssumed).toBe(true);
    expect(a.issues.some((i) => i.id === 'no-transformer')).toBe(true);
  });

  it('lists every component on the generating route as a dependency of power', () => {
    const a = analyse(template('reversible'));
    expect(a.dependsOn.power.nodeIds).toEqual(
      expect.arrayContaining(['upper', 'valve', 'bend', 'unit', 'lower', 'xfmr']),
    );
    expect(a.dependsOn.grossHead.nodeIds.sort()).toEqual(['lower', 'upper']);
  });
});
