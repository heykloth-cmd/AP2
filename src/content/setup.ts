import type { PouSource } from '../plc/compiler';
import { AchsePlant, ACHSE_GLOBALS, ACHSE_INPUTS, ACHSE_OUTPUTS } from '../sim/achse';
import { PanelPlant } from '../sim/panel';
import { externalsText, globalsText, type Plant } from '../sim/types';
import type { Exercise, Scenario, WorkbenchSetup } from './types';

export function scenarioGlobals(s: Scenario): string {
  if (s.kind === 'achse') return ACHSE_GLOBALS;
  return globalsText(s.panel.inputs, s.panel.outputs);
}

export function scenarioIo(s: Scenario): { inputs: string[]; outputs: string[] } {
  if (s.kind === 'achse') return { inputs: ACHSE_INPUTS.map((i) => i.name), outputs: ACHSE_OUTPUTS.map((o) => o.name) };
  return { inputs: s.panel.inputs.map((i) => i.name), outputs: s.panel.outputs.map((o) => o.name) };
}

export function makePlant(s: Scenario): Plant {
  if (s.kind === 'achse') return new AchsePlant(s.variante);
  return new PanelPlant(s.panel);
}

/** VAR_EXTERNAL für alle Ein-/Ausgänge des Pults */
export function panelExternals(s: Scenario): string {
  if (s.kind !== 'panel') return '';
  return externalsText([...s.panel.inputs, ...s.panel.outputs].map((x) => ({ name: x.name, type: x.type ?? 'BOOL', label: x.label })));
}

export function mainVars(s: Scenario, own?: string): string {
  const ext = panelExternals(s);
  return `${ext}\n\n${own ?? 'VAR\n\t\nEND_VAR'}`.trim() + '\n';
}

export function exerciseSetup(ex: Exercise): WorkbenchSetup {
  const pous: PouSource[] = ex.pous ?? [{ name: 'Main', kind: 'PROGRAM', vars: mainVars(ex.scenario, ex.vars), code: ex.code ?? '' }];
  const solution: PouSource[] = ex.solPous
    ? pous.map((p) => ex.solPous!.find((s) => s.name === p.name) ?? p)
    : [{ name: 'Main', kind: 'PROGRAM', vars: mainVars(ex.scenario, ex.solVars), code: ex.solCode }];
  return {
    id: ex.id,
    scenario: ex.scenario,
    pous,
    focusPou: ex.focusPou,
    checks: ex.checks,
    solution,
    grafcets: ex.grafcets,
  };
}
