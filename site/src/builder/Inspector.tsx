import { MATERIALS, type CostLine, type NodeData, type PipeData, type PipeMaterial } from '../engine';
import { NumberField, SelectField } from '../components/Field';
import { Trash } from '../components/Icons';
import { Term } from '../learn/Term';
import { money, num } from '../lib/format';
import { CATALOGUE } from '../model/catalogue';
import { useAnalysis, useMoney } from '../state/context';
import { useStore, type ChangeKind } from '../state/store';
import { METRIC_LABEL } from '../model/metrics';
import { velocityBand } from './geometry';

function CostCard({ line }: { line: CostLine | undefined }) {
  const m = useMoney();
  if (!line) return null;
  return (
    <section className="cost-card" aria-label="Cost card">
      <header>
        <h4>
          <Term id="capex">Cost card</Term>
        </h4>
        <span className="cost-card__total">{money(line.capex, m)}</span>
      </header>
      <dl>
        <div>
          <dt>Basis</dt>
          <dd>
            {num(line.quantity, line.quantity < 10 ? 1 : 0)} {line.unit}
            {line.rate > 0 && ` × ${money(line.rate, m, 0)}/${line.unit}`}
            {line.fixed > 0 && ` + ${money(line.fixed, m)}`}
          </dd>
        </div>
        <div>
          <dt>
            <Term id="omCost">O&amp;M</Term>
          </dt>
          <dd>{money(line.omPerYear, m)} per year</dd>
        </div>
        <div>
          <dt>Design life</dt>
          <dd>{line.lifeYears} years</dd>
        </div>
      </dl>
      <p className="cost-card__note">
        Indicative rate for comparison. Phase 2 adds an editable cost library.
      </p>
    </section>
  );
}

function NodeForm({ id, data }: { id: string; data: NodeData }) {
  const update = useStore((s) => s.updateNode);
  const setElevation = useStore((s) => s.setElevation);
  const elevation = useStore((s) => Math.round(-(s.nodes.find((n) => n.id === id)?.position.y ?? 0)));
  const set = (patch: Partial<NodeData>, change: ChangeKind) => update(id, patch, change);
  const hydraulic = !['transformer', 'controls'].includes(data.kind);

  return (
    <>
      {hydraulic && (
        <NumberField
          label={data.kind.endsWith('Reservoir') ? 'Water level (elevation)' : 'Elevation'}
          value={elevation}
          unit="m"
          min={-1500}
          max={100}
          step={5}
          digits={0}
          onChange={(v) => setElevation(id, Math.round(v))}
          hint={
            data.kind === 'lowerReservoir' ? (
              <>
                Below the collar is negative. The difference in levels is the <Term id="grossHead">head</Term>
                .
              </>
            ) : undefined
          }
        />
      )}
      {data.kind === 'upperReservoir' && (
        <>
          <NumberField
            label="Volume"
            value={data.volume}
            unit="m³"
            min={1_000}
            max={5_000_000}
            step={1000}
            log
            digits={0}
            onChange={(v) => set({ volume: Math.round(v) }, 'volume')}
          />
          <SelectField
            label="Type"
            value={data.style}
            options={[
              { value: 'linedDam', label: 'Lined dam' },
              { value: 'tank', label: 'Tank' },
              { value: 'existingDam', label: 'Existing dam' },
            ]}
            onChange={(style) => set({ style }, 'structure')}
          />
          <NumberField
            label={<Term id="seepage">Seepage &amp; evaporation</Term>}
            value={data.seepagePct}
            unit="% / cycle"
            min={0}
            max={10}
            step={0.1}
            digits={1}
            onChange={(v) => set({ seepagePct: v }, 'efficiency')}
          />
        </>
      )}
      {data.kind === 'lowerReservoir' && (
        <>
          <NumberField
            label="Volume"
            value={data.volume}
            unit="m³"
            min={1_000}
            max={5_000_000}
            step={1000}
            log
            digits={0}
            onChange={(v) => set({ volume: Math.round(v) }, 'volume')}
          />
          <SelectField
            label="Type"
            value={data.style}
            options={[
              { value: 'excavated', label: 'Excavated' },
              { value: 'oldWorkings', label: 'Old workings' },
              { value: 'tank', label: 'Tank' },
            ]}
            onChange={(style) => set({ style }, 'structure')}
          />
        </>
      )}
      {(data.kind === 'reversibleUnit' || data.kind === 'turbine' || data.kind === 'pump') && (
        <NumberField
          label={<Term id="flowRate">Rated flow</Term>}
          value={data.flow}
          unit="m³/s"
          min={0.1}
          max={80}
          step={0.1}
          log
          digits={2}
          onChange={(v) => set({ flow: v }, 'flow')}
        />
      )}
      {data.kind === 'reversibleUnit' && (
        <>
          <NumberField
            label={<Term id="turbine">Turbine efficiency</Term>}
            value={data.etaTurbine}
            scale={100}
            unit="%"
            min={60}
            max={96}
            step={0.5}
            digits={1}
            onChange={(v) => set({ etaTurbine: v }, 'efficiency')}
          />
          <NumberField
            label={<Term id="pump">Pump efficiency</Term>}
            value={data.etaPump}
            scale={100}
            unit="%"
            min={60}
            max={96}
            step={0.5}
            digits={1}
            onChange={(v) => set({ etaPump: v }, 'efficiency')}
          />
        </>
      )}
      {(data.kind === 'turbine' || data.kind === 'pump') && (
        <NumberField
          label={<Term id={data.kind}>Efficiency</Term>}
          value={data.eta}
          scale={100}
          unit="%"
          min={60}
          max={96}
          step={0.5}
          digits={1}
          onChange={(v) => set({ eta: v }, 'efficiency')}
        />
      )}
      {(data.kind === 'bend' || data.kind === 'valve') && (
        <NumberField
          label={<Term id="minorLoss">Loss coefficient K</Term>}
          value={data.k}
          unit=""
          min={0.05}
          max={5}
          step={0.05}
          digits={2}
          onChange={(v) => set({ k: v }, 'fitting')}
        />
      )}
      {data.kind === 'valve' && (
        <SelectField
          label="Valve type"
          value={data.valveType}
          options={[
            { value: 'butterfly', label: 'Butterfly' },
            { value: 'spherical', label: 'Spherical' },
          ]}
          onChange={(valveType) => set({ valveType, k: valveType === 'spherical' ? 0.05 : 0.2 }, 'fitting')}
        />
      )}
      {data.kind === 'transformer' && (
        <NumberField
          label="Loss each way"
          value={data.lossPct}
          unit="%"
          min={0.1}
          max={5}
          step={0.1}
          digits={1}
          onChange={(v) => set({ lossPct: v }, 'efficiency')}
        />
      )}
    </>
  );
}

