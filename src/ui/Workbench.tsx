import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { compileProject, type PouSource } from '../plc/compiler';
import type { Diagnostic } from '../plc/errors';
import { formatValue } from '../plc/runtime';
import { makePlant, scenarioGlobals, scenarioIo } from '../content/setup';
import type { WorkbenchSetup } from '../content/types';
import { AchsePlant } from '../sim/achse';
import { runChecks, type CheckRun } from '../sim/checks';
import { CYCLE_MS, Engine } from '../sim/engine';
import { PanelPlant } from '../sim/panel';
import type { Plant } from '../sim/types';
import { getProgress, update } from '../state/progress';
import { AchseView } from './AchseView';
import { CodeEditor } from './CodeEditor';
import { Grafcet } from './Grafcet';
import { PanelView } from './PanelView';
import { CodeBlock } from './CodeBlock';

interface Props {
  setup: WorkbenchSetup;
  /** wird aufgerufen, wenn alle Prüfungen bestanden sind */
  onPassed?: (firstTime: boolean) => void;
  onFailed?: () => void;
  /** Platz für Aufgabentext usw. oberhalb (auf dem Handy als eigener Reiter) */
  taskPane?: React.ReactNode;
  hints?: string[];
}

type View = 'aufgabe' | 'code' | 'anlage' | 'werte' | 'pruefen';

function useIsWide() {
  const q = '(min-width: 1000px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const h = () => setWide(m.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, []);
  return wide;
}

