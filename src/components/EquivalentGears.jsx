import { chainClick } from '../lib/feedback.js';

export default function EquivalentGears({ combos, onPick }) {
  if (!combos.length) {
    return <p className="muted">No close matches in 28–60T × 9–24T. You ride a unicorn gear.</p>;
  }
  return (
    <ul className="chips" role="list">
      {combos.map((c, i) => (
        <li key={`${c.chainring}x${c.cog}`} style={{ '--tilt': `${((i * 37) % 7) - 3}deg` }}>
          <button
            type="button"
            className="chip"
            title={`Ratio ${c.ratio.toFixed(3)} (${c.diff >= 0 ? '+' : ''}${(c.diff * 100).toFixed(1)}%)`}
            onClick={() => {
              chainClick();
              onPick(c);
            }}
          >
            {c.chainring}
            <span>×</span>
            {c.cog}
          </button>
        </li>
      ))}
    </ul>
  );
}
