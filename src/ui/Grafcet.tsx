/**
 * Einfache GRAFCET-Darstellung (Schritte, Transitionen, Aktionen) mit Live-Markierung.
 * Bedingungen: "*" = UND, "+" = ODER, "!X" = X negiert (Überstrich), ↑/↓ = Flanke.
 */
import { Fragment, type ReactNode } from 'react';

export interface GAction {
  text: string;
  /** Zuweisungsbedingung über der Aktion */
  cond?: string;
  /** gespeicherte Aktion: bei Aktivierung (↑) oder bei Ereignis */
  stored?: 'activate' | 'event';
  /** Zwangssteuerung */
  force?: boolean;
}

export interface GStep {
  id: number;
  initial?: boolean;
  actions?: GAction[];
}

export interface GTrans {
  from: number;
  to: number;
  cond: string;
}

export interface GrafcetDef {
  name: string;
  steps: GStep[];
  transitions: GTrans[];
  /** Pfad zur Schrittvariable in der Simulation, z. B. "G_Auto_1.iStep" */
  stepVar?: string;
  note?: string;
}

/** Bedingungstext mit Überstrichen darstellen */
export function Cond({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const re = /!\(([^)]*)\)|!([A-Za-z0-9_.]+(?:\s*\/\s*[A-Za-z0-9_.]+)?)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <span key={k++} className="ovl">
        {m[1] ?? m[2]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className="gc-cond">{parts}</span>;
}

export function Grafcet({ def, active, compact }: { def: GrafcetDef; active?: number; compact?: boolean }) {
  const ids = def.steps.map((s) => s.id);
  return (
    <div className={`gc ${compact ? 'compact' : ''}`}>
      <div className="gc-body">
        {def.steps.map((s, idx) => {
          const outs = def.transitions.filter((t) => t.from === s.id);
          const next = ids[idx + 1];
          return (
            <Fragment key={s.id}>
              <div className="gc-row">
                <div className={`gc-step ${s.initial ? 'initial' : ''} ${active === s.id ? 'active' : ''}`}>
                  <span>{s.id}</span>
                  {active === s.id && <span className="gc-token" aria-label="aktiv" />}
                </div>
                {s.actions && s.actions.length > 0 && (
                  <div className="gc-actions">
                    {s.actions.map((a, j) => (
                      <div key={j} className={`gc-action ${a.force ? 'force' : ''}`}>
                        {(a.cond || a.stored) && (
                          <div className="gc-acond">
                            {a.stored === 'activate' && <span className="gc-arrow">↑</span>}
                            {a.cond && <Cond text={a.cond} />}
                          </div>
                        )}
                        <div className="gc-atext">{a.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {outs.map((t, j) => {
                const isNext = t.to === next;
                const back = ids.indexOf(t.to) <= idx;
                return (
                  <div key={j} className={`gc-trans ${isNext ? '' : 'jump'}`}>
                    <span className="gc-bar" />
                    <Cond text={t.cond} />
                    {!isNext && <span className="gc-jump">{back ? '↩' : '↪'} Schritt {t.to}</span>}
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
      <div className="gc-name">{def.name}</div>
      {def.note && <div className="gc-note">{def.note}</div>}
    </div>
  );
}