export function Workbench({ setup, onPassed, onFailed, taskPane, hints = [] }: Props) {
  const wide = useIsWide();
  const globals = useMemo(() => scenarioGlobals(setup.scenario), [setup.scenario]);
  const io = useMemo(() => scenarioIo(setup.scenario), [setup.scenario]);

  const [sources, setSources] = useState<PouSource[]>(() => {
    const saved = getProgress().code[setup.id];
    if (saved && saved.length === setup.pous.length && saved.every((s, i) => s.name === setup.pous[i]!.name)) {
      return setup.pous.map((p, i) => (p.readonly ? p : { ...p, vars: saved[i]!.vars, code: saved[i]!.code }));
    }
    return setup.pous;
  });
  const [activePou, setActivePou] = useState(() => setup.focusPou ?? setup.pous.find((p) => !p.readonly)?.name ?? setup.pous[0]!.name);
  const [part, setPart] = useState<'code' | 'vars' | 'globals'>('code');
  const [diags, setDiags] = useState<Diagnostic[]>([]);
  const [focusLine, setFocusLine] = useState<{ line: number; n: number }>();
  const [view, setView] = useState<View>(taskPane ? 'aufgabe' : 'code');
  const [running, setRunning] = useState(false);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [checkRun, setCheckRun] = useState<CheckRun | null>(null);
  const [checking, setChecking] = useState(false);
  const [hintN, setHintN] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [gcIdx, setGcIdx] = useState(0);
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  const plantRef = useRef<Plant>(makePlant(setup.scenario));
  const engineRef = useRef<Engine | null>(null);

  // Code speichern
  useEffect(() => {
    const t = setTimeout(() => {
      update((p) => {
        p.code[setup.id] = sources.map((s) => ({ name: s.name, kind: s.kind, vars: s.vars, code: s.code }));
      });
    }, 400);
    return () => clearTimeout(t);
  }, [sources, setup.id]);

  // Live-Prüfung beim Tippen
  useEffect(() => {
    const t = setTimeout(() => setDiags(compileProject(sources, globals).diagnostics), 350);
    return () => clearTimeout(t);
  }, [sources, globals]);

  // Simulationsschleife
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let frame = 0;
    const loop = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      acc += dt * speed;
      const e = engineRef.current;
      if (e) {
        let n = 0;
        while (acc >= CYCLE_MS && n < 2000) {
          e.cycle();
          acc -= CYCLE_MS;
          n++;
          if (e.rt.error) break;
        }
        if (e.rt.error) {
          setRunning(false);
          rerender();
          return;
        }
      }
      if (++frame % 2 === 0) rerender();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, speed]);

  const src = sources.find((s) => s.name === activePou) ?? sources[0]!;
  const editable = !src.readonly;
  const changed = loaded !== null && loaded !== JSON.stringify(sources);
  const errors = diags.filter((d) => d.severity === 'error');

  const setText = (v: string) => {
    setSources((list) => list.map((s) => (s.name === src.name ? { ...s, [part === 'vars' ? 'vars' : 'code']: v } : s)));
  };

  const start = useCallback(() => {
    const res = compileProject(sources, globals);
    setDiags(res.diagnostics);
    if (!res.ok) {
      const first = res.diagnostics.find((d) => d.severity === 'error')!;
      if (first.pou && first.pou !== 'Globale Variablen') setActivePou(first.pou);
      setPart(first.part === 'vars' ? 'vars' : 'code');
      setFocusLine({ line: first.line, n: Date.now() });
      if (!wide) setView('code');
      return;
    }
    engineRef.current = new Engine(res, plantRef.current, io.inputs, io.outputs);
    setLoaded(JSON.stringify(sources));
    setRunning(true);
    if (!wide) setView('anlage');
  }, [sources, globals, io, wide]);

  const stop = () => {
    setRunning(false);
    // SPS im STOP: Ausgänge werden abgeschaltet
    const off: Record<string, boolean> = {};
    for (const o of io.outputs) off[o] = false;
    plantRef.current.step(off, 0, engineRef.current?.t ?? 0);
    rerender();
  };

  const singleCycle = () => {
    if (!engineRef.current || changed || loaded === null) {
      const res = compileProject(sources, globals);
      setDiags(res.diagnostics);
      if (!res.ok) return;
      engineRef.current = new Engine(res, plantRef.current, io.inputs, io.outputs);
      setLoaded(JSON.stringify(sources));
    }
    engineRef.current!.cycle();
    rerender();
  };

  const resetPlant = () => {
    plantRef.current.reset();
    if (engineRef.current) engineRef.current.plant = plantRef.current;
    rerender();
  };

  const coldStart = () => {
    const res = compileProject(sources, globals);
    if (!res.ok) return start();
    engineRef.current = new Engine(res, plantRef.current, io.inputs, io.outputs);
    setLoaded(JSON.stringify(sources));
    rerender();
  };

  const check = () => {
    if (!setup.checks) return;
    setChecking(true);
    setTimeout(() => {
      const r = runChecks(sources, globals, () => makePlant(setup.scenario), io.inputs, io.outputs, setup.checks!);
      setCheckRun(r);
      setChecking(false);
      if (!wide) setView('pruefen');
      if (r.passed) {
        const first = !getProgress().exercisesDone[setup.id];
        update((p) => {
          if (!p.exercisesDone[setup.id]) p.exercisesDone[setup.id] = Date.now();
        });
        onPassed?.(first);
      } else {
        update((p) => {
          p.attempts[setup.id] = (p.attempts[setup.id] ?? 0) + 1;
        });
        onFailed?.();
        if (!r.compiled) {
          const first = r.diagnostics.find((d) => d.severity === 'error');
          if (first) {
            if (first.pou && first.pou !== 'Globale Variablen') setActivePou(first.pou);
            setPart(first.part === 'vars' ? 'vars' : 'code');
          }
        }
      }
    }, 30);
  };

  const resetCode = () => {
    if (!confirm('Deinen Code für diese Aufgabe auf den Anfang zurücksetzen?')) return;
    setSources(setup.pous);
    setCheckRun(null);
  };

  const applySolution = () => {
    if (!setup.solution) return;
    if (!confirm('Musterlösung in den Editor übernehmen? Dein bisheriger Code wird ersetzt.')) return;
    setSources(setup.pous.map((p) => setup.solution!.find((s) => s.name === p.name) ?? p));
    setShowSolution(false);
  };

  const attempts = getProgress().attempts[setup.id] ?? 0;
  const plant = plantRef.current;
  const rt = engineRef.current?.rt;
  const gc = setup.grafcets?.[gcIdx];
  const gcActive = gc?.stepVar && rt ? (rt.resolve(gc.stepVar) as number | undefined) : undefined;

  // ---------- Teilbereiche ----------
  const editorPane = (
    <div className="wb-editor">
      {sources.length > 1 && (
        <div className="pou-tabs" role="tablist" aria-label="Bausteine">
          {sources.map((s) => {
            const errs = diags.filter((d) => d.pou === s.name && d.severity === 'error').length;
            return (
              <button key={s.name} role="tab" aria-selected={s.name === activePou} className={`pou-tab ${s.name === activePou ? 'active' : ''}`} onClick={() => setActivePou(s.name)}>
                <span className="pou-kind">{s.kind === 'PROGRAM' ? 'PRG' : 'FB'}</span> {s.name}
                {errs > 0 && <span className="err-dot">{errs}</span>}
                {s.readonly && <span className="lock" title="vorgegeben">🔒</span>}
              </button>
            );
          })}
        </div>
      )}
      <div className="part-tabs" role="tablist" aria-label="Arbeitsblatt">
        <button role="tab" aria-selected={part === 'code'} className={part === 'code' ? 'active' : ''} onClick={() => setPart('code')}>
          Code
        </button>
        <button role="tab" aria-selected={part === 'vars'} className={part === 'vars' ? 'active' : ''} onClick={() => setPart('vars')}>
          Variablen
        </button>
        <button role="tab" aria-selected={part === 'globals'} className={part === 'globals' ? 'active' : ''} onClick={() => setPart('globals')}>
          Global
        </button>
      </div>
      {part === 'globals' ? (
        <>
          <p className="muted small pad">Globale Variablen mit Adressen – wie im Ordner „Global_Variables“ eures PC-WORX-Projekts. Hier nur zum Nachschauen.</p>
          <CodeEditor value={globals} onChange={() => {}} readOnly label="Globale Variablen" keybar={false} />
        </>
      ) : (
        <CodeEditor
          key={src.name + part}
          value={part === 'vars' ? src.vars : src.code}
          onChange={setText}
          readOnly={!editable}
          diagnostics={diags.filter((d) => (d.pou ?? 'Main') === src.name && (d.part ?? 'code') === part)}
          keybar={part === 'vars' ? 'vars' : 'code'}
          label={`${src.name} – ${part === 'vars' ? 'Variablen' : 'Code'}`}
          minLines={part === 'vars' ? 6 : 12}
          focusLine={focusLine}
        />
      )}
      <DiagList
        diags={diags}
        onPick={(d) => {
          if (d.pou && d.pou !== 'Globale Variablen') setActivePou(d.pou);
          setPart(d.part === 'vars' ? 'vars' : 'code');
          setFocusLine({ line: d.line, n: Date.now() });
        }}
      />
    </div>
  );

  const plantPane = (
    <div className="wb-plant">
      {plant instanceof AchsePlant ? <AchseView plant={plant} onOperate={rerender} /> : <PanelView plant={plant as PanelPlant} onOperate={rerender} />}
      {rt?.error && (
        <div className="callout warn">
          <div className="callout-title">SPS in STOP</div>
          {rt.error.message}
          {rt.error.pos && ` (Zeile ${rt.error.pos.line})`}
          {rt.error.hint && <div className="muted">{rt.error.hint}</div>}
        </div>
      )}
      {gc && (
        <div className="wb-grafcet">
          {setup.grafcets!.length > 1 && (
            <div className="seg small">
              {setup.grafcets!.map((g, i) => (
                <button key={g.name} className={i === gcIdx ? 'active' : ''} onClick={() => setGcIdx(i)}>
                  {g.name}
                </button>
              ))}
            </div>
          )}
          <Grafcet def={gc} active={gcActive} compact />
          {gc.stepVar && <p className="muted small">Der grüne Punkt zeigt den aktiven Schritt (Variable {gc.stepVar}).</p>}
        </div>
      )}
    </div>
  );

  const watchPane = <Monitor engine={engineRef.current} />;

  const checkPane = setup.checks ? (
    <div className="wb-checks">
      <button className="btn primary wide" onClick={check} disabled={checking}>
        {checking ? 'Prüfe …' : '✓ Programm prüfen'}
      </button>
      {checkRun && <CheckResults run={checkRun} onPick={(d) => { if (d.pou) setActivePou(d.pou); setPart(d.part === 'vars' ? 'vars' : 'code'); setFocusLine({ line: d.line, n: Date.now() }); if (!wide) setView('code'); }} />}
      {hints.length > 0 && (
        <div className="hints">
          {hints.slice(0, hintN).map((h, i) => (
            <div key={i} className="callout tip">
              <div className="callout-title">Tipp {i + 1}</div>
              {h}
            </div>
          ))}
          {hintN < hints.length && (
            <button className="btn ghost" onClick={() => setHintN(hintN + 1)}>
              💡 {hintN === 0 ? 'Tipp anzeigen' : 'Noch ein Tipp'}
            </button>
          )}
        </div>
      )}
      {setup.solution && (
        <div className="solution-area">
          {!showSolution ? (
            <button className="btn ghost" onClick={() => (attempts >= 2 || getProgress().exercisesDone[setup.id] || confirm('Erst selbst probieren lohnt sich! Trotzdem die Lösung zeigen?')) && setShowSolution(true)}>
              👀 Musterlösung ansehen
            </button>
          ) : (
            <div className="solution">
              {setup.solution
                .filter((s) => !setup.pous.find((p) => p.name === s.name)?.readonly)
                .map((s) => (
                  <div key={s.name}>
                    <h4>
                      {s.name} – Variablen
                    </h4>
                    <CodeBlock code={s.vars} />
                    <h4>{s.name} – Code</h4>
                    <CodeBlock code={s.code} />
                  </div>
                ))}
              <button className="btn" onClick={applySolution}>
                Lösung in den Editor übernehmen
              </button>
            </div>
          )}
        </div>
      )}
      <button className="btn ghost small" onClick={resetCode}>
        ↺ Code zurücksetzen
      </button>
    </div>
  ) : null;

  const toolbar = (
    <div className="wb-toolbar">
      <div className={`plc-state ${running ? 'run' : 'stop'}`} aria-live="polite">
        <span className="plc-led" />
        {running ? 'RUN' : 'STOP'}
      </div>
      {!running ? (
        <button className="btn primary" onClick={start} title="Übersetzen, laden und starten">
          ▶ Start
        </button>
      ) : (
        <button className="btn" onClick={stop}>
          ■ Stopp
        </button>
      )}
      {running && changed && (
        <button className="btn warn" onClick={start} title="Geänderten Code neu übersetzen und laden">
          ⟳ Neu laden
        </button>
      )}
      {!running && (
        <button className="btn ghost" onClick={singleCycle} title="Genau einen SPS-Zyklus ausführen">
          1 Zyklus
        </button>
      )}
      <button className="btn ghost" onClick={coldStart} title="Kaltstart: alle Variablen auf Startwert">
        Kaltstart
      </button>
      <button className="btn ghost" onClick={resetPlant} title="Anlage in den Ausgangszustand">
        Anlage ↺
      </button>
      <label className="speed">
        <span className="sr">Geschwindigkeit</span>
        <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
          <option value={0.25}>¼×</option>
          <option value={0.5}>½×</option>
          <option value={1}>1×</option>
          <option value={2}>2×</option>
          <option value={5}>5×</option>
        </select>
      </label>
      <span className="status-chip">
        {errors.length > 0 ? <span className="bad">{errors.length} Fehler</span> : <span className="good">fehlerfrei</span>}
        {engineRef.current && <span className="muted"> · {(engineRef.current.t / 1000).toFixed(1)} s</span>}
      </span>
    </div>
  );

  if (wide) {
    return (
      <div className="wb wide">
        {toolbar}
        <div className="wb-grid">
          <div className="wb-left">
            {taskPane && <div className="wb-task">{taskPane}</div>}
            {editorPane}
          </div>
          <div className="wb-right">
            {plantPane}
            {checkPane}
            <details className="wb-watch" open>
              <summary>Online-Werte (wie „Debug ein“ in PC WORX)</summary>
              {watchPane}
            </details>
          </div>
        </div>
      </div>
    );
  }

  const views: { id: View; label: string }[] = [
    ...(taskPane ? [{ id: 'aufgabe' as View, label: 'Aufgabe' }] : []),
    { id: 'code', label: errors.length ? `Code (${errors.length})` : 'Code' },
    { id: 'anlage', label: 'Anlage' },
    { id: 'werte', label: 'Werte' },
    ...(setup.checks ? [{ id: 'pruefen' as View, label: checkRun?.passed ? 'Prüfen ✓' : 'Prüfen' }] : []),
  ];

  return (
    <div className="wb narrow">
      <div className="seg wb-views" role="tablist">
        {views.map((v) => (
          <button key={v.id} role="tab" aria-selected={view === v.id} className={view === v.id ? 'active' : ''} onClick={() => setView(v.id)}>
            {v.label}
          </button>
        ))}
      </div>
      {toolbar}
      {view === 'aufgabe' && <div className="wb-task">{taskPane}</div>}
      {view === 'code' && editorPane}
      {view === 'anlage' && plantPane}
      {view === 'werte' && watchPane}
      {view === 'pruefen' && checkPane}
    </div>
  );
}

