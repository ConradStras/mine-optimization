import { ReactFlowProvider } from '@xyflow/react';
import { useState } from 'react';
import { Canvas } from '../builder/Canvas';
import { Inspector } from '../builder/Inspector';
import { Palette } from '../builder/Palette';
import {
  BillOfQuantities,
  CapexBar,
  Issues,
  Kpis,
  LossWaterfall,
  Section,
  TradeOffs,
} from '../components/Results';
import { GuidePanel } from '../learn/GuidePanel';
import { Term } from '../learn/Term';
import { useAnalysis } from '../state/context';
import { useStore, type PanelTab } from '../state/store';

function Assumptions() {
  const [open, setOpen] = useState(false);
  return (
    <section className="rsection rsection--quiet">
      <button className="link" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide' : 'Show'} model assumptions
      </button>
      {open && (
        <ul className="assumptions">
          <li>
            Head is constant: the difference between the two water levels. Level changes within each reservoir
            are ignored.
          </li>
          <li>Machines run at their rated flow with constant efficiency (no part-load curve).</li>
          <li>
            Friction: Darcy–Weisbach with the Swamee–Jain friction factor; intake K = 0.5, outlet K = 1.0.
          </li>
          <li>Pipe length = vertical drop between its ends + the horizontal run you set.</li>
          <li>Seepage and evaporation are a share of the stored volume per cycle.</li>
          <li>Costs are indicative placeholders for comparison; Phase 2 brings the cost library and DCF.</li>
          <li>Water hammer (Phase 4) and heavy fluids (Phase 5) are not yet modelled.</li>
        </ul>
      )}
    </section>
  );
}

function RightPanel() {
  const tab = useStore((s) => s.panelTab);
  const setTab = useStore((s) => s.setPanelTab);
  const { analysis } = useAnalysis();
  const problems = analysis.issues.filter((i) => i.severity !== 'info').length;
  const tabs: { id: PanelTab; label: string }[] = [
    { id: 'results', label: 'Results' },
    { id: 'inspect', label: 'Inspect' },
    { id: 'costs', label: 'Costs' },
  ];
  return (
    <aside className="tool__right" aria-label="Results and settings">
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'is-on' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'results' && problems > 0 && <span className="tabs__count">{problems}</span>}
          </button>
        ))}
      </div>
      <div className="tool__right-body">
        {tab === 'results' && (
          <>
            <Kpis />
            <Section title="Checks">
              <Issues />
            </Section>
            <Section
              title={<>Where the energy goes</>}
              aside={<Term id="roundTripEfficiency">Round trip</Term>}
            >
              <LossWaterfall />
            </Section>
            <Section title="Design trade-offs" aside={<Term id="headLoss">Why?</Term>}>
              <TradeOffs />
            </Section>
            <Section title="Capital cost" aside={<Term id="capex">CAPEX</Term>}>
              <CapexBar />
            </Section>
            <Assumptions />
          </>
        )}
        {tab === 'inspect' && <Inspector />}
        {tab === 'costs' && (
          <>
            <Section title="Capital cost by category">
              <CapexBar />
            </Section>
            <Section title="Bill of quantities">
              <BillOfQuantities />
            </Section>
          </>
        )}
      </div>
    </aside>
  );
}

export function Tool() {
  const guided = useStore((s) => s.guideMode === 'guided');
  return (
    <div className="tool">
      <aside className="tool__left" aria-label="Build">
        {guided && <GuidePanel />}
        <Palette />
      </aside>
      <main className="tool__canvas">
        <ReactFlowProvider>
          <Canvas />
        </ReactFlowProvider>
      </main>
      <RightPanel />
    </div>
  );
}
