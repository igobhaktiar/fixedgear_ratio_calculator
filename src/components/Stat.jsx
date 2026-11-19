import { useAnimatedNumber } from '../hooks/useAnimatedNumber.js';

export default function Stat({ label, value, digits = 2, unit, tone = 'paper', hint }) {
  const shown = useAnimatedNumber(value);
  return (
    <div className={`stat stat--${tone}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">
        {shown.toFixed(digits)}
        {unit && <small>{unit}</small>}
      </strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}
