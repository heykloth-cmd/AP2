import type { InputCtl, LampColor, OutputInd, PanelConfig } from '../sim/types';
import type { Scenario } from './types';

let inIdx = 0;
let outIdx = 0;

/** Eingänge/Ausgänge kurz beschreiben – Adressen werden wie bei eurer AXC 1050 vergeben */
export function panel(inputs: Omit<InputCtl, 'address'>[], outputs: Omit<OutputInd, 'address'>[]): Scenario {
  inIdx = 0;
  outIdx = 0;
  const p: PanelConfig = {
    inputs: inputs.map((i) => {
      const a = i.type === 'INT' ? `%IW${8 + 2 * inIdx++}` : `%IX${Math.floor(inIdx / 8)}.${inIdx++ % 8}`;
      return { ...i, address: a };
    }),
    outputs: outputs.map((o) => {
      const a = o.type === 'INT' ? `%QW${10 + 2 * outIdx++}` : `%QX${4 + Math.floor(outIdx / 8)}.${outIdx++ % 8}`;
      return { ...o, address: a };
    }),
  };
  return { kind: 'panel', panel: p };
}

export const btn = (name: string, label: string): Omit<InputCtl, 'address'> => ({ name, label, kind: 'button' });
export const nc = (name: string, label: string): Omit<InputCtl, 'address'> => ({ name, label, kind: 'buttonNC' });
export const sw = (name: string, label: string): Omit<InputCtl, 'address'> => ({ name, label, kind: 'switch' });
export const sens = (name: string, label: string): Omit<InputCtl, 'address'> => ({ name, label, kind: 'sensor' });
export const ana = (name: string, label: string, max = 27648): Omit<InputCtl, 'address'> => ({ name, label, kind: 'analog', type: 'INT', min: 0, max });
export const lamp = (name: string, label: string, color: LampColor = 'green'): Omit<OutputInd, 'address'> => ({ name, label, kind: 'lamp', color });
export const motor = (name: string, label: string): Omit<OutputInd, 'address'> => ({ name, label, kind: 'motor' });
export const valve = (name: string, label: string): Omit<OutputInd, 'address'> => ({ name, label, kind: 'valve', color: 'blue' });
