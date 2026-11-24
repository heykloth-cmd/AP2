import { runChecks } from '../sim/checks';
import { EXERCISES } from './exercises';
import { exerciseSetup, makePlant, scenarioGlobals, scenarioIo } from './setup';

describe.each(EXERCISES.map((e) => [e.id, e] as const))('Übung %s', (_id, ex) => {
  const setup = exerciseSetup(ex);
  const globals = scenarioGlobals(ex.scenario);
  const io = scenarioIo(ex.scenario);

  it('Musterlösung besteht alle Prüfungen ohne Warnungen', () => {
    const r = runChecks(setup.solution!, globals, () => makePlant(ex.scenario), io.inputs, io.outputs, ex.checks);
    const msgs = [...r.diagnostics.map((d) => `${d.severity} ${d.pou} ${d.part} ${d.line}: ${d.message}`), ...r.results.filter((x) => !x.ok).map((x) => `${x.name}: ${x.message}`)];
    expect(msgs).toEqual([]);
    expect(r.passed).toBe(true);
  });

  it('Startcode besteht nicht', () => {
    const r = runChecks(setup.pous, globals, () => makePlant(ex.scenario), io.inputs, io.outputs, ex.checks);
    expect(r.passed).toBe(false);
  });
});
