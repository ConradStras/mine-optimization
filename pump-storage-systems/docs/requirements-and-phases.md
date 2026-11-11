# Pump Storage Simulator — requirements and phased build plan

## Status (11 November 2026)

**Phase 1 is built** in [site/](../../site/), as planned below, plus a baseline comparison (pin a design, then see each KPI's change). Every component carries an indicative cost card. The editable cost library and the cash flow model are Phase 2.

## Context

A professional website of interactive engineering tools for mining. The first tool helps a mining engineer understand and weigh up a **small-to-medium pumped storage hydro (PSH) system built in a disused mine shaft**: upper reservoir at surface, lower reservoir underground, the shaft giving the head.

The base is the technical note `Desktop/mine-optimization/pump-storage-systems/TechnicalNoteSmallScalePumpedStorageSystems.pdf` (J A vB Strasheim, Oct 2026). It covers: power in turbine and pump mode (§2), stored energy (§3), round-trip efficiency 70–85% (§4), water hammer via Joukowsky (§5), pressure rating with a safety factor (§6), heavy fluids/slurries (§7), component costing a–g (§8), a DCF techno-economic evaluation compared with batteries (§9, §11: 30-year FCFF, NPV/IRR, WACC × arbitrage-spread sensitivity).

Decisions made with you:
- Lives in `Desktop/mine-optimization/` (new project; not the-integrated-method repo).
- React + TypeScript; pure, unit-tested physics and finance engine.
- Built in phases, each building on the last. **Phase 1 = power, energy, efficiency.**
- Currency switchable (ZAR / USD presets).
- An engineer places physical components on a builder canvas; every component carries a cost card that feeds the financial model.
- Four configurations are modelled and compared on equal terms:
  1. **PSH alone** (grid arbitrage)
  2. **Solar + battery (BESS)**, no PSH
  3. **Solar + PSH**
  4. **Hybrid: solar + battery + PSH**, where each storage does what it is naturally good at — the battery takes fast response, short cycles and frequent shallow swings; PSH takes bulk, long-duration (multi-hour/overnight) shifting with low degradation. The model finds where the two overlap and how to split the work.

## Centrepiece: interactive system builder

The engineer builds the system by placing physical components on a canvas instead of only filling in a form. The built layout *is* the model: physics and finance are computed from it.

- **Canvas**: a side-elevation view of the mine (surface line, shaft, depth scale in m). Components snap to a depth grid, so head comes from where the reservoirs are placed. Built on React Flow (`@xyflow/react`) for drag, connect, zoom and pan, with custom SVG node graphics.
- **Component palette** (each a typed node with physical properties and a cost card):

  | Component | Physical properties | Cost basis (editable, ZAR/USD) |
  |---|---|---|
  | Upper reservoir (dam, tank, excavated pond) | volume, elevation, footprint, seepage/evaporation % | per m³ + fixed, O&M %/yr |
  | Lower reservoir (underground chamber, tank, existing level) | volume, depth | per m³ (excavation/lining), O&M |
  | Pipe / penstock segment | length, D, wall e, material (E, roughness), vertical drop | per m by D and pressure class, install per m |
  | Bend, tee, manifold, inlet/outlet | minor-loss K | per item |
  | Reversible pump-turbine | rated Q, η pump/turbine, fixed/variable speed | per kW |
  | Pump (separate) / Turbine (separate) | rated Q, H, η | per kW |
  | Valve (isolation, surge-protection shut-off) | closure time, K | per item by D |
  | Surge tank / flywheel (Phase 3) | volume / inertia | per item |
  | Switchgear & transformer | rating, loss % | per kVA |
  | Control & monitoring | — | fixed + per I/O |
  | **Solar PV array** (Phase 3) | kWp, tilt/azimuth, tracking, performance ratio, degradation %/yr | per kWp + O&M per kWp/yr |
  | **Battery bank (BESS)** (Phase 3) | kWh, kW (C-rate), RTE, usable depth of discharge, cycle-life & calendar degradation, chemistry preset (LFP, NMC) | per kWh + per kW, augmentation/replacement |
  | **Inverter / PCS** (Phase 3) | kVA, efficiency | per kVA, replacement year |
  | **Grid connection** | import/export limit (kW), tariff (time-of-use bands, export price) | connection fee |
  | **Mine load** | load profile (hourly, typical days), critical vs deferrable load | — |

- **Two linked lanes on the canvas**: the hydraulic lane (side elevation of shaft and reservoirs) and an electrical bus lane where the PSH machines, solar, battery, inverter, grid and mine load connect. Any of the four configurations is just a different set of components on the bus.

- **Connections**: pipes join ports; the builder checks the layout is a valid flow loop (upper reservoir → pipes → machine(s) → pipes → lower reservoir, and a pumping path back). Invalid layouts get clear warnings and highlighted nodes, never a hard block.
- **Inspector panel**: selecting a component shows and edits its properties and its cost card (CAPEX, O&M, life, replacement year).
- **Live overlays**: flow arrows, pressure/velocity colour on pipes, water levels animating in pump/generate modes, running bill of quantities and total CAPEX.
- **Templates**: "Single shaft, reversible unit", "Separate pump + turbine", the note's 200 MW example, and (Phase 3) "Solar + battery", "Solar + PSH", "Hybrid solar + battery + PSH"; save/load layouts as JSON.

## Learn-as-you-build: on-canvas explainers

A newcomer should discover the technical terms by building, not by reading a glossary first. This runs through every phase: each phase ships the explainers for the terms it introduces.

- **Guided mode and expert mode.** Guided mode (default for first visit) unlocks the builder step by step; expert mode shows everything at once with explainers available on demand. The switch is always visible.
- **Discovery path in guided mode**, each step unlocking the next part of the palette:
  1. Place two reservoirs → animation of water falling down the shaft introduces *head* and *potential energy* (E = ρ·V·g·h), with the number updating as the user drags the lower reservoir deeper.
  2. Connect a pipe → water flows; animation of friction along the pipe wall introduces *flow rate Q*, *velocity*, *head loss* and *net head*.
  3. Add a turbine → spinning runner and power meter introduce *turbine efficiency* and *power output*.
  4. Switch to pump mode → water climbs, meter runs backwards: *pumping head*, *pump efficiency*, and then *round-trip efficiency* shown as a shrinking energy bar through each loss.
  5. (Phase 2) Add cost cards → coins flowing per year on a timeline introduce *CAPEX*, *O&M*, *discount rate/WACC*, *NPV*, *IRR*, *LCOS*, *arbitrage spread*.
  6. (Phase 3) Add solar and a battery → sun arc over a 24-hour clock introduces *kWp*, *state of charge*, *C-rate*, *depth of discharge*, *degradation*, *dispatch*.
  7. (Phase 4) Slam a valve shut → pressure wave racing up the pipe introduces *water hammer*, *wave speed*, *critical closure time*, *surge*.
  8. (Phase 5) Swap water for heavy fluid → denser fluid, smaller reservoir introduces *density*, *viscosity*, *shear-thinning*.
- **Term chips.** Every technical term in the UI is a dotted-underlined chip. Hover or tap opens a short card: plain-language meaning, a mining analogy, the equation with each symbol linked to the component it comes from on the canvas, and a "show me" button that plays the term's animation on the user's own system.
- **Explain-this on any component or number.** Right-click/long-press a component or KPI → highlights on the canvas everything that affects it (e.g. selecting *net head* lights up both reservoirs and every pipe segment and fitting).
- **"Why did that change?" nudges.** When an input change moves a result sharply (e.g. halving pipe diameter crushes efficiency), a brief callout on the canvas explains the cause, with a link to the term card.
- **Glossary page** built from the same term data, grouped by phase, with the progress of terms a user has discovered (local storage only).
- **Content model**: terms live in one typed data file (`src/learn/terms.ts`: id, plain definition, analogy, equation, symbols → component properties, animation id, phase). Animations are reusable canvas overlays driven by the same engine results, so they always show the user's own numbers. Writing aimed at a capable non-specialist; plain English, SI units, no unexplained abbreviations.

## Architecture (set once in Phase 1, extended later)

```
mine-optimization/
  pump-storage-systems/             (existing PDF stays here as the reference)
  site/                             Vite + React + TS app
    src/engine/                     pure TS, no React/DOM — the "model"
      units.ts constants.ts         SI units, ρ, g, K; kWh/J conversions
      hydraulics.ts                 head loss (Darcy–Weisbach + minor losses, Swamee–Jain f)
      power.ts energy.ts            §2, §3 equations
      cycle.ts                      charge/discharge cycle, round-trip efficiency, loss breakdown
      (later) costs.ts dispatch.ts dcf.ts sensitivity.ts solar.ts battery.ts transients.ts slurry.ts
                                    dispatch.ts = hourly energy balance over representative days/8760 h;
                                    every storage asset implements one Storage interface (charge, discharge,
                                    state of charge, losses, degradation) so PSH and battery plug in alike
      layout.ts                     builder graph → SystemSpec (head from elevations, flow path, summed losses, BoQ)
    src/model/                      component catalogue (types, defaults, cost cards), SystemSpec, templates, currency presets
    src/builder/                    React Flow canvas, palette, custom nodes, inspector, validation overlay
    src/learn/                      term data, guided-mode steps, canvas explainer animations, glossary
    src/components/                 gauges, KPI tiles, charts, panels
    src/pages/                      Home (tool gallery) → Pump Storage tool
    tests/                          Vitest: engine against hand calcs and the note's worked example
```
- Flow: builder graph → `layout.ts` → `SystemSpec` + bill of quantities → physics → (Phase 2) dispatch → costs → DCF.
- Rule: the engine is pure functions of a `SystemSpec`; UI only reads results. This keeps every graphic consistent and lets later phases (DCF, battery) reuse the physics outputs.
- Graphics: SVG for the animated schematic (shaft, reservoirs, penstock, pump-turbine, water levels), a charting library (e.g. Recharts or visx) for curves and cash flows. Design tokens, light/dark themes, SI units throughout with formatted display.
- Every result shows its equation and inputs on demand ("show working"), so an engineer can audit it.

## Core input model (`SystemSpec`)

| Group | Inputs (SI) |
|---|---|
| Site | shaft depth / gross head Z1−Z2 (m), upper & lower reservoir volume (m³), reservoir type (excavated, tank, existing dam, underground chamber) |
| Penstock | length L, inner diameter D, wall thickness e, material (E, roughness), minor-loss coefficients ΣK |
| Machines | config: reversible pump-turbine OR separate pump + turbine; rated flow Q; η_turbine+gen, η_pump+motor; fixed or variable speed |
| Fluid | water by default (ρ, μ); slurry in Phase 4 |
| Operation | cycles/day, hours charging/discharging, depth-of-discharge, seepage/evaporation %, transformer/grid loss % |
| Solar & battery (Phase 3) | PV kWp, hourly irradiance/yield profile, BESS kWh/kW, RTE, DoD, degradation, inverter kVA |
| Load & grid (Phase 2–3) | mine load profile, grid import/export limits, time-of-use tariff, export price, outage/backup requirement |
| Economics (Phase 2) | currency, tariffs (peak/off-peak or arbitrage spread), CAPEX per component, O&M, WACC, tax, inflation, life, escalation, degradation, ancillary revenue |

## Phased roadmap

### Phase 1 — System builder + power, energy, efficiency (§2–4)  ← first build
Learning layer: guided/expert modes, term chips, explain-this highlighting, glossary page, and discovery steps 1–4 with their animations.
Builder: canvas, palette, inspector, connection validation, templates, save/load, and every component carrying its cost card (CAPEX, O&M, life) with a running CAPEX total and bill of quantities. The full financial model uses these in Phase 2.
Physics (computed from the built layout):
- Head loss h_L = (f·L/D + ΣK)·v²/2g; v = Q/A; f from Swamee–Jain.
- Turbine: P_out = η_t·ρ·g·H_net·Q, H_net = (Z1−Z2) − h_L.
- Pump: P_in = ρ·g·H_pump·Q / η_p, H_pump = (Z1−Z2) + h_L.
- Stored energy E = ρ·V·g·h (J → kWh ÷ 3.6×10⁶); usable energy after depth-of-discharge.
- Charge/discharge times = V/Q; round-trip efficiency = E_out/E_in including hydraulic, machine, electrical and seepage losses.
Interactive components:
1. Builder canvas animates: reservoirs fill/drain with mode toggle (pump / generate), flow arrows scale with Q, pipes coloured by velocity/head loss.
2. Inspector with sliders + numeric fields, unit-aware validation (warns, never blocks); global operation settings (cycles/day, losses).
3. KPI tiles: rated power (MW), energy capacity (MWh), duration (h), round-trip efficiency (%).
4. Loss waterfall (Sankey or bar): grid in → pump losses → friction → storage → friction → turbine → grid out.
5. Curves: power and efficiency vs flow Q (shows the optimal flow / pipe size trade-off); energy vs head and volume.
Done when: engine tests match hand calcs within 0.1%; a layout built on the canvas gives the same results as the equivalent hand-entered spec; round-trip efficiency for typical inputs lands in the note's 70–85% band; CAPEX total equals the sum of component cost cards; site runs with Home + Pump Storage pages.

### Phase 2 — Cost library + DCF model (§8, §9, §11)
- Cost library behind the builder's cost cards for components a–g (reservoirs, piping & manifolds, pump/turbine as one reversible unit or separate units + valves, surge valves, switchgear & transformers, control & monitoring): parametric CAPEX (per m³, per m by D and pressure class, per kW, per item), O&M %/yr, life, replacement year; ZAR/USD presets; per-project overrides. Swapping a component on the canvas updates the DCF live.
- Dispatch engine (built here for PSH alone, so Phase 3 only adds assets): hourly energy balance over representative days per season against a time-of-use tariff and mine load; rule-based strategy (charge in off-peak, discharge in peak) with state-of-charge limits. Output: annual energy in/out, grid purchases avoided, hours of operation.
- DCF engine: annual ledger over project life built from the dispatch results — energy discharged (× availability × degradation), pumping cost, arbitrage revenue / avoided grid cost, optional ancillary revenue, O&M, EBITDA, depreciation, tax, CAPEX/replacements, FCFF; NPV at WACC, IRR, payback, LCOS (levelised cost of storage).
- Sensitivity: two-way table WACC (e.g. 5.5–9.5%) × arbitrage spread (e.g. 40–100 /MWh) → IRR, coloured green/red vs WACC; tornado chart on key drivers (head, volume, η, CAPEX, tariff).
- Graphics: cumulative cash flow chart (as in the note's sample DCF plot), CAPEX breakdown donut, sensitivity heatmap.
- Export results to CSV/XLSX for checking against a spreadsheet.
Done when: DCF reproduces an independent spreadsheet calculation (NPV/IRR to the cent / 0.01%) for both presets.

### Phase 3 — Solar, battery and hybrid systems
- **Solar PV model**: hourly yield from kWp × irradiance profile × performance ratio, temperature derate, annual degradation. Built-in typical-year profiles for a few South African mining regions (and the option to import an hourly CSV).
- **Battery model**: same Storage interface as PSH — power and energy limits, RTE, usable DoD, cycle + calendar degradation, augmentation/replacement schedule driving future CAPEX.
- **Dispatch strategies** for the four configurations:
  1. PSH alone — grid arbitrage (Phase 2).
  2. Solar + battery — solar serves load, surplus charges battery, battery covers evening peak; grid tops up.
  3. Solar + PSH — surplus solar pumps water up; turbine generates through peak/night.
  4. Hybrid — battery absorbs fast solar fluctuations and short peaks (and protects PSH from frequent starts); PSH takes the bulk overnight shift. Tunable split rule (battery-first vs PSH-first, power/energy thresholds), plus a sweep that searches battery kWh vs PSH volume for the best NPV or lowest LCOS.
- **The intersection**: a sizing map (battery size × PSH size → NPV/LCOS heatmap) showing where each technology alone is best and where the combination wins; a stacked hourly dispatch chart (solar, battery, PSH, grid, load) for a typical day per season; state-of-charge traces for both stores.
- **Comparison view**: the four configurations side by side — CAPEX, NPV, IRR, LCOS, self-sufficiency %, grid energy avoided, CO₂ avoided, footprint, design life, replacements over life — with a printable/shareable decision summary.
- Scenario save/compare (local storage first) and shareable URL state.
Done when: each configuration's annual energy balance closes (generation + imports = load + exports + losses + Δstorage) within 0.1%; battery-alone and PSH-alone results match single-asset hand calcs; the hybrid sweep returns a reproducible optimum.

### Phase 4 — Water hammer & pressure rating (§5–6)
- Wave speed a = √(K/ρ) / √(1 + (K/E)(D/e)c1); Tc = 2L/a; ΔH = a·Δv/g (rapid) and reduced surge for slow closure (T > Tc, e.g. Michaud ΔH ≈ 2Lv/(gT)).
- Pressure envelope along the penstock, required wall thickness/pressure class with factor of safety → feeds pipe CAPEX in Phase 2.
- Graphics: animated pressure wave travelling up the shaft; closure-time slider showing rapid vs slow regime; surge-tank / flywheel mitigation toggle.
- Test: note's worked example — L=600 m, a=1200 m/s, v=3 m/s, H0=150 m → Tc=1.0 s, ΔH≈367 m, H_total≈517 m (≈51.7 bar). (The note's step 2 repeats the Tc formula; the ΔH value is a·Δv/g.)

### Phase 5 — Heavy fluids / slurry (§7)
- Fluid selector: water vs high-density fluid (ρ up to ~2.5× water), shear-thinning viscosity model (power-law), effect on energy per m³, required volume/head, friction losses and RTE.
- Extra costs: fluid cost, wear-resistant materials, larger pipe diameter (+25–30%); feeds Phase 2 DCF.
- Graphics: side-by-side water vs slurry comparison of reservoir size, head and NPV.

## Open items to confirm during Phases 2–3
- Default ZAR tariff structure (e.g. Eskom Megaflex time-of-use bands) and cost-per-component values; the note's sample spreadsheets aren't in the folder — share them if you want the DCF matched to them.
- Battery and solar cost presets (per kWh, per kW, per kWp) and chemistry defaults.
- Solar resource data: built-in typical-year profiles vs pulling from an outside service such as PVGIS (would need your OK, as it is an outside call).
- A representative mine load profile (hourly), or a default one to start with.
- Hosting target (Vercel/Netlify/static) and site branding/name.

## Verification
- `pnpm test` (Vitest) on engine modules: hand-calculated cases, the note's water hammer example, energy-conservation checks (E_out ≤ E_in, hourly energy balance closes for all four configurations), and finance checks against a spreadsheet.
- `pnpm build` and run the dev server; check in the browser pane at desktop and phone widths, light and dark, that sliders update schematic, KPIs and charts live and that results match the engine tests.
- Learning layer: a test checks every term used in the UI has a term card; walk the guided path end to end in the browser as a first-time user and confirm each step's animation shows the user's own numbers.
- Each phase ends with a short README note in `site/` listing equations, assumptions and limits.
