import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import { skidNoise } from '../lib/feedback.js';

// Geometry (SVG user units). Bike faces right: rear wheel left, chainring right.
const W = { x: 140, y: 122, r: 104 };
const RING = { x: 338, y: 158 };
const GROUND_Y = W.y + W.r + 2;
const TOOTH_SCALE = 1.12;
const CRANK_LEN = 44;
const SPOKES = 16;
const VIS_SPEED = 0.3; // slow real cadence down so the eye can follow it
const TRAVEL_PER_DEG = (2 * Math.PI * W.r) / 360;

const mod = (a, n) => ((a % n) + n) % n;

/** Outer tangent points between two circles — the chain's top and bottom runs. */
function chainPath(c1, r1, c2, r2) {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const d = Math.hypot(dx, dy);
  const theta = Math.atan2(dy, dx);
  const alpha = Math.acos((r1 - r2) / d);
  const pt = (c, r, a) => `${(c.x + r * Math.cos(a)).toFixed(1)} ${(c.y + r * Math.sin(a)).toFixed(1)}`;
  return [theta + alpha, theta - alpha]
    .map((a) => `M${pt(c1, r1, a)} L${pt(c2, r2, a)}`)
    .join(' ');
}

function Sprocket({ cx, cy, teeth, className }) {
  const r = teeth * TOOTH_SCALE;
  const pitch = (2 * Math.PI * r) / teeth;
  return (
    <g className={className}>
      <circle cx={cx} cy={cy} r={r} className="sprocket-teeth" strokeDasharray={`${pitch / 2} ${pitch / 2}`} />
      <circle cx={cx} cy={cy} r={r - 3} className="sprocket-body" />
      {teeth >= 30 &&
        [0, 72, 144, 216, 288].map((a) => (
          <circle
            key={a}
            cx={cx + (r * 0.55) * Math.cos((a * Math.PI) / 180)}
            cy={cy + (r * 0.55) * Math.sin((a * Math.PI) / 180)}
            r={r * 0.22}
            className="sprocket-cutout"
          />
        ))}
      <circle cx={cx} cy={cy} r={5} className="sprocket-bolt" />
    </g>
  );
}

