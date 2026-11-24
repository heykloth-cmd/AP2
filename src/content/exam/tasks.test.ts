import { runChecks } from '../../sim/checks';
import { exerciseSetup, makePlant, scenarioGlobals, scenarioIo } from '../setup';
import { EXAM_TASKS } from './tasks';

describe.each(EXAM_TASKS.map((e) => [e.id, e] as const))('Prüfungsaufgabe %s', (_id, ex) => {
  const setup = exerciseSetup(ex);
  const globals = scenarioGlobals(ex.scenario);
  const io = scenarioIo(ex.scenario);

  it('Musterlösung besteht', () => {
    const r = runChecks(setup.solution!, globals, () => makePlant(ex.scenario), io.inputs, io.outputs, ex.checks);
    const msgs = [...r.diagnostics.map((d) => `${d.severity} ${d.pou} ${d.part} ${d.line}: ${d.message}`), ...r.results.filter((x) => !x.ok).map((x) => `${x.name}: ${x.message}`)];
    expect(msgs).toEqual([]);
  });

  it('Startcode kompiliert, besteht aber nicht', () => {
    const r = runChecks(setup.pous, globals, () => makePlant(ex.scenario), io.inputs, io.outputs, ex.checks);
    expect(r.diagnostics.filter((d) => d.severity === 'error').map((d) => `${d.pou} ${d.line}: ${d.message}`)).toEqual([]);
    expect(r.passed).toBe(false);
  });
});
