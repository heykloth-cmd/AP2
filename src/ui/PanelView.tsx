import type { PanelPlant } from '../sim/panel';
import type { InputCtl, LampColor, Value } from '../sim/types';

export function Lamp({ on, color = 'green', label, name, small }: { on: boolean; color?: LampColor; label?: string; name: string; small?: boolean }) {
  return (
    <div className={`lamp-wrap ${small ? 'small' : ''}`} title={label}>
      <div className={`lamp ${color} ${on ? 'on' : ''}`} aria-label={`${name} ${on ? 'an' : 'aus'}`} />
      <div className="lamp-name">{name}</div>
      {label && !small && <div className="lamp-label">{label}</div>}
    </div>
  );
}

export function PushButton({
  name,
  label,
  pressed,
  onChange,
  nc,
  color = 'neutral',
  latching,
  big,
}: {
  name: string;
  label?: string;
  pressed: boolean;
  onChange: (v: boolean) => void;
  nc?: boolean;
  color?: 'neutral' | 'green' | 'red' | 'black' | 'mushroom';
  latching?: boolean;
  big?: boolean;
}) {
  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      /* kein aktiver Zeiger (z. B. synthetisches Ereignis) */
    }
    if (latching) onChange(!pressed);
    else onChange(true);
  };
  const up = () => {
    if (!latching) onChange(false);
  };
  return (
    <div className={`ctl ${big ? 'big' : ''}`}>
      <button
        type="button"
        className={`pushbtn ${color} ${pressed ? 'pressed' : ''}`}
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={up}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault();
            if (latching) onChange(!pressed);
            else onChange(true);
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') up();
        }}
        aria-pressed={pressed}
        aria-label={`${name}${label ? ' – ' + label : ''}`}
      >
        <span className="cap" />
      </button>
      <div className="ctl-name">
        {name}
        {nc && <span className="badge-nc" title="Öffner: nicht betätigt = TRUE">Öffner</span>}
      </div>
      {label && <div className="ctl-label">{label}</div>}
    </div>
  );
}

export function Switch({ name, label, on, onChange, positions }: { name: string; label?: string; on: boolean; onChange: (v: boolean) => void; positions?: [string, string] }) {
  return (
    <div className="ctl">
      <button type="button" className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on} aria-label={`${name}${label ? ' – ' + label : ''}`}>
        <span className="switch-pos">{positions ? positions[0] : '0'}</span>
        <span className="knob" />
        <span className="switch-pos">{positions ? positions[1] : '1'}</span>
      </button>
      <div className="ctl-name">{name}</div>
      {label && <div className="ctl-label">{label}</div>}
    </div>
  );
}

function Sensor({ ctl, value, onChange }: { ctl: InputCtl; value: Value; onChange: (v: Value) => void }) {
  return (
    <div className="ctl">
      <button type="button" className={`sensor ${value ? 'on' : ''}`} onClick={() => onChange(!value)} aria-pressed={!!value} aria-label={`${ctl.name} – ${ctl.label}`}>
        <span className="sensor-led" />
        <span className="sensor-text">{value ? 'betätigt' : 'frei'}</span>
      </button>
      <div className="ctl-name">{ctl.name}</div>
      <div className="ctl-label">{ctl.label}</div>
    </div>
  );
}

function Analog({ ctl, value, onChange }: { ctl: InputCtl; value: number; onChange: (v: number) => void }) {
  return (
    <div className="ctl analog">
      <div className="ctl-name">
        {ctl.name} <span className="analog-val">{value}</span>
        {ctl.unit && <span className="unit"> {ctl.unit}</span>}
      </div>
      <input type="range" min={ctl.min ?? 0} max={ctl.max ?? 27648} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={`${ctl.name} – ${ctl.label}`} />
      <div className="ctl-label">{ctl.label}</div>
    </div>
  );
}

export function PanelView({ plant, onOperate }: { plant: PanelPlant; onOperate: () => void }) {
  const set = (n: string, v: Value) => {
    plant.operator[n] = v;
    onOperate();
  };
  const { inputs, outputs } = plant.config;
  return (
    <div className="panel">
      <div className="panel-section">
        <div className="panel-title">Eingänge</div>
        <div className="panel-grid">
          {inputs.map((i) => {
            const v = plant.operator[i.name]!;
            if (i.kind === 'switch') return <Switch key={i.name} name={i.name} label={i.label} on={!!v} onChange={(x) => set(i.name, x)} />;
            if (i.kind === 'button' || i.kind === 'buttonNC')
              return <PushButton key={i.name} name={i.name} label={i.label} pressed={!!v} nc={i.kind === 'buttonNC'} color={i.kind === 'buttonNC' ? 'red' : 'green'} onChange={(x) => set(i.name, x)} />;
            if (i.kind === 'analog') return <Analog key={i.name} ctl={i} value={v as number} onChange={(x) => set(i.name, x)} />;
            return <Sensor key={i.name} ctl={i} value={v} onChange={(x) => set(i.name, x)} />;
          })}
        </div>
      </div>
      <div className="panel-section">
        <div className="panel-title">Ausgänge</div>
        <div className="panel-grid">
          {outputs.map((o) => {
            const v = plant.outputs[o.name];
            if (o.kind === 'analog') {
              const n = typeof v === 'number' ? v : 0;
              const pct = Math.max(0, Math.min(1, (n - (o.min ?? 0)) / ((o.max ?? 100) - (o.min ?? 0))));
              return (
                <div className="ctl analog" key={o.name}>
                  <div className="ctl-name">
                    {o.name} <span className="analog-val">{Math.round(n * 100) / 100}</span>
                    {o.unit && <span className="unit"> {o.unit}</span>}
                  </div>
                  <div className="bar">
                    <div className="bar-fill" style={{ width: `${pct * 100}%` }} />
                  </div>
                  <div className="ctl-label">{o.label}</div>
                </div>
              );
            }
            if (o.kind === 'motor') {
              return (
                <div className="ctl" key={o.name}>
                  <div className={`motor ${v ? 'on' : ''}`} aria-label={`${o.name} ${v ? 'läuft' : 'steht'}`}>
                    <svg viewBox="0 0 40 40" width="44" height="44">
                      <circle cx="20" cy="20" r="17" className="motor-ring" />
                      <text x="20" y="25" textAnchor="middle" className="motor-m">M</text>
                    </svg>
                  </div>
                  <div className="ctl-name">{o.name}</div>
                  <div className="ctl-label">{o.label}</div>
                </div>
              );
            }
            return <Lamp key={o.name} name={o.name} label={o.label} on={!!v} color={o.color ?? (o.kind === 'horn' ? 'red' : 'yellow')} />;
          })}
        </div>
      </div>
    </div>
  );
}
