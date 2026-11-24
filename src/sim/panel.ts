import type { PanelConfig, Plant, PlantEvent, Value } from './types';

/** Einfaches Bedienpult: Taster/Schalter → Eingänge, Ausgänge → Lampen */
export class PanelPlant implements Plant {
  operator: Record<string, Value> = {};
  outputs: Record<string, Value> = {};
  events: PlantEvent[] = [];
  fault?: string;

  constructor(public config: PanelConfig) {
    this.reset();
  }

  reset() {
    this.operator = {};
    for (const i of this.config.inputs) {
      this.operator[i.name] = i.initial ?? (i.kind === 'analog' ? (i.min ?? 0) : false);
    }
    this.outputs = {};
    this.events = [];
    this.fault = undefined;
  }

  readInputs() {
    const r: Record<string, Value> = {};
    for (const i of this.config.inputs) {
      const v = this.operator[i.name]!;
      // Öffner: nicht betätigt = TRUE (Drahtbruchsicherheit)
      r[i.name] = i.kind === 'buttonNC' ? !v : v;
    }
    return r;
  }

  step(outputs: Record<string, Value>) {
    this.outputs = outputs;
  }
}
