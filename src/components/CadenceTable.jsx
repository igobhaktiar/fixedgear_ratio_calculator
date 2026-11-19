import { speedAt } from '../lib/gearing.js';

const CADENCES = [50, 60, 70, 80, 90, 100, 110, 120, 130];

export default function CadenceTable({ developmentM, unit, cadence, onCadence }) {
  const speedUnit = unit === 'imperial' ? 'mph' : 'km/h';
  const top = speedAt(CADENCES.at(-1), developmentM, unit);

  return (
    <ol className="cadence" role="list">
      {CADENCES.map((rpm) => {
        const speed = speedAt(rpm, developmentM, unit);
        const active = rpm === cadence;
        return (
          <li key={rpm}>
            <button
              type="button"
              className={`cadence-row ${active ? 'is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onCadence(rpm)}
            >
              <span className="cadence-rpm">
                {rpm}
                <small>rpm</small>
              </span>
              <span className="cadence-bar" style={{ '--w': `${(speed / top) * 100}%` }} />
              <span className="cadence-speed">
                {speed.toFixed(1)}
                <small>{speedUnit}</small>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
