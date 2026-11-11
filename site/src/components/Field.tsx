import { useEffect, useId, useState, type ReactNode } from 'react';

interface NumberFieldProps {
  label: ReactNode;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  /** Display multiplier, e.g. 100 to show a 0–1 fraction as a percentage. */
  scale?: number;
  digits?: number;
  /** Log-scale slider for values spanning orders of magnitude. */
  log?: boolean;
  hint?: ReactNode;
  onChange: (v: number) => void;
}

/** Slider plus exact number entry. Out-of-range typed values are allowed; the checks will warn. */
export function NumberField({
  label,
  value,
  unit,
  min,
  max,
  step,
  scale = 1,
  digits = 2,
  log,
  hint,
  onChange,
}: NumberFieldProps) {
  const id = useId();
  const shown = value * scale;
  const [text, setText] = useState(formatInput(shown, digits));
  useEffect(() => setText(formatInput(shown, digits)), [shown, digits]);

  const toSlider = (v: number) => (log ? Math.log10(Math.max(v, min)) : v);
  const fromSlider = (s: number) => (log ? Math.pow(10, s) : s);

  const commit = (raw: string) => {
    const v = Number(raw.replace(/\s/g, ''));
    if (Number.isFinite(v) && v > 0) onChange(v / scale);
    else setText(formatInput(shown, digits));
  };

  return (
    <div className="field">
      <div className="field__top">
        <label htmlFor={id}>{label}</label>
        <span className="field__input">
          <input
            id={id}
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit((e.target as HTMLInputElement).value)}
          />
          <span className="field__unit">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        aria-label={typeof label === 'string' ? label : undefined}
        min={toSlider(min)}
        max={toSlider(max)}
        step={log ? (toSlider(max) - toSlider(min)) / 200 : step}
        value={toSlider(Math.min(Math.max(shown, min), max))}
        onChange={(e) => {
          const raw = fromSlider(Number(e.target.value));
          const snapped = log ? roundNice(raw) : Math.round(raw / step) * step;
          onChange(snapped / scale);
        }}
        style={{
          ['--pct' as string]: `${((toSlider(Math.min(Math.max(shown, min), max)) - toSlider(min)) / (toSlider(max) - toSlider(min))) * 100}%`,
        }}
      />
      {hint && <div className="field__hint">{hint}</div>}
    </div>
  );
}

function formatInput(v: number, digits: number) {
  return Number.isFinite(v) ? String(Number(v.toFixed(digits))) : '';
}

/** Round to 2 significant figures so log sliders land on tidy numbers. */
function roundNice(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)) - 1);
  return Math.round(v / p) * p;
}

interface SelectFieldProps<T extends string> {
  label: ReactNode;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function SelectField<T extends string>({ label, value, options, onChange }: SelectFieldProps<T>) {
  const id = useId();
  return (
    <div className="field">
      <div className="field__top">
        <label htmlFor={id}>{label}</label>
      </div>
      <div className="segmented segmented--block" role="radiogroup" id={id}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            className={o.value === value ? 'is-on' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