function PipeForm({ id, data }: { id: string; data: PipeData }) {
  const update = useStore((s) => s.updateEdge);
  const { analysis } = useAnalysis();
  const flow = analysis.edgeFlows[id];
  const seg = analysis.cycle?.generate.hydraulics.segments.find((s) => s.id === id);
  const v = flow?.generateVelocity ?? flow?.pumpVelocity;
  return (
    <>
      <NumberField
        label="Inside diameter"
        value={data.diameter}
        scale={1000}
        unit="mm"
        min={200}
        max={6000}
        step={50}
        digits={0}
        onChange={(d) => update(id, { diameter: Math.round(d * 1000) / 1000 }, 'diameter')}
      />
      <SelectField<PipeMaterial>
        label="Material"
        value={data.material}
        options={(Object.keys(MATERIALS) as PipeMaterial[]).map((k) => ({
          value: k,
          label: MATERIALS[k].label.split(' (')[0]!,
        }))}
        onChange={(material) => update(id, { material }, 'material')}
      />
      <NumberField
        label="Horizontal run"
        value={data.horizontalRun}
        unit="m"
        min={0}
        max={3000}
        step={5}
        digits={0}
        onChange={(h) => update(id, { horizontalRun: Math.round(h) }, 'length')}
        hint="Vertical length comes from the elevations of the two ends."
      />
      <dl className="readout">
        <div>
          <dt>Total length</dt>
          <dd>{num(flow?.length)} m</dd>
        </div>
        <div>
          <dt>
            <Term id="velocity">Velocity</Term>
          </dt>
          <dd className={v !== undefined ? `band-${velocityBand(v)}` : undefined}>
            {v !== undefined ? `${num(v, 2)} m/s` : 'not on a route'}
          </dd>
        </div>
        {seg && (
          <>
            <div>
              <dt>
                <Term id="frictionFactor">Friction factor</Term>
              </dt>
              <dd>{num(seg.frictionFactor, 4)}</dd>
            </div>
            <div>
              <dt>
                <Term id="headLoss">Head loss</Term> (generating)
              </dt>
              <dd>{num(seg.totalLoss, 2)} m</dd>
            </div>
          </>
        )}
      </dl>
    </>
  );
}

