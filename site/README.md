# Shaftline site — pumped storage builder (Phase 1)

An interactive tool for weighing up pumped storage in a disused mine shaft. The engineer builds the system on a cross-section of the mine; the physics, losses and capital cost update live, and every technical term explains itself on the user's own design.

Scope and roadmap: [../pump-storage-systems/docs/requirements-and-phases.md](../pump-storage-systems/docs/requirements-and-phases.md). Physics follows the technical note in [../pump-storage-systems/](../pump-storage-systems/).

## Run it

Needs Node 20 or later and pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm check        # type check, lint, format check, tests, production build
pnpm build        # static site in dist/ (hash routing, relative paths: host anywhere)
```

## What Phase 1 does

| Area     | What is there                                                                                                                                                                                                                                                                                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Builder  | Mine cross-section where canvas depth is real depth (1 unit = 1 m). Drag reservoirs, pump-turbines, pumps, turbines, bends and valves; draw pipes between connection dots; pipes re-route as things move. Transformer and controls sit at the surface with live cables down the shaft.                                                                                            |
| Physics  | Darcy–Weisbach friction with Swamee–Jain, fitting losses, net and pumping head, turbine and pump power, stored energy, full-cycle energy chain and round-trip efficiency (technical note §2–4).                                                                                                                                                                                   |
| Playback | Generate and pump modes: reservoirs drain and fill, runners spin, water flows at a speed that follows velocity, with a simulated clock, power and energy delivered.                                                                                                                                                                                                               |
| Results  | KPI tiles, advisory checks (never blocking), energy waterfall from grid in to grid out, trade-off curves (power and efficiency against flow and pipe size), capital cost by category, bill of quantities. Pin a design as a baseline to see every KPI's change.                                                                                                                   |
| Costs    | Every component and pipe carries an indicative cost card (CAPEX, O&M, life). Rand or US dollar with an editable exchange rate.                                                                                                                                                                                                                                                    |
| Learning | Guided mode unlocks the builder in five steps and plays an on-canvas explainer filled with the user's own numbers at each one. Underlined terms open plain-language cards with a mining analogy, the equation and the live value; "What affects it" and "Trace" light up the parts that drive a number; a nudge explains any sharp change. Glossary page tracks discovered terms. |
| Files    | Save and open layouts as JSON. Work persists in the browser.                                                                                                                                                                                                                                                                                                                      |

## Code map

```
src/engine/     Pure TypeScript model: no React, DOM or storage (enforced by ESLint)
  hydraulics.ts   friction factor, velocity, head loss
  power.ts        turbine and pump power (§2)
  energy.ts       stored energy (§3)
  cycle.ts        full cycle, loss breakdown, trade-off sweeps (§4)
  components.ts   component kinds, materials, defaults
  costs.ts        indicative cost cards (§8)
  layout.ts       canvas graph → routes, system spec, issues, costs, dependencies
src/model/      Catalogue (labels, sizes), templates, metric names
src/state/      Zustand store (canvas, playback, guidance, settings) and the shared analysis
src/builder/    Canvas, component art, pipes, mine background, palette, inspector, overlays
src/learn/      Terms, guided steps, term cards, explainers
src/components/ Results panels, charts, form fields, icons
src/pages/      Home, builder, glossary
```

The engine is the single source of numbers: the canvas, KPIs, explainers and term cards all read the same `analyse()` result, so they can never disagree.

## Model assumptions (Phase 1)

- Gross head is constant: the difference between the two water levels. Level change inside each reservoir is ignored.
- Machines run at rated flow with constant efficiency (no part-load curve).
- Intake K = 0.5 and outlet K = 1.0 on each route; each fitting's K applies to the pipe leaving it.
- Pipe length = vertical drop between its ends + the horizontal run set by the user.
- Seepage and evaporation are a share of stored volume per cycle; transformer loss applies each way.
- Cost rates are indicative 2026 placeholders for comparison, excluding owner's costs, contingency and VAT.
- Not yet modelled: cash flow (Phase 2), solar and batteries (Phase 3), water hammer (Phase 4), heavy fluids (Phase 5).

## Tests

`pnpm test` runs 49 tests:

- **Physics**: Swamee–Jain against an independent Colebrook–White solver, hand-calculated power and energy, energy conservation through the full cycle (grid in = losses + grid out), net and pump head, and the friction trade-off.
- **Templates**: each template analyses without errors and lands in the note's 70–85% efficiency band, the 200 MW reference gives about 200 MW for about 8 hours, and capital cost equals the sum of its cost lines.
- **Layout checks**: warnings for missing reservoirs, an inverted head, a missing pump route, narrow pipes and a missing transformer.
- **Store**: guided-mode stash and restore, undo of clear, and pipe de-duplication.
- **UI**: KPI tiles, the energy waterfall, term cards with live values, baseline deltas, and a check that every term used in the UI has a card.
