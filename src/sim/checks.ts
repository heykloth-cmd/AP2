/**
 * Automatische Prüfung von Übungsaufgaben: Ein Test betätigt Taster,
 * wartet und vergleicht die Ausgänge – so wie ein Prüfer an der Anlage.
 */
import type { PouSource } from '../plc/compiler';
import type { Diagnostic } from '../plc/errors';
import { formatValue } from '../plc/runtime';
import { CYCLE_MS, Engine } from './engine';
import type { Plant, Value } from './types';

export class CheckFail extends Error {
  constructor(
    message: string,
    public hint?: string,
  ) {
    super(message);
  }
}

export class TestCtx {
  constructor(public e: Engine) {}

  get plant() {
    return this.e.plant;
  }

  /** Bedienelement setzen (Taster, Schalter, Sensor des Pults) */
  set(name: string, v: Value) {
    this.plant.operator[name] = v;
  }

  /** Taster kurz drücken */
  press(name: string, ms = 100) {
    this.set(name, true);
    this.wait(ms);
    this.set(name, false);
    this.wait(CYCLE_MS * 3);
  }

  wait(ms: number) {
    const n = Math.max(1, Math.round(ms / CYCLE_MS));
    for (let i = 0; i < n; i++) this.step();
  }

  step() {
    this.e.cycle();
    if (this.e.rt.error) throw new CheckFail('Die SPS ist in STOP gegangen: ' + this.e.rt.error.message, this.e.rt.error.hint);
    if (this.plant.fault) throw new CheckFail(this.plant.fault);
  }

  /** Wert einer globalen Variable oder eines Pfads (z. B. "T1.Q", "G_Auto_1.iStep") */
  get(name: string): Value | undefined {
    const g = this.e.rt.getGlobal(name);
    if (g !== undefined) return g;
    return this.e.rt.resolve(name);
  }

  expect(name: string, v: Value, hint?: string, what?: string) {
    const actual = this.get(name);
    if (actual !== v) {
      throw new CheckFail(`${what ?? name} sollte ${formatValue(v)} sein, ist aber ${formatValue(actual)}.`, hint);
    }
  }

  /** Warten, bis eine Bedingung erfüllt ist */
  until(pred: () => boolean, timeoutMs: number, failMsg: string, hint?: string): number {
    const start = this.e.t;
    while (this.e.t - start <= timeoutMs) {
      if (pred()) return this.e.t - start;
      this.step();
    }
    throw new CheckFail(failMsg, hint);
  }

  /** Bedingung muss über eine Zeitspanne dauernd gelten */
  hold(ms: number, pred: () => boolean, failMsg: string, hint?: string) {
    const start = this.e.t;
    while (this.e.t - start < ms) {
      if (!pred()) throw new CheckFail(`${failMsg} (nach ${((this.e.t - start) / 1000).toFixed(2)} s)`, hint);
      this.step();
    }
  }
}

export interface Check {
  name: string;
  run(t: TestCtx): void;
}

export interface CheckResult {
  name: string;
  ok: boolean;
  message?: string;
  hint?: string;
}

export interface CheckRun {
  compiled: boolean;
  diagnostics: Diagnostic[];
  results: CheckResult[];
  passed: boolean;
}

export function runChecks(
  sources: PouSource[],
  globals: string,
  makePlant: () => Plant,
  inputs: string[],
  outputs: string[],
  checks: Check[],
): CheckRun {
  const first = Engine.create(sources, globals, makePlant(), inputs, outputs);
  if (!first.engine) {
    return { compiled: false, diagnostics: first.result.diagnostics, results: [], passed: false };
  }
  const results: CheckResult[] = [];
  for (const c of checks) {
    // Jeder Test startet mit frisch eingeschalteter SPS und Anlage
    const { engine } = Engine.create(sources, globals, makePlant(), inputs, outputs);
    const ctx = new TestCtx(engine!);
    try {
      ctx.wait(CYCLE_MS * 2);
      c.run(ctx);
      results.push({ name: c.name, ok: true });
    } catch (e) {
      if (e instanceof CheckFail) results.push({ name: c.name, ok: false, message: e.message, hint: e.hint });
      else results.push({ name: c.name, ok: false, message: 'Interner Fehler im Test: ' + String(e) });
    }
  }
  return { compiled: true, diagnostics: first.result.diagnostics, results, passed: results.every((r) => r.ok) };
}
