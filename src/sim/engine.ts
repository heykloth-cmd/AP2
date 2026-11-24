import { compileProject, type CompileResult, type PouSource } from '../plc/compiler';
import { PlcRuntime } from '../plc/runtime';
import type { Plant, Value } from './types';

/** Zykluszeit der simulierten SPS in ms */
export const CYCLE_MS = 10;

/**
 * Verbindet SPS-Programm und Anlage: liest Eingänge, rechnet einen Zyklus, schreibt Ausgänge.
 */
export class Engine {
  rt: PlcRuntime;
  t = 0;

  constructor(
    public compiled: CompileResult,
    public plant: Plant,
    public inputNames: string[],
    public outputNames: string[],
  ) {
    this.rt = new PlcRuntime(compiled.project!);
  }

  static create(sources: PouSource[], globals: string, plant: Plant, inputs: string[], outputs: string[]): { engine?: Engine; result: CompileResult } {
    const result = compileProject(sources, globals);
    if (!result.ok) return { result };
    return { engine: new Engine(result, plant, inputs, outputs), result };
  }

  cycle() {
    const ins = this.plant.readInputs();
    for (const n of this.inputNames) {
      const v = ins[n];
      if (v !== undefined) this.rt.setGlobal(n, v);
    }
    this.rt.cycle(CYCLE_MS);
    this.t += CYCLE_MS;
    const outs: Record<string, Value> = {};
    for (const n of this.outputNames) outs[n] = this.rt.getGlobal(n) ?? false;
    this.plant.step(outs, CYCLE_MS, this.t);
  }

  run(ms: number) {
    const n = Math.max(1, Math.round(ms / CYCLE_MS));
    for (let i = 0; i < n; i++) {
      this.cycle();
      if (this.rt.error) return;
    }
  }
}
