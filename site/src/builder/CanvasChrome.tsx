/** Everything that floats over the canvas: playback, toolbar, highlight banner and nudges. */
import { useReactFlow } from '@xyflow/react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Down, Download, Fit, Layers, Pause, Play, Reset, Trash, Up, Upload, X } from '../components/Icons';
import { Term } from '../learn/Term';
import { energy, hours, power } from '../lib/format';
import { TEMPLATES } from '../model/templates';
import { useAnalysis } from '../state/context';
import { toPlaced, useStore } from '../state/store';

/** Seconds of real time for a full drain or fill of the upper reservoir. */
const CYCLE_SECONDS = 14;

export function PlaybackHud() {
  const mode = useStore((s) => s.mode);
  const playing = useStore((s) => s.playing);
  const level = useStore((s) => s.level);
  const setMode = useStore((s) => s.setMode);
  const setPlaying = useStore((s) => s.setPlaying);
  const setLevel = useStore((s) => s.setLevel);
  const { analysis } = useAnalysis();
  const c = analysis.cycle;
  const canPump = !!analysis.routes.pump;
  const canPlay = mode === 'generate' ? !!c : !!c && canPump;

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const s = useStore.getState();
      const next = s.level + (s.mode === 'generate' ? -1 : 1) * (dt / CYCLE_SECONDS);
      if (next <= 0 || next >= 1) {
        setLevel(next);
        s.setPlaying(false);
        return;
      }
      setLevel(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, setLevel]);

  useEffect(() => {
    if (playing && !canPlay) setPlaying(false);
  }, [playing, canPlay, setPlaying]);

  const totalHours = c ? (mode === 'generate' ? c.generate.hours : c.pump.hours) : 0;
  const progress = mode === 'generate' ? 1 - level : level;
  const p = power(c ? (mode === 'generate' ? c.generate.gridPower : c.pump.gridPower) : undefined);
  const e = energy(c ? (mode === 'generate' ? c.gridEnergyOut : c.gridEnergyIn) * progress : undefined);

  return (
    <div className="hud" role="group" aria-label="Run the system">
      <div className="segmented" role="radiogroup" aria-label="Mode">
        <button
          role="radio"
          aria-checked={mode === 'generate'}
          className={mode === 'generate' ? 'is-on is-gen' : ''}
          onClick={() => setMode('generate')}
        >
          <Down size={14} /> Generate
        </button>
        <button
          role="radio"
          aria-checked={mode === 'pump'}
          className={mode === 'pump' ? 'is-on is-pump' : ''}
          onClick={() => setMode('pump')}
          title={canPump ? undefined : 'Needs a pumping route'}
        >
          <Up size={14} /> Pump
        </button>
      </div>
      <button
        className={`play-btn${playing ? ' is-playing' : ''} ${mode}`}
        onClick={() => setPlaying(!playing)}
        disabled={!canPlay}
        aria-label={playing ? 'Pause' : 'Play'}
        data-testid="play"
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="hud__readout">
        <div className="hud__progress" aria-hidden="true">
          <span style={{ width: `${progress * 100}%` }} className={mode} />
        </div>
        <div className="hud__stats">
          <span>
            <b className="mono">{hours(progress * totalHours)}</b> of {hours(totalHours)}
          </span>
          <span>
            <b className="mono">{p.value}</b> {p.unit}
          </span>
          <span>
            <b className="mono">{e.value}</b> {e.unit} {mode === 'generate' ? 'delivered' : 'drawn'}
          </span>
        </div>
      </div>
      <button
        className="icon-btn"
        aria-label="Reset reservoir levels"
        title="Reset levels"
        onClick={() => setLevel(mode === 'generate' ? 1 : 0)}
      >
        <Reset size={15} />
      </button>
    </div>
  );
}

