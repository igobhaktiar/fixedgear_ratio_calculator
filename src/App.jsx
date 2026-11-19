import { useEffect, useMemo } from 'react';
import CadenceTable from './components/CadenceTable.jsx';
import Drivetrain from './components/Drivetrain.jsx';
import EquivalentGears from './components/EquivalentGears.jsx';
import { BellIcon, SoundIcon } from './components/Icons.jsx';
import Stat from './components/Stat.jsx';
import TeethStepper from './components/TeethStepper.jsx';
import TreadTrail from './components/TreadTrail.jsx';
import { usePersistentState } from './hooks/usePersistentState.js';
import { bell, setSoundEnabled } from './lib/feedback.js';
import {
  CHAINRING_RANGE,
  COG_RANGE,
  development,
  equivalentGears,
  gearInches,
  gearRatio,
  skidPatches,
  speedAt,
} from './lib/gearing.js';
import { CUSTOM_TIRE_ID, TIRES, findTire } from './lib/tires.js';

const DEFAULTS = {
  chainring: 46,
  cog: 18,
  tireId: '700x25',
  customCircumference: 2100,
  ambidextrous: false,
  unit: 'metric',
  cadence: 90,
  sound: false,
};

const TICKER = [
  'No brakes, no problem',
  'Skid patches matter',
  'Brakeless is not a personality',
  'Track bikes on the street',
  'Alleycat ready',
  'Trackstand at every red',
  'Spin to win',
];