function DiagList({ diags, onPick }: { diags: Diagnostic[]; onPick: (d: Diagnostic) => void }) {
  if (diags.length === 0) return null;
  const sorted = [...diags].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
  return (
    <div className="diags" aria-live="polite">
      {sorted.slice(0, 6).map((d, i) => (
        <button key={i} className={`diag ${d.severity}`} onClick={() => onPick(d)}>
          <span className="diag-icon">{d.severity === 'error' ? '✖' : '⚠'}</span>
          <span className="diag-body">
            <span className="diag-where">
              {d.pou ?? 'Main'} · {d.part === 'vars' ? 'Variablen' : 'Code'} · Zeile {d.line}
            </span>
            <span className="diag-msg">{d.message}</span>
            {d.hint && <span className="diag-hint">{d.hint}</span>}
          </span>
        </button>
      ))}
      {sorted.length > 6 && <div className="muted small">… und {sorted.length - 6} weitere</div>}
    </div>
  );
}

function CheckResults({ run, onPick }: { run: CheckRun; onPick: (d: Diagnostic) => void }) {
  if (!run.compiled) {
    return (
      <div className="check-results">
        <div className="callout warn">
          <div className="callout-title">Das Programm lässt sich noch nicht übersetzen</div>
          Behebe zuerst die Fehler:
        </div>
        <DiagList diags={run.diagnostics.filter((d) => d.severity === 'error')} onPick={onPick} />
      </div>
    );
  }
  const passed = run.results.filter((r) => r.ok).length;
  return (
    <div className="check-results">
      <div className={`check-summary ${run.passed ? 'ok' : 'bad'}`}>
        {run.passed ? '🎉 Alles richtig!' : `${passed} von ${run.results.length} Prüfungen bestanden`}
      </div>
      <ul className="check-list">
        {run.results.map((r, i) => (
          <li key={i} className={r.ok ? 'ok' : 'bad'}>
            <span className="ci">{r.ok ? '✓' : '✗'}</span>
            <div>
              <div className="cn">{r.name}</div>
              {!r.ok && r.message && <div className="cm">{r.message}</div>}
              {!r.ok && r.hint && <div className="ch">💡 {r.hint}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Monitor({ engine }: { engine: Engine | null }) {
  const [showIo, setShowIo] = useState(false);
  if (!engine) return <p className="muted pad">Starte das Programm (▶ Start), dann siehst du hier alle Werte live – wie im Debug-Modus von PC WORX.</p>;
  const list = engine.rt.watchList();
  const globals = engine.rt.project.globals;
  return (
    <div className="monitor">
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Typ</th>
            <th>Wert</th>
          </tr>
        </thead>
        <tbody>
          {list.map((w) => (
            <tr key={w.path} className={`d${Math.min(w.depth, 3)}`}>
              <td className="mono">{w.path}</td>
              <td className="muted">{w.type}</td>
              <td>
                <Val v={w.value} type={w.type} />
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan={3} className="muted">
                Keine eigenen Variablen.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <button className="btn ghost small" onClick={() => setShowIo(!showIo)}>
        {showIo ? 'Ein-/Ausgänge ausblenden' : 'Ein-/Ausgänge anzeigen'}
      </button>
      {showIo && (
        <table>
          <tbody>
            {globals.map((g) => (
              <tr key={g.upper}>
                <td className="mono">{g.name}</td>
                <td className="muted">{g.address}</td>
                <td>
                  <Val v={engine.rt.globals[g.upper]!} type={g.typeName} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Val({ v, type }: { v: boolean | number; type: string }) {
  if (typeof v === 'boolean') return <span className={`bool ${v ? 't' : 'f'}`}>{v ? 'TRUE' : 'FALSE'}</span>;
  return <span className="mono">{formatValue(v, type)}</span>;
}