export function SystemSettings() {
  const usableFraction = useStore((s) => s.usableFraction);
  const setUsableFraction = useStore((s) => s.setUsableFraction);
  const zarPerUsd = useStore((s) => s.zarPerUsd);
  const setZarPerUsd = useStore((s) => s.setZarPerUsd);
  return (
    <div className="inspector__section">
      <h3>System settings</h3>
      <NumberField
        label={<Term id="usableVolume">Share of reservoir cycled</Term>}
        value={usableFraction}
        scale={100}
        unit="%"
        min={50}
        max={100}
        step={1}
        digits={0}
        onChange={setUsableFraction}
      />
      <NumberField
        label="Exchange rate"
        value={zarPerUsd}
        unit="R per $"
        min={10}
        max={30}
        step={0.1}
        digits={2}
        onChange={setZarPerUsd}
      />
    </div>
  );
}

export function Inspector() {
  const selectedId = useStore((s) => s.selectedId);
  const node = useStore((s) => s.nodes.find((n) => n.id === selectedId));
  const edge = useStore((s) => s.edges.find((e) => e.id === selectedId));
  const remove = useStore((s) => s.remove);
  const setHighlight = useStore((s) => s.setHighlight);
  const { analysis } = useAnalysis();
  const line = analysis.costs.lines.find((l) => l.id === selectedId);

  if (!node && !edge) {
    return (
      <div className="inspector inspector--empty">
        <div className="empty-hint">
          <p className="empty-hint__title">Select a component or pipe</p>
          <p>Its settings, live readings and cost card appear here.</p>
        </div>
        <SystemSettings />
      </div>
    );
  }

  const title = node ? CATALOGUE[(node.data as NodeData).kind].name : 'Pipe';
  const termId = node ? CATALOGUE[(node.data as NodeData).kind].termId : 'penstock';
  const issues = analysis.issues.filter((i) =>
    node ? i.nodeIds.includes(node.id) : edge && i.edgeIds.includes(edge.id),
  );
  const affects = (Object.entries(analysis.dependsOn) as [string, { nodeIds: string[]; edgeIds: string[] }][])
    .filter(([k, d]) => k !== 'capex' && (node ? d.nodeIds.includes(node.id) : d.edgeIds.includes(edge!.id)))
    .map(([k]) => k);

  return (
    <div className="inspector">
      <header className="inspector__head">
        <div>
          <span className="inspector__kicker">
            {node ? CATALOGUE[(node.data as NodeData).kind].group : 'Pipework'}
          </span>
          <h2>
            <Term id={termId}>{title}</Term>
          </h2>
        </div>
        <button
          className="icon-btn icon-btn--danger"
          aria-label={`Delete ${title}`}
          title="Delete (Backspace)"
          onClick={() => remove(selectedId!)}
        >
          <Trash />
        </button>
      </header>
      <div className="inspector__section">
        {node && <NodeForm id={node.id} data={node.data as NodeData} />}
        {edge && edge.data && <PipeForm id={edge.id} data={edge.data as PipeData} />}
      </div>
      {issues.length > 0 && (
        <ul className="issues issues--compact">
          {issues.map((i) => (
            <li key={i.id} className={`issue issue--${i.severity}`}>
              {i.message}
            </li>
          ))}
        </ul>
      )}
      {affects.length > 0 && (
        <div className="inspector__section">
          <h3>Changing this moves</h3>
          <div className="chips">
            {affects.map((k) => (
              <button
                key={k}
                className="chip"
                onClick={() =>
                  setHighlight({
                    label: METRIC_LABEL[k] ?? k,
                    ...analysis.dependsOn[k as keyof typeof analysis.dependsOn],
                  })
                }
              >
                {METRIC_LABEL[k] ?? k}
              </button>
            ))}
          </div>
        </div>
      )}
      <CostCard line={line} />
    </div>
  );
}
