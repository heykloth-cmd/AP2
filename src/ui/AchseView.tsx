import { AchsePlant, LEN, PITCH } from '../sim/achse';
import { Lamp, PushButton, Switch } from './PanelView';

const sx = (x: number) => 14 + (225 - x) * 1.44;

function Cube({ x, y, m }: { x: number; y: number; m: 'metall' | 'kunststoff' }) {
  return <rect x={x - 7} y={y} width={14} height={13} rx={2} className={`cube ${m}`} />;
}

function Led({ x, y, on, label, below }: { x: number; y: number; on: boolean; label: string; below?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={4.2} className={`sled ${on ? 'on' : ''}`} />
      <text x={x} y={below ? y + 13 : y - 7} textAnchor="middle" className="svg-label">
        {label}
      </text>
    </g>
  );
}

export function AchseView({ plant, onOperate }: { plant: AchsePlant; onOperate: () => void }) {
  const ins = plant.readInputs();
  const out = plant.outputs;
  const op = plant.operator;
  const set = (n: string, v: boolean) => {
    op[n] = v;
    onOperate();
  };
  const slideX = sx(plant.x);
  const rodBottom = 64 + plant.z * 52;
  const tableY = 138;
  const magX = sx(plant.magazinePulses * PITCH);
  const magnetOn = !(out.QA60 && plant.ke2);

  return (
    <div className="achse">
      <svg viewBox="0 0 400 205" className="achse-svg" role="img" aria-label="Achsenmodell">
        {/* Tisch */}
        <rect x={6} y={tableY + 13} width={388} height={6} className="table" />
        {/* Schiene / Spindel */}
        <rect x={sx(225)} y={36} width={sx(-35) - sx(225)} height={7} rx={3} className="rail" />
        <line x1={sx(225)} y1={39.5} x2={sx(-35)} y2={39.5} className={`spindle ${plant.moving ? 'turning' : ''}`} />
        {/* Skala in Impulsen */}
        {Array.from({ length: 11 }, (_, i) => i * 10).map((p) => (
          <g key={p}>
            <line x1={sx(p * PITCH)} y1={46} x2={sx(p * PITCH)} y2={p % 50 === 0 ? 52 : 49} className="tick" />
            {p % 30 === 0 && (
              <text x={sx(p * PITCH)} y={60} textAnchor="middle" className="svg-small">
                {p}
              </text>
            )}
          </g>
        ))}
        {/* Endlagen */}
        <Led x={sx(0)} y={22} on={!!ins.BG13} label="BG13" />
        <Led x={sx(LEN)} y={22} on={!!ins.BG11} label="BG11" />
        {/* Motor */}
        <g className={`motor-svg ${plant.moving ? 'on' : ''}`}>
          <rect x={sx(-35) - 2} y={28} width={14} height={23} rx={3} />
          <text x={sx(-35) + 5} y={43} textAnchor="middle" className="svg-m">
            M
          </text>
        </g>
        {/* Schlitten mit Zylinder */}
        <g>
          <rect x={slideX - 16} y={26} width={32} height={26} rx={4} className={`slide ${plant.moving ? 'moving' : ''}`} />
          <Led x={slideX + 10} y={33} on={!!ins.BG12} label="" />
          <text x={slideX - 4} y={44} textAnchor="middle" className="svg-small strong">
            MM20
          </text>
          <rect x={slideX - 2.5} y={52} width={5} height={rodBottom - 52} className="rod" />
          <rect x={slideX - 9} y={rodBottom} width={18} height={6} rx={1.5} className={`magnet ${magnetOn ? 'on' : ''}`} />
          {plant.holding && <Cube x={slideX} y={rodBottom + 6} m={plant.holding} />}
          {plant.moving !== 0 && (
            <text x={slideX + (plant.moving > 0 ? -24 : 24)} y={44} textAnchor="middle" className="svg-arrow">
              {plant.moving > 0 ? '◀' : '▶'}
            </text>
          )}
        </g>
        {/* Magazin */}
        <g>
          <rect x={magX - 10} y={tableY - 6 * 13 + 13} width={20} height={6 * 13} className="magazine" />
          {plant.magazine.map((m, i) => (
            <Cube key={i} x={magX} y={tableY - i * 13} m={m} />
          ))}
          {plant.variante === 'vorbereitung' && <Led x={magX - 17} y={tableY + 5} on={!!ins.BG54} label="BG54" below />}
          <text x={magX} y={tableY + 34} textAnchor="middle" className="svg-label">
            {plant.variante === 'vorbereitung' ? 'Pos. 4' : 'Pos. 2'}
          </text>
          <text x={magX} y={tableY + 46} textAnchor="middle" className="svg-label">
            Magazin
          </text>
        </g>
        {/* Ablagen */}
        {plant.slots.map((s, i) => {
          const x = sx(s.pulses * PITCH);
          return (
            <g key={s.name}>
              <rect x={x - 10} y={tableY + 9} width={20} height={4} className="slot" />
              {s.part && <Cube x={x} y={tableY - 4} m={s.part} />}
              <Led x={x + 16} y={tableY + 5} on={i === 0 ? !!ins.BG52 : !!ins.BG53} label={i === 0 ? 'BG52' : 'BG53'} below />
              <text x={x} y={tableY + 34} textAnchor="middle" className="svg-label">
                {s.name}
              </text>
            </g>
          );
        })}
        {/* Zylinder-Endlagen */}
        <text x={392} y={80} textAnchor="end" className="svg-small">
          BG21 {ins.BG21 ? '●' : '○'} BG22 {ins.BG22 ? '●' : '○'}
        </text>
        <text x={392} y={92} textAnchor="end" className="svg-small">
          Magnet {magnetOn ? 'EIN' : 'AUS'}
        </text>
        {plant.floor > 0 && (
          <text x={200} y={196} textAnchor="middle" className="svg-warn">
            {plant.floor} Würfel heruntergefallen
          </text>
        )}
      </svg>
      <div className="achse-readout">
        <span>
          Schlitten: <b>{plant.pulses.toFixed(1)}</b> Impulse ab BG13
        </span>
        <span className="muted">Pos. 1 = 90 · Pos. 2 = 60 · Pos. 3 = 30 · Pos. 4 = 45</span>
      </div>

      <div className="achse-panels">
        <div className="panel-section">
          <div className="panel-title">Bedien- und Anzeigeeinheit</div>
          <div className="panel-grid">
            <PushButton name="SG1" label="NOT-AUS" pressed={!!op.SG1} latching color="mushroom" onChange={(v) => set('SG1', v)} />
            <PushButton name="SJ2" label="Reset NOT-AUS" pressed={!!op.SJ2} color="black" onChange={(v) => set('SJ2', v)} />
            <Switch name="SJ3" label="Steuerung AUS/EIN" on={!!op.SJ3} onChange={(v) => set('SJ3', v)} />
            <Switch name="SJ4" label="Einricht / Automatik" on={!!op.SJ4} positions={['E', 'A']} onChange={(v) => set('SJ4', v)} />
            <PushButton name="SJ5" label="Start Automatik" pressed={!!op.SJ5} color="green" onChange={(v) => set('SJ5', v)} />
            <PushButton name="SJ6" label="◀ Linksfahrt" pressed={!!op.SJ6} onChange={(v) => set('SJ6', v)} />
            <PushButton name="SJ7" label="Rechtsfahrt ▶" pressed={!!op.SJ7} onChange={(v) => set('SJ7', v)} />
            <PushButton name="SJ8" label="MM20 einfahren ▲" pressed={!!op.SJ8} onChange={(v) => set('SJ8', v)} />
            <PushButton name="SJ9" label="MM20 ausfahren ▼" pressed={!!op.SJ9} onChange={(v) => set('SJ9', v)} />
            <PushButton name="SJ12" label="Magnet deaktivieren" pressed={!!op.SJ12} onChange={(v) => set('SJ12', v)} />
          </div>
        </div>
        <div className="panel-section">
          <div className="panel-title">Leuchtmelder</div>
          <div className="panel-grid lamps">
            <Lamp name="PF2" label="Grundstellung" color="white" on={!!out.PF2} />
            <Lamp name="PF3" label="Betriebsart" color="white" on={!!out.PF3} />
            <Lamp name="PF4" label="Druck vorhanden" color="green" on={!!out.PF4} />
            <Lamp name="PF5" label="Motorschutz ausgelöst" color="red" on={!!out.PF5} />
            <Lamp name="PF6" label="Linksfahrt" color="yellow" on={!!out.PF6} />
            <Lamp name="PF7" label="Rechtsfahrt" color="yellow" on={!!out.PF7} />
            <Lamp name="PF10" label="MM20 eingefahren" color="blue" on={!!out.PF10} />
            <Lamp name="PF11" label="MM20 ausgefahren" color="blue" on={!!out.PF11} />
            <Lamp name="PF15" label="MB60 deaktiviert" color="yellow" on={!!out.PF15} />
          </div>
          <div className="signal-column" aria-label="Signalsäule UA3">
            <div className="sc-title">UA3</div>
            <div className={`sc red ${!plant.ke2 ? 'on' : ''}`} title="PF31 NOT-AUS (fest verdrahtet)">PF31</div>
            <div className={`sc yellow ${out.PF32 ? 'on' : ''}`} title="PF32 Magnet deaktiviert">PF32</div>
            <div className={`sc green ${out.PF33 ? 'on' : ''}`} title="PF33 Pos. 1 und 3 belegt">PF33</div>
          </div>
        </div>
        <div className="panel-section">
          <div className="panel-title">Anlage (Simulation)</div>
          <div className="plant-actions">
            <label className="chk">
              <input type="checkbox" checked={!!op.Druckluft} onChange={(e) => set('Druckluft', e.target.checked)} /> Druckluft (BP1)
            </label>
            <label className="chk">
              <input type="checkbox" checked={!!op.Motorschutz} onChange={(e) => set('Motorschutz', e.target.checked)} /> Motorschutz FC7 auslösen
            </label>
            <div className="btn-row">
              <button className="btn small" onClick={() => { plant.refill('metall'); onOperate(); }}>+ Metallwürfel</button>
              <button className="btn small" onClick={() => { plant.refill('kunststoff'); onOperate(); }}>+ Kunststoffwürfel</button>
              <button className="btn small" onClick={() => { plant.emptyMagazine(); onOperate(); }}>Magazin leeren</button>
              <button className="btn small" onClick={() => { plant.clearSlot(0); plant.clearSlot(1); onOperate(); }}>Ablagen leeren</button>
            </div>
          </div>
          <div className="event-log" aria-live="polite">
            {plant.events.slice(-4).reverse().map((e, i) => (
              <div key={i} className={`ev ${e.level}`}>
                <span className="ev-t">{(e.t / 1000).toFixed(1)} s</span> {e.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
