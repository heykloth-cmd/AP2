import type { Value } from '../plc/stdlib';

export type { Value };

export type InputKind = 'switch' | 'button' | 'buttonNC' | 'sensor' | 'analog';
export type LampColor = 'green' | 'red' | 'yellow' | 'white' | 'blue';

export interface InputCtl {
  name: string;
  label: string;
  kind: InputKind;
  address: string;
  /** Datentyp in der SPS (Standard BOOL) */
  type?: 'BOOL' | 'INT';
  min?: number;
  max?: number;
  unit?: string;
  initial?: Value;
}

export interface OutputInd {
  name: string;
  label: string;
  kind: 'lamp' | 'motor' | 'valve' | 'horn' | 'analog';
  address: string;
  type?: 'BOOL' | 'INT';
  color?: LampColor;
  min?: number;
  max?: number;
  unit?: string;
}

export interface PlantEvent {
  t: number;
  level: 'info' | 'warn' | 'fault';
  text: string;
}

/** Eine Anlage, die von der SPS gesteuert wird */
export interface Plant {
  /** Bedienelemente, die der Mensch betätigt (Taster, Schalter …) */
  operator: Record<string, Value>;
  /** Sensorwerte/Eingänge für die SPS (Eingangsabbild) */
  readInputs(): Record<string, Value>;
  /** Ausgangsabbild übernehmen und die Physik um dt ms weiterrechnen */
  step(outputs: Record<string, Value>, dt: number, now: number): void;
  /** letzte Ausgänge (für Anzeige) */
  outputs: Record<string, Value>;
  events: PlantEvent[];
  /** schwerer Fehler (Crash usw.) → Test schlägt fehl */
  fault?: string;
  /** Kopie für Rücksetzen */
  reset(): void;
}

export interface PanelConfig {
  inputs: InputCtl[];
  outputs: OutputInd[];
}

/** Globale Variablenliste (wie in PC WORX) aus Ein-/Ausgängen erzeugen */
export function globalsText(inputs: { name: string; address: string; type?: string; label: string }[], outputs: { name: string; address: string; type?: string; label: string }[], extra = ''): string {
  const line = (x: { name: string; address: string; type?: string; label: string }) => `\t${x.name}\tAT ${x.address} :\t${x.type ?? 'BOOL'};\t(* ${x.label} *)`;
  return `(* Eingänge *)\nVAR_GLOBAL\n${inputs.map(line).join('\n')}\nEND_VAR\n\n(* Ausgänge *)\nVAR_GLOBAL\n${outputs.map(line).join('\n')}\nEND_VAR\n${extra}`;
}

/** VAR_EXTERNAL-Block für einen Baustein */
export function externalsText(items: { name: string; type?: string; label?: string }[]): string {
  return `VAR_EXTERNAL\n${items.map((x) => `\t${x.name} : ${x.type ?? 'BOOL'};${x.label ? `\t(* ${x.label} *)` : ''}`).join('\n')}\nEND_VAR`;
}
