import { compileProject, type PouSource } from './compiler';
import { PlcRuntime } from './runtime';

const G = `VAR_GLOBAL
  S1 AT %IX0.0 : BOOL;
  S2 AT %IX0.1 : BOOL;
  H1 AT %QX4.0 : BOOL;
  Wert AT %IW2 : INT;
END_VAR`;

function main(vars: string, code: string): PouSource[] {
  return [{ name: 'Main', kind: 'PROGRAM', vars, code }];
}

const EXT = `VAR_EXTERNAL S1 : BOOL; S2 : BOOL; H1 : BOOL; Wert : INT; END_VAR\n`;

function run(vars: string, code: string) {
  const r = compileProject(main(EXT + vars, code), G);
  if (!r.ok) throw new Error(r.diagnostics.map((d) => `${d.line}: ${d.message}`).join('\n'));
  return new PlcRuntime(r.project!);
}

function errors(vars: string, code: string, withExt = true) {
  const r = compileProject(main((withExt ? EXT : '') + vars, code), G);
  return r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message);
}

describe('ST-Interpreter', () => {
  it('verknüpft UND/ODER/NICHT', () => {
    const rt = run('', 'H1 := S1 AND NOT S2;');
    rt.setGlobal('S1', true);
    rt.cycle(10);
    expect(rt.getGlobal('H1')).toBe(true);
    rt.setGlobal('S2', true);
    rt.cycle(10);
    expect(rt.getGlobal('H1')).toBe(false);
  });

  it('Selbsthaltung', () => {
    const rt = run('', 'H1 := (S1 OR H1) AND NOT S2;');
    rt.setGlobal('S1', true);
    rt.cycle(10);
    rt.setGlobal('S1', false);
    rt.cycle(10);
    expect(rt.getGlobal('H1')).toBe(true);
    rt.setGlobal('S2', true);
    rt.cycle(10);
    expect(rt.getGlobal('H1')).toBe(false);
  });

  it('TON verzögert', () => {
    const rt = run('VAR T1 : TON; END_VAR', 'T1(IN := S1, PT := T#1s);\nH1 := T1.Q;');
    rt.setGlobal('S1', true);
    for (let i = 0; i < 99; i++) rt.cycle(10);
    expect(rt.getGlobal('H1')).toBe(false);
    rt.cycle(10);
    rt.cycle(10);
    expect(rt.getGlobal('H1')).toBe(true);
  });

  it('F_TRIG und Zähler', () => {
    const rt = run('VAR F : F_TRIG; C : INT; END_VAR', 'F(CLK := S1);\nIF F.Q THEN C := C + 1; END_IF;\nH1 := C >= 2;');
    for (let k = 0; k < 2; k++) {
      rt.setGlobal('S1', true);
      rt.cycle(10);
      rt.setGlobal('S1', false);
      rt.cycle(10);
    }
    expect(rt.resolve('C')).toBe(2);
    expect(rt.getGlobal('H1')).toBe(true);
  });

  it('CASE-Schrittkette', () => {
    const rt = run('VAR Schritt : INT := 10; END_VAR', `
CASE Schritt OF
  10: IF S1 THEN Schritt := 20; END_IF;
  20, 21: IF S2 THEN Schritt := 10; END_IF;
END_CASE;
H1 := Schritt = 20;`);
    rt.cycle(10);
    expect(rt.getGlobal('H1')).toBe(false);
    rt.setGlobal('S1', true);
    rt.cycle(10);
    rt.cycle(10);
    expect(rt.getGlobal('H1')).toBe(true);
  });

  it('INT läuft über wie in der SPS', () => {
    const rt = run('VAR X : INT := 32767; END_VAR', 'X := X + 1;');
    rt.cycle(10);
    expect(rt.resolve('X')).toBe(-32768);
  });

  it('meldet := statt =', () => {
    expect(errors('', 'H1 = S1;')[0]).toMatch(/:=/);
  });

  it('meldet fehlendes Semikolon', () => {
    expect(errors('', 'H1 := S1\nH1 := S2;')[0]).toMatch(/Semikolon/);
  });

  it('meldet fehlendes END_IF', () => {
    expect(errors('', 'IF S1 THEN H1 := TRUE;')[0]).toMatch(/END_IF/);
  });

  it('meldet fehlendes VAR_EXTERNAL', () => {
    expect(errors('', 'H1 := S1;', false)[0]).toMatch(/VAR_EXTERNAL/);
  });

  it('meldet Typfehler INT/REAL', () => {
    expect(errors('VAR R : REAL; END_VAR', 'R := Wert;')[0]).toMatch(/Typen passen nicht/);
  });

  it('meldet 1 statt TRUE', () => {
    expect(errors('', 'H1 := 1;')[0]).toMatch(/TRUE oder FALSE/);
  });

  it('meldet Tippfehler mit Vorschlag', () => {
    const r = compileProject(main(EXT + 'VAR Zaehler : INT; END_VAR', 'Zaeler := 1;'), G);
    expect(r.diagnostics[0]!.hint).toMatch(/Zaehler/);
  });

  it('meldet // Kommentar', () => {
    expect(errors('', '// test\nH1 := S1;')[0]).toMatch(/\/\//);
  });

  it('akzeptiert Kleinschreibung wie im Ausbilder-Code', () => {
    const rt = run('VAR istep : INT; END_VAR', 'case istep of\n 0: If S1 Then istep := 1; End_If;\n 1: ;\nelse istep := 0;\nend_case;\nH1 := istep = 1;');
    rt.setGlobal('S1', true);
    rt.cycle(10);
    rt.cycle(10);
    expect(rt.getGlobal('H1')).toBe(true);
  });

  it('eigene Funktionsbausteine mit VAR_EXTERNAL', () => {
    const r = compileProject(
      [
        { name: 'Main', kind: 'PROGRAM', vars: 'VAR B1 : Blinker; END_VAR', code: 'B1(xEin := TRUE);' },
        {
          name: 'Blinker',
          kind: 'FUNCTION_BLOCK',
          vars: 'VAR_INPUT xEin : BOOL; END_VAR\nVAR_OUTPUT xOut : BOOL; END_VAR\nVAR_EXTERNAL H1 : BOOL; END_VAR\nVAR T : TON; END_VAR',
          code: 'T(IN := xEin AND NOT T.Q, PT := T#100ms);\nIF T.Q THEN xOut := NOT xOut; END_IF;\nH1 := xOut;',
        },
      ],
      G,
    );
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const rt = new PlcRuntime(r.project!);
    for (let i = 0; i < 12; i++) rt.cycle(10);
    expect(rt.getGlobal('H1')).toBe(true);
    expect(rt.resolve('B1.xOut')).toBe(true);
  });

  it('warnt bei doppelter Zuweisung', () => {
    const r = compileProject(main(EXT, 'H1 := S1;\nH1 := S2;'), G);
    expect(r.diagnostics.some((d) => d.severity === 'warning' && /2-mal/.test(d.message))).toBe(true);
  });
});
