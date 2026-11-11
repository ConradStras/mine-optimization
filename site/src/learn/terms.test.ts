import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../model/catalogue';
import { STEPS } from './steps';
import { TERM_BY_ID } from './terms';

/** Every source file's text, bundled by Vite at test time. */
const SOURCES = import.meta.glob<string>(['../**/*.ts', '../**/*.tsx', '!../**/*.test.*'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

describe('every term used in the UI has a term card', () => {
  it('in <Term id="…"> chips across the source', () => {
    const used = new Set<string>();
    for (const text of Object.values(SOURCES)) {
      for (const m of text.matchAll(/<Term\s+(?:key=\{[^}]+\}\s+)?id="([^"]+)"/g)) used.add(m[1]!);
      for (const m of text.matchAll(/termId: '([^']+)'/g)) used.add(m[1]!);
    }
    expect(used.size).toBeGreaterThan(15);
    for (const id of used) expect(TERM_BY_ID[id], id).toBeDefined();
  });

  it('in the catalogue and the guided steps', () => {
    for (const c of Object.values(CATALOGUE)) expect(TERM_BY_ID[c.termId], c.termId).toBeDefined();
    for (const s of STEPS) for (const t of s.terms) expect(TERM_BY_ID[t], t).toBeDefined();
  });
});
