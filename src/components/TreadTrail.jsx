import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion.js';

const TREAD_GAP = 9; // px between tread chevrons
const FADE = 0.06; // per-frame erase strength
const SPARK_COLORS = ['#ff2e88', '#e4ff3a', '#f4efe3'];

/**
 * Full-screen, click-through canvas. The pointer (mouse or finger) leaves a
 * fading tyre-tread track; a tap kicks up sparks like a skid on asphalt.
 */
export default function TreadTrail() {
  const reduced = useReducedMotion();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (reduced) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let dpr = 1;
    let frame;
    let last = null;
    let carry = 0;
    let idle = 0;
    const sparks = [];

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const chevron = (x, y, angle) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-3, -7);
      ctx.lineTo(2, 0);
      ctx.lineTo(-3, 7);
      ctx.stroke();
      ctx.restore();
    };

    const onMove = (e) => {
      const p = { x: e.clientX, y: e.clientY };
      if (!last) {
        last = p;
        return;
      }
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 160) {
        last = p; // pointer teleported (new touch) — don't draw a line across the page
        return;
      }
      const angle = Math.atan2(dy, dx);
      ctx.strokeStyle = 'rgba(244, 239, 227, 0.28)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      let t = TREAD_GAP - carry;
      while (t <= dist) {
        chevron(last.x + (dx * t) / dist, last.y + (dy * t) / dist, angle);
        t += TREAD_GAP;
      }
      carry = (carry + dist) % TREAD_GAP;
      last = p;
      idle = 0;
    };

    const onDown = (e) => {
      last = { x: e.clientX, y: e.clientY };
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 2 + Math.random() * 4;
        sparks.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 1.5,
          life: 1,
          color: SPARK_COLORS[i % SPARK_COLORS.length],
        });
      }
    };

    const onLeave = (e) => {
      // A lifted finger ends the track; a mouse keeps rolling after a click.
      if (e?.pointerType !== 'mouse') last = null;
    };

    const tick = () => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0,0,0,${FADE})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.25;
        s.life -= 0.035;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = s.life;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 2, s.y - s.vy * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Sleep after the canvas has fully faded to save battery.
      idle += 1;
      if (idle < 120 || sparks.length) frame = requestAnimationFrame(tick);
      else frame = null;
    };

    const wake = () => {
      idle = 0;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const handleMove = (e) => {
      onMove(e);
      wake();
    };
    const handleDown = (e) => {
      onDown(e);
      wake();
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerdown', handleDown, { passive: true });
    window.addEventListener('pointerup', onLeave, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointerup', onLeave);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [reduced]);

  if (reduced) return null;
  return <canvas ref={canvasRef} className="tread-trail" aria-hidden="true" />;
}