export default function Drivetrain({ chainring, cog, patches, ambidextrous, cadence, soundOn }) {
  const reduced = useReducedMotion();
  const [wear, setWear] = useState(() => Array(patches).fill(0));
  const [lastPatch, setLastPatch] = useState(null);
  const [skidding, setSkidding] = useState(false);

  const wheelRef = useRef(null);
  const crankRef = useRef(null);
  const groundRef = useRef(null);
  const skidMarkRef = useRef(null);
  const sim = useRef({ crank: 0, travel: 0, mode: 'ride', target: 0, slide: 0, mark: 0, stopSound: null });
  // Latest props for the rAF loop, kept in a ref so the loop never restarts.
  const live = useRef({ cadence, ratio: chainring / cog, reduced, step: 360 });
  useEffect(() => {
    live.current = { cadence, ratio: chainring / cog, reduced, step: ambidextrous ? 180 : 360 };
  }, [cadence, chainring, cog, reduced, ambidextrous]);

  // Animation loop — mutates SVG attributes directly, never re-renders React.
  useEffect(() => {
    let frame;
    let last = performance.now();
    const s = sim.current;

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { cadence: rpm, ratio, reduced: still } = live.current;
      const prevWheel = s.crank * ratio;

      if (s.mode === 'ride' && !still) {
        s.crank += (rpm / 60) * 360 * VIS_SPEED * dt;
      } else if (s.mode === 'braking') {
        s.crank += (s.target - s.crank) * Math.min(1, dt * 14);
        if (Math.abs(s.target - s.crank) < 0.5 || still) {
          s.crank = s.target;
          s.mode = 'locked';
          s.slide = (rpm / 60) * 360 * VIS_SPEED * ratio;
          s.mark = 0;
        }
      }

      const wheel = s.crank * ratio;
      let groundDeg = s.mode === 'locked' ? 0 : wheel - prevWheel;
      if (s.mode === 'locked' && !still) {
        s.slide *= Math.exp(-dt * 1.4);
        groundDeg = s.slide * dt;
        s.mark = Math.min(W.x, s.mark + groundDeg * TRAVEL_PER_DEG);
      }
      s.travel += groundDeg * TRAVEL_PER_DEG;

      wheelRef.current?.setAttribute('transform', `rotate(${mod(wheel, 360)} ${W.x} ${W.y})`);
      crankRef.current?.setAttribute('transform', `rotate(${mod(s.crank, 360)} ${RING.x} ${RING.y})`);
      groundRef.current?.setAttribute('stroke-dashoffset', mod(s.travel, 48).toFixed(1));
      if (skidMarkRef.current) {
        skidMarkRef.current.setAttribute('x', (W.x - s.mark).toFixed(1));
        skidMarkRef.current.setAttribute('width', s.mark.toFixed(1));
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      s.stopSound?.();
    };
  }, []);

  const startSkid = useCallback(() => {
    const s = sim.current;
    if (s.mode !== 'ride') return;
    // Lock the legs at the preferred skid-foot position (nearest crank multiple).
    const { step } = live.current;
    s.target = Math.round(s.crank / step) * step;
    s.mode = 'braking';
    if (soundOn) s.stopSound = skidNoise();
    else navigator.vibrate?.([30, 20, 30]);
    setSkidding(true);
  }, [soundOn]);

  const endSkid = useCallback(() => {
    const s = sim.current;
    if (s.mode === 'ride') return;
    const wheel = s.target * live.current.ratio;
    const index = Math.round(mod(wheel, 360) / (360 / patches)) % patches;
    s.mode = 'ride';
    s.stopSound?.();
    s.stopSound = null;
    setSkidding(false);
    setLastPatch(index);
    setWear((w) => w.map((v, i) => (i === index ? v + 1 : v)));
  }, [patches]);

  const onKey = (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (e.type === 'keydown' && !e.repeat) startSkid();
    if (e.type === 'keyup') endSkid();
  };

  const ringR = chainring * TOOTH_SCALE;
  const cogR = cog * TOOTH_SCALE;
  const totalSkids = wear.reduce((a, b) => a + b, 0);

  return (
    <figure className={`drivetrain ${skidding ? 'is-skidding' : ''}`}>
      <svg
        viewBox="0 0 420 250"
        role="img"
        aria-label={`Drivetrain: ${chainring} tooth chainring, ${cog} tooth cog, ${patches} skid patches marked on the rear tyre.`}
        onPointerDown={startSkid}
        onPointerUp={endSkid}
        onPointerLeave={endSkid}
        onPointerCancel={endSkid}
        onContextMenu={(e) => e.preventDefault()}
      >
        <line ref={groundRef} x1="0" x2="420" y1={GROUND_Y + 6} y2={GROUND_Y + 6} className="ground" strokeDasharray="30 18" />
        <rect ref={skidMarkRef} x={W.x} y={GROUND_Y - 1} width="0" height="6" className="skid-mark" />

        <path d={chainPath(W, cogR, RING, ringR)} className="chain" />

        <g ref={wheelRef}>
          <circle cx={W.x} cy={W.y} r={W.r} className="tyre" />
          <circle cx={W.x} cy={W.y} r={W.r - 12} className="rim" />
          {Array.from({ length: SPOKES }, (_, i) => {
            const a = (i / SPOKES) * Math.PI * 2;
            const hub = i % 2 ? 9 : 14;
            return (
              <line
                key={i}
                x1={W.x + hub * Math.cos(a + 0.6)}
                y1={W.y + hub * Math.sin(a + 0.6)}
                x2={W.x + (W.r - 14) * Math.cos(a)}
                y2={W.y + (W.r - 14) * Math.sin(a)}
                className="spoke"
              />
            );
          })}
          {wear.map((count, j) => {
            const angle = 90 - (j * 360) / patches;
            const len = Math.min(20, 9 + count * 2.5);
            return (
              <rect
                key={j}
                x={W.x - 3.5}
                y={W.y + W.r - len + 1}
                width="7"
                height={len}
                rx="1.5"
                transform={`rotate(${angle - 90} ${W.x} ${W.y})`}
                className={`patch ${j === lastPatch ? 'is-last' : ''} ${count ? 'is-worn' : ''}`}
              />
            );
          })}
          <Sprocket cx={W.x} cy={W.y} teeth={cog} className="cog" />
        </g>

        <g ref={crankRef}>
          <Sprocket cx={RING.x} cy={RING.y} teeth={chainring} className="ring" />
          <line x1={RING.x} y1={RING.y} x2={RING.x} y2={RING.y + CRANK_LEN + ringR * 0.2} className="crank" />
          <rect x={RING.x - 12} y={RING.y + CRANK_LEN + ringR * 0.2 - 4} width="24" height="8" rx="2" className="pedal" />
        </g>

        {skidding && (
          <g className="smoke" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <circle key={i} cx={W.x - 10 - i * 8} cy={GROUND_Y - 6} r={6 + i * 2} style={{ '--i': i }} />
            ))}
          </g>
        )}
      </svg>

      <figcaption>
        <button
          type="button"
          className="skid-btn"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            startSkid();
          }}
          onPointerUp={endSkid}
          onPointerCancel={endSkid}
          onKeyDown={onKey}
          onKeyUp={onKey}
          onContextMenu={(e) => e.preventDefault()}
        >
          {skidding ? 'SKIIIIID…' : 'Hold to skid'}
        </button>
        <p aria-live="polite">
          {lastPatch === null
            ? 'Press & hold the wheel. Each skid lands on one of the pink patches.'
            : `Landed on patch #${lastPatch + 1} · ${totalSkids} skid${totalSkids > 1 ? 's' : ''} so far`}
        </p>
      </figcaption>
    </figure>
  );
}