export default function App() {
  const [settings, setSettings] = usePersistentState('fg-calc:v2', DEFAULTS);
  const { chainring, cog, tireId, customCircumference, ambidextrous, unit, cadence, sound } = settings;
  const update = (patch) => setSettings((s) => ({ ...s, ...patch }));

  useEffect(() => setSoundEnabled(sound), [sound]);

  const tire = findTire(tireId);
  const circumference = tireId === CUSTOM_TIRE_ID ? customCircumference : (tire ?? TIRES[1]).circumference;

  const stats = useMemo(() => {
    const dev = development(chainring, cog, circumference);
    return {
      ratio: gearRatio(chainring, cog),
      dev,
      inches: gearInches(chainring, cog, circumference),
      patches: skidPatches(chainring, cog, ambidextrous),
      cruise: speedAt(cadence, dev, unit),
    };
  }, [chainring, cog, circumference, ambidextrous, cadence, unit]);

  const equivalents = useMemo(() => equivalentGears(chainring, cog), [chainring, cog]);
  const imperial = unit === 'imperial';

  return (
    <>
      <TreadTrail />

      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i}>{t} ✦</span>
          ))}
        </div>
      </div>

      <header className="masthead">
        <div className="masthead-top">
          <span className="badge">Est. on the street · v2</span>
          <div className="toolbar">
            <div className="segmented" role="group" aria-label="Units">
              {['metric', 'imperial'].map((u) => (
                <button key={u} type="button" aria-pressed={unit === u} onClick={() => update({ unit: u })}>
                  {u === 'metric' ? 'km' : 'mi'}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-pressed={sound}
              aria-label={sound ? 'Mute sounds' : 'Enable sounds'}
              onClick={() => update({ sound: !sound })}
            >
              <SoundIcon on={sound} />
            </button>
            <button type="button" className="icon-btn bell" aria-label="Ring the bell" onClick={bell}>
              <BellIcon />
            </button>
          </div>
        </div>
        <h1>
          <span className="h1-a">Brake</span>
          <span className="h1-b">less</span>
        </h1>
        <p className="kicker">
          Fixed gear calculator<span> — ratio, skid patches, cadence. Know your gear before you lock your legs.</span>
        </p>
      </header>

      <main className="grid">
        <section className="card card--paper setup" aria-labelledby="setup-h">
          <h2 id="setup-h">
            <span className="cp">CP 01</span> Drivetrain
          </h2>
          <div className="steppers">
            <TeethStepper
              label="Chainring"
              value={chainring}
              {...CHAINRING_RANGE}
              onChange={(v) => update({ chainring: v })}
            />
            <TeethStepper label="Cog" value={cog} {...COG_RANGE} onChange={(v) => update({ cog: v })} />
          </div>

          <label className="field">
            <span>Tyre</span>
            <select value={tireId} onChange={(e) => update({ tireId: e.target.value })}>
              {TIRES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.etrto}) · {t.circumference} mm
                </option>
              ))}
              <option value={CUSTOM_TIRE_ID}>Custom circumference…</option>
            </select>
          </label>

          {tireId === CUSTOM_TIRE_ID && (
            <label className="field">
              <span>Roll-out circumference (mm)</span>
              <input
                type="number"
                inputMode="numeric"
                min={1000}
                max={2600}
                value={customCircumference}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n >= 1000 && n <= 2600) update({ customCircumference: n });
                }}
              />
            </label>
          )}

          <label className="toggle">
            <input
              type="checkbox"
              checked={ambidextrous}
              onChange={(e) => update({ ambidextrous: e.target.checked })}
            />
            <span className="toggle-track" aria-hidden="true" />
            <span>Ambidextrous skid (either foot forward)</span>
          </label>
        </section>

        <section className="card card--asphalt viz" aria-labelledby="viz-h">
          <h2 id="viz-h">
            <span className="cp">CP 02</span> Spin it
          </h2>
          <Drivetrain
            key={`${chainring}-${cog}-${ambidextrous}`}
            chainring={chainring}
            cog={cog}
            patches={stats.patches}
            ambidextrous={ambidextrous}
            cadence={cadence}
            soundOn={sound}
          />
          <label className="cadence-slider">
            <span>
              Cadence <b>{cadence} rpm</b> → {stats.cruise.toFixed(1)} {imperial ? 'mph' : 'km/h'}
            </span>
            <input
              type="range"
              min={30}
              max={150}
              step={5}
              value={cadence}
              onChange={(e) => update({ cadence: Number(e.target.value) })}
            />
          </label>
        </section>

        <section className="stats" aria-label="Results">
          <Stat label="Gear ratio" value={stats.ratio} unit=":1" tone="pink" />
          <Stat label="Skid patches" value={stats.patches} digits={0} tone="yellow" hint={ambidextrous ? 'both feet' : 'one foot'} />
          <Stat label="Gear inches" value={stats.inches} digits={1} unit="in" />
          <Stat
            label="Development"
            value={imperial ? stats.dev * 3.28084 : stats.dev}
            unit={imperial ? 'ft' : 'm'}
            hint="per crank turn"
          />
        </section>

        <section className="card card--paper equiv" aria-labelledby="eq-h">
          <h2 id="eq-h">
            <span className="cp">CP 03</span> Same feel ±2%
          </h2>
          <p className="muted">Tap a combo to swap it in.</p>
          <EquivalentGears combos={equivalents} onPick={(c) => update({ chainring: c.chainring, cog: c.cog })} />
        </section>

        <section className="card card--asphalt speeds" aria-labelledby="sp-h">
          <h2 id="sp-h">
            <span className="cp">CP 04</span> Cadence / speed
          </h2>
          <CadenceTable
            developmentM={stats.dev}
            unit={unit}
            cadence={cadence}
            onCadence={(rpm) => update({ cadence: rpm })}
          />
        </section>
      </main>

      <footer className="footer">
        <p>
          Speed = cadence × development × 60. Real numbers vary with tyre pressure and wear — measure your roll-out
          for best results.
        </p>
        <p className="footer-tag">Ride fixed. Ride safe. Wear a lid.</p>
        <a
          className="signature"
          href="https://www.instagram.com/igoback.exe/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="signature-by">built by</span>
          <span className="signature-name">@igoback.exe</span>
        </a>
      </footer>
    </>
  );
}
