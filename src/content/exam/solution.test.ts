import { AchsePlant, ACHSE_GLOBALS, ACHSE_INPUTS, ACHSE_OUTPUTS } from '../../sim/achse';
import { Engine } from '../../sim/engine';
import { TestCtx } from '../../sim/checks';
import { solutionSources } from './solution';

const ins = ACHSE_INPUTS.map((i) => i.name);
const outs = ACHSE_OUTPUTS.map((o) => o.name);

function setup(variante: 'vorbereitung' | 'bereitstellung') {
  const plant = new AchsePlant(variante);
  const { engine, result } = Engine.create(solutionSources(variante), ACHSE_GLOBALS, plant, ins, outs);
  if (!engine) throw new Error(result.diagnostics.map((d) => `${d.pou} ${d.line}: ${d.message}`).join('\n'));
  const warnings = result.diagnostics.filter((d) => d.severity === 'warning');
  return { plant, t: new TestCtx(engine), warnings };
}

describe('Musterlösung Achsenmodell', () => {
  it('kompiliert ohne Warnungen', () => {
    const { warnings } = setup('vorbereitung');
    expect(warnings.map((w) => w.message)).toEqual([]);
  });

  it('Vorbereitung: Automatikzyklus legt Metallwürfel auf Pos. 1 und fährt heim', () => {
    const { plant, t } = setup('vorbereitung');
    t.set('SJ3', true);
    t.wait(100);
    expect(t.get('PF3')).toBe(true); // Einrichtbetrieb
    expect(t.get('PF2')).toBe(true); // Grundstellung
    t.set('SJ4', true);
    t.wait(100);
    t.press('SJ5');
    t.until(() => plant.slots[0]!.part === 'metall', 30000, 'Würfel nicht abgelegt');
    t.until(() => !!t.get('BG13') && t.get('G_Auto_1.xX500') === true, 30000, 'nicht heimgefahren');
    expect(plant.floor).toBe(0);
    expect(plant.magazine.length).toBe(3);
  });

  it('Bereitstellung: zwei Würfel auf Pos. 1 und Pos. 3', () => {
    const { plant, t } = setup('bereitstellung');
    t.set('SJ3', true);
    t.wait(100);
    t.set('SJ4', true);
    t.wait(100);
    t.press('SJ5');
    t.until(() => plant.slots[1]!.part === 'metall', 60000, 'Pos. 3 nicht belegt');
    t.until(() => !!t.get('BG13') && t.get('G_Auto_1.xX500') === true, 30000, 'nicht heimgefahren');
    expect(plant.slots[0]!.part).toBe('metall');
    expect(t.get('PF33')).toBe(true);
  });

  it('Einrichtbetrieb: Tippen links/rechts mit Verriegelung', () => {
    const { plant, t } = setup('vorbereitung');
    t.set('SJ3', true);
    t.wait(100);
    t.set('SJ6', true);
    t.wait(1000);
    expect(t.get('QA5')).toBe(true);
    expect(plant.x).toBeGreaterThan(20);
    t.set('SJ7', true);
    t.wait(50);
    expect(t.get('QA5')).toBe(false);
    expect(t.get('QA6')).toBe(false);
    t.set('SJ6', false);
    t.until(() => !!t.get('BG13'), 10000, 'nicht zurück');
    t.wait(200);
    expect(t.get('QA6')).toBe(false);
  });
});
