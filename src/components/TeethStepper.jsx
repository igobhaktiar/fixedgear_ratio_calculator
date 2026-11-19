import { useEffect, useId, useRef } from 'react';
import { chainClick } from '../lib/feedback.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Big-thumb +/- control for tooth counts. Hold a button to auto-repeat. */
export default function TeethStepper({ label, value, min, max, onChange }) {
  const id = useId();
  const repeat = useRef(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => () => clearTimeout(repeat.current), []);

  const nudge = (delta) => {
    const next = clamp(valueRef.current + delta, min, max);
    if (next === valueRef.current) return false;
    valueRef.current = next;
    chainClick();
    onChange(next);
    return true;
  };

  const startRepeat = (delta) => {
    if (!nudge(delta)) return;
    const run = (delay) => {
      repeat.current = setTimeout(() => {
        if (nudge(delta)) run(Math.max(45, delay * 0.8));
      }, delay);
    };
    run(380);
  };

  const stopRepeat = () => clearTimeout(repeat.current);

  const btnProps = (delta) => ({
    type: 'button',
    onPointerDown: (e) => {
      e.preventDefault();
      startRepeat(delta);
    },
    onPointerUp: stopRepeat,
    onPointerLeave: stopRepeat,
    onPointerCancel: stopRepeat,
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        nudge(delta);
      }
    },
    onContextMenu: (e) => e.preventDefault(),
  });

  return (
    <div className="stepper">
      <label htmlFor={id}>{label}</label>
      <div className="stepper-row">
        <button {...btnProps(-1)} aria-label={`Fewer ${label} teeth`} disabled={value <= min}>
          −
        </button>
        <div className="stepper-value">
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={value}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n >= min && n <= max) onChange(Math.round(n));
            }}
          />
          {/* key change retriggers the CSS "flip" animation */}
          <span key={value} className="stepper-digits" aria-hidden="true">
            {value}
            <small>T</small>
          </span>
        </div>
        <button {...btnProps(1)} aria-label={`More ${label} teeth`} disabled={value >= max}>
          +
        </button>
      </div>
    </div>
  );
}