export function CanvasToolbar() {
  const templateId = useStore((s) => s.templateId);
  const loadTemplate = useStore((s) => s.loadTemplate);
  const loadLayout = useStore((s) => s.loadLayout);
  const clear = useStore((s) => s.clear);
  const layers = useStore((s) => s.layers);
  const toggleLayer = useStore((s) => s.toggleLayer);
  const guided = useStore((s) => s.guideMode === 'guided');
  const { fitView } = useReactFlow();
  const [layersOpen, setLayersOpen] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const refit = () => setTimeout(() => fitView({ padding: 0.18, duration: 500 }), 30);

  const exportJson = () => {
    const { nodes, edges } = useStore.getState();
    const blob = new Blob(
      [JSON.stringify({ format: 'shaftline.pumpStorage', version: 1, ...toPlaced(nodes, edges) }, null, 2)],
      {
        type: 'application/json',
      },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pumped-storage-layout.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text());
      if (
        parsed?.format !== 'shaftline.pumpStorage' ||
        !Array.isArray(parsed.nodes) ||
        !Array.isArray(parsed.edges)
      )
        throw new Error('format');
      loadLayout(parsed.nodes, parsed.edges);
      refit();
    } catch {
      useStore.getState().setNudge({
        kicker: 'Could not open file',
        text: 'That file is not a pumped storage layout saved from this tool.',
      });
    }
  };

  return (
    <div className="toolbar" role="toolbar" aria-label="Canvas tools">
      {!guided && (
        <label className="select">
          <span className="sr-only">Template</span>
          <select
            value={templateId ?? ''}
            onChange={(e) => {
              loadTemplate(e.target.value);
              refit();
            }}
          >
            {templateId === null && <option value="">Your layout</option>}
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        className="icon-btn"
        title="Fit to view"
        aria-label="Fit to view"
        onClick={() => fitView({ padding: 0.18, duration: 500 })}
      >
        <Fit />
      </button>
      <div className="popover-anchor">
        <button
          className={`icon-btn${layersOpen ? ' is-on' : ''}`}
          title="Layers"
          aria-label="Layers"
          aria-expanded={layersOpen}
          onClick={() => setLayersOpen((o) => !o)}
        >
          <Layers />
        </button>
        {layersOpen && (
          <div className="menu" role="menu">
            <label className="menu__check">
              <input type="checkbox" checked={layers.flowLabels} onChange={() => toggleLayer('flowLabels')} />{' '}
              Pipe labels
            </label>
            <label className="menu__check">
              <input
                type="checkbox"
                checked={layers.frictionHeat}
                onChange={() => toggleLayer('frictionHeat')}
              />{' '}
              Velocity heat map
            </label>
            {layers.frictionHeat && (
              <div className="legend legend--heat">
                <span className="band-slow">&lt; 0.7 m/s</span>
                <span className="band-good">0.7–4</span>
                <span className="band-fast">4–6</span>
                <span className="band-too-fast">&gt; 6</span>
              </div>
            )}
          </div>
        )}
      </div>
      <span className="toolbar__sep" />
      <button className="icon-btn" title="Save layout as JSON" aria-label="Save layout" onClick={exportJson}>
        <Download />
      </button>
      <button
        className="icon-btn"
        title="Open a saved layout"
        aria-label="Open layout"
        onClick={() => file.current?.click()}
      >
        <Upload />
      </button>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={importJson} />
      <button
        className="icon-btn icon-btn--danger"
        title="Clear the canvas"
        aria-label="Clear the canvas"
        onClick={clear}
      >
        <Trash />
      </button>
    </div>
  );
}

export function HighlightBanner() {
  const highlight = useStore((s) => s.highlight);
  const setHighlight = useStore((s) => s.setHighlight);
  const explainer = useStore((s) => s.explainer);
  if (!highlight || explainer) return null;
  return (
    <div className="hl-banner" role="status">
      <span className="hl-banner__dot" />
      Showing what affects <b>{highlight.label}</b>
      <button
        className="icon-btn icon-btn--sm"
        aria-label="Clear highlight"
        onClick={() => setHighlight(null)}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function NudgeToast() {
  const nudge = useStore((s) => s.nudge);
  const setNudge = useStore((s) => s.setNudge);
  const undoLastClear = useStore((s) => s.undoLastClear);
  useEffect(() => {
    if (!nudge) return;
    const t = setTimeout(() => setNudge(null), 9000);
    return () => clearTimeout(t);
  }, [nudge, setNudge]);
  if (!nudge) return null;
  return (
    <div className="nudge" role="status" key={nudge.id}>
      <span className="nudge__kicker">{nudge.kicker}</span>
      <p>{nudge.text}</p>
      <div className="nudge__foot">
        {nudge.termId && <Term id={nudge.termId}>Learn more</Term>}
        {nudge.undo && (
          <button className="btn btn--ghost btn--sm" onClick={undoLastClear}>
            Undo
          </button>
        )}
        <button className="icon-btn icon-btn--sm" aria-label="Dismiss" onClick={() => setNudge(null)}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
