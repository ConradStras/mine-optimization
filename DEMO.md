# Demo script: pumped storage builder (about 8 minutes)

Start the site with `cd site && pnpm dev`, then open the address it prints in a full-width browser window. Before the demo, clear the site's local storage (DevTools → Application → Local storage) so it opens fresh with the 26 MW example.

## 1. The pitch (home page, 30 s)

- "Turn a disused shaft into a water battery." The animated cross-section shows the idea: water falls through a turbine at shaft bottom, and is pumped back when power is cheap.
- Point at the roadmap cards: Phase 1 is live; cash flow, solar and battery hybrids, water hammer and heavy fluids follow.

## 2. A newcomer learns by building (guided mode, 3 min)

1. Click **Start the guided build**. The mine is empty, and the palette shows only reservoirs.
2. Click **Upper reservoir**, then **Lower reservoir**. The head explainer plays: a dimension line, falling droplets and "1.12 kWh per m³" for this drop. Drag the lower reservoir deeper and the stored energy grows.
3. **Next step.** Add a **Reversible pump-turbine**, then drag from a dot on the upper reservoir to a dot on the machine, and from the machine to the lower reservoir. The friction explainer lights the pipes and shows the head lost.
4. **Next step.** Press **Play**. The reservoir drains, the runner spins, a cable lights up, and the turbine equation fills in with real numbers.
5. **Next step.** Switch to **Pump** and press **Play**. Explain why pumping costs more than generating gives back.
6. **Next step.** Add a **transformer** and **controls**. The round-trip explainer follows 100 kWh through every loss.
7. Click any dotted-underlined word to show a term card: the plain meaning, a mining analogy, the equation and **Your system**.

## 3. An engineer weighs it up (expert mode, 3 min)

1. Switch to **Expert**. The guided build stays. Pick **Single shaft, reversible unit** from the template menu.
2. **Results**: 26.5 MW, 131 MWh, about 5 hours, 76% round-trip efficiency, and capital cost in rand.
3. Click **Pin as baseline**.
4. Click the long shaft pipe and type **900 mm**. Show the results:
   - the velocity warning and the "Why did that change?" nudge;
   - the deltas on the KPI tiles: efficiency down (red), capital cost down (green);
   - **Layers → Velocity heat map**, which turns the pipe red.
5. **Design trade-offs**: switch between **Vary flow** and **Vary pipe size**, and hover the curves. The dot marks the current design.
6. Hover a KPI and click **Trace**. Only the parts that drive that number stay lit.
7. **Costs** tab: the bill of quantities. Click a row to select that component and see its cost card.
8. Switch the template to **200 MW / 1 600 MWh reference**, the scale of the note's spreadsheet example.

## 4. Close (30 s)

- Every number comes from one tested engine (49 automated tests), so the canvas, KPIs and explainers always agree.
- Next is Phase 2: an editable cost library and the discounted cash flow model, with NPV, IRR, levelised cost of storage and sensitivity, built from the same layout.
