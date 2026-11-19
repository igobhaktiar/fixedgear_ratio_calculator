// Tiny haptic + sound helpers. Sound is opt-in (the UI toggle), haptics are
// a no-op where unsupported (iOS Safari, desktop).

let ctx;
let soundOn = false;

export const setSoundEnabled = (on) => {
  soundOn = on;
};

function audio() {
  if (!soundOn) return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx ??= new AudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function buzz(pattern = 8) {
  navigator.vibrate?.(pattern);
}

/** Short metallic tick — a chain link dropping onto a cog. */
export function chainClick() {
  buzz(6);
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1800, t);
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

/** Classic "ding-ding" bike bell. */
export function bell() {
  buzz([10, 60, 10]);
  const ac = audio();
  if (!ac) return;
  [0, 0.18].forEach((offset) => {
    const t = ac.currentTime + offset;
    [2093, 2637, 3520].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12 / (i + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      osc.connect(gain).connect(ac.destination);
      osc.start(t);
      osc.stop(t + 1);
    });
  });
}

/** Filtered noise burst — rubber on asphalt. Returns a stop function. */
export function skidNoise() {
  buzz([30, 20, 30, 20, 30]);
  const ac = audio();
  if (!ac) return () => {};
  const buffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1400;
  filter.Q.value = 4;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, ac.currentTime + 0.05);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start();
  return () => {
    const t = ac.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    src.stop(t + 0.2);
  };
}
