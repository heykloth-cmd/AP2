/**
 * Prüfungstraining am Achsenmodell. Jede Aufgabe = ein Teil-GRAFCET als Funktionsbaustein.
 * Die übrigen Bausteine sind mit der Musterlösung vorbelegt (🔒), damit die ganze Anlage läuft.
 */
import type { PouSource } from '../../plc/compiler';
import { CheckFail, type Check, type TestCtx } from '../../sim/checks';
import type { AchsePlant } from '../../sim/achse';
import type { Exercise } from '../types';
import { G_ANZEIGE, G_AUTO_B, G_AUTO_V, G_EINRICHT, G_MAIN, G_TAKT } from './grafcets';
import * as S from './solution';

const c = (name: string, run: (t: TestCtx) => void): Check => ({ name, run });
const plantOf = (t: TestCtx) => t.plant as AchsePlant;

/** internen VAR-Block der Musterlösung durch einen leeren Startblock ersetzen */
function starterVars(vars: string, step: number | null): string {
  const own = `VAR\n${step !== null ? `\tiStep : INT := ${step};\n` : ''}\t(* eigene Variablen: Timer, Flanken, Zähler … *)\nEND_VAR`;
  return vars.replace(/(^|\n)VAR\n[\s\S]*?END_VAR\s*$/, `$1${own}`);
}

type FbName = 'G_Takt' | 'G_Main' | 'G_Einricht' | 'G_Auto' | 'G_Anzeige';

function project(variante: 'vorbereitung' | 'bereitstellung', editable: FbName[], starterCode: Partial<Record<FbName, string>> = {}): { pous: PouSource[]; sol: PouSource[] } {
  const sol = S.solutionSources(variante);
  const steps: Record<FbName, number | null> = { G_Takt: 100, G_Main: 1, G_Einricht: 300, G_Auto: 500, G_Anzeige: 200 };
  const pous = sol.map((p): PouSource => {
    if (editable.includes(p.name as FbName)) {
      const n = p.name as FbName;
      let vars = starterVars(p.vars, steps[n]);
      if (n === 'G_Auto') vars = vars.replace('(* eigene Variablen', variante === 'vorbereitung' ? 'C1 : INT;\n\tC2 : INT;\n\tPos1 : INT := 90;\n\tPos4 : INT := 45;\n\t(* eigene Variablen' : 'C1 : INT;\n\tC2 : INT;\n\tPos1 : INT := 90;\n\tPos2 : INT := 60;\n\tPos3 : INT := 30;\n\t(* eigene Variablen');
      return { ...p, vars, code: starterCode[n] ?? `(* ${p.name}: hier den Teil-GRAFCET in ST umsetzen *)\n` };
    }
    return { ...p, readonly: true };
  });
  return { pous, sol };
}

// ---------- Helfer für die Prüfungen ----------
function einricht(t: TestCtx) {
  t.set('SJ3', true);
  t.set('SJ4', false);
  t.wait(200);
}
function automatik(t: TestCtx) {
  t.set('SJ3', true);
  t.set('SJ4', false);
  t.wait(200);
  t.set('SJ4', true);
  t.wait(200);
}
function blinks(t: TestCtx, name: string, ms = 1300): boolean {
  let on = false;
  let off = false;
  const start = t.e.t;
  while (t.e.t - start < ms) {
    t.step();
    if (t.get(name)) on = true;
    else off = true;
  }
  return on && off;
}

// ---------- Prüfungen je Baustein ----------
const TAKT_CHECKS: Check[] = [
  c('Start in Schritt 100: Takt ist zuerst 0,5 s aus', (t) => {
    t.wait(300);
    t.expect('G_Takt_1.xTakt', false, 'Anfangsschritt 100 hat keine Aktion → xTakt = FALSE.');
  }),
  c('xTakt: 0,5 s an, 0,5 s aus', (t) => {
    t.until(() => t.get('G_Takt_1.xTakt') === true, 1500, 'xTakt wird nie TRUE.', 'Schrittwechsel 100 → 101 nach 0,5 s (TON mit IN := iStep = 100).');
    const on = t.until(() => t.get('G_Takt_1.xTakt') === false, 1500, 'xTakt bleibt TRUE.');
    if (Math.abs(on - 500) > 40) throw new CheckFail(`xTakt war ${on} ms an statt 500 ms.`);
    const off = t.until(() => t.get('G_Takt_1.xTakt') === true, 1500, 'xTakt wird nicht wieder TRUE.');
    if (Math.abs(off - 500) > 40) throw new CheckFail(`xTakt war ${off} ms aus statt 500 ms.`);
  }),
  c('PF3 blinkt im Automatikbetrieb', (t) => {
    automatik(t);
    if (!blinks(t, 'PF3')) throw new CheckFail('PF3 blinkt nicht.', 'G_Main nutzt xTakt für PF3 in Schritt 5.');
  }),
];

const ANZEIGE_CHECKS: Check[] = [
  c('Steuerung AUS → keine Meldeleuchte', (t) => {
    t.wait(200);
    t.expect('PF4', false, 'Ohne SJ3 ist G_Anzeige in Schritt 200 – keine Aktionen.');
    t.expect('PF10', false);
  }),
  c('Steuerung EIN → Druck, Zylinder oben, Grundstellung', (t) => {
    einricht(t);
    t.expect('PF4', true, 'PF4 := BP1 in Schritt 201.');
    t.expect('PF10', true, 'PF10 := BG21.');
    t.expect('PF11', false);
    t.expect('PF2', true, 'Grundstellung: BG13 * BG21 * BG54 * BP1 * FC7.');
  }),
  c('Magazin leer → keine Grundstellung', (t) => {
    plantOf(t).emptyMagazine();
    einricht(t);
    t.expect('PF2', false, 'BG54 gehört (Vorbereitung) zur Grundstellung.');
  }),
  c('Druckluft weg → PF4 aus', (t) => {
    einricht(t);
    t.set('Druckluft', false);
    t.wait(100);
    t.expect('PF4', false);
    t.expect('PF2', false);
  }),
  c('Motorschutz → PF5', (t) => {
    einricht(t);
    t.set('Motorschutz', true);
    t.wait(100);
    t.expect('PF5', true, 'PF5 := NOT FC7.');
  }),
  c('Linksfahrt → PF6 blinkt', (t) => {
    einricht(t);
    t.set('SJ6', true);
    if (!blinks(t, 'PF6')) throw new CheckFail('PF6 blinkt bei Linksfahrt nicht.', 'PF6 := QA5 AND xTakt.');
    t.expect('PF7', false);
  }),
  c('Magnet deaktiviert → PF15 und PF32', (t) => {
    einricht(t);
    t.set('SJ12', true);
    t.wait(100);
    t.expect('PF15', true);
    t.expect('PF32', true);
  }),
  c('Pos. 1 und 3 belegt → PF33', (t) => {
    plantOf(t).setSlot(0, 'metall');
    plantOf(t).setSlot(1, 'metall');
    einricht(t);
    t.expect('PF33', true, 'PF33 := BG52 AND BG53.');
  }),
];

const EINRICHT_CHECKS: Check[] = [
  c('SJ6 → Linksfahrt', (t) => {
    einricht(t);
    t.set('SJ6', true);
    t.wait(500);
    t.expect('QA5', true, 'In Schritt 301: QA5 bei SJ6 * !SJ7 * !QA6 * !BG11 * BG21.');
    if (plantOf(t).x < 5) throw new CheckFail('Der Schlitten bewegt sich nicht.');
  }),
  c('SJ6 und SJ7 gleichzeitig → Stillstand', (t) => {
    einricht(t);
    t.set('SJ6', true);
    t.set('SJ7', true);
    t.wait(200);
    t.expect('QA5', false);
    t.expect('QA6', false);
  }),
  c('Endlage links BG11 schaltet ab', (t) => {
    einricht(t);
    t.set('SJ6', true);
    t.until(() => !!t.get('BG11'), 12000, 'BG11 wird nicht erreicht.');
    t.wait(300);
    t.expect('QA5', false, 'NOT BG11 in der Bedingung von QA5.');
  }),
  c('Rechtsfahrt bis BG13', (t) => {
    einricht(t);
    t.set('SJ6', true);
    t.wait(1000);
    t.set('SJ6', false);
    t.set('SJ7', true);
    t.until(() => !!t.get('BG13'), 5000, 'BG13 wird nicht erreicht.', 'QA6 bei SJ7 * !SJ6 * !QA5 * !BG13 * BG21.');
    t.wait(300);
    t.expect('QA6', false, 'Bei BG13 muss QA6 abschalten.');
  }),
  c('Zylinder aus- und einfahren', (t) => {
    einricht(t);
    t.set('SJ9', true);
    t.until(() => !!t.get('BG22'), 2000, 'MM20 fährt nicht aus.', 'MB22 bei SJ9 * !SJ8 * !BG22.');
    t.wait(50);
    t.expect('MB22', false, 'Bei BG22 muss MB22 abschalten (!BG22).');
    t.set('SJ9', false);
    t.set('SJ8', true);
    t.until(() => !!t.get('BG21'), 2000, 'MM20 fährt nicht ein.', 'MB21 bei SJ8 * !SJ9 * !BG21.');
  }),
  c('Zylinder unten → kein Verfahren', (t) => {
    einricht(t);
    t.set('SJ9', true);
    t.until(() => !!t.get('BG22'), 2000, 'MM20 fährt nicht aus.');
    t.set('SJ9', false);
    t.set('SJ6', true);
    t.wait(200);
    t.expect('QA5', false, 'Verfahren nur mit eingefahrenem Zylinder (BG21).');
  }),
  c('SJ12 → QA60, nach 5 s wieder aus', (t) => {
    einricht(t);
    t.set('SJ12', true);
    t.wait(200);
    t.expect('QA60', true, 'QA60 bei gedrücktem SJ12.');
    t.wait(5200);
    t.expect('QA60', false, 'Nach 5 s muss QA60 abfallen: NOT T_SJ12.Q (TON mit PT := T#5s).');
  }),
  c('Umschalten auf Automatik während der Fahrt → Stopp', (t) => {
    einricht(t);
    t.set('SJ6', true);
    t.wait(300);
    t.set('SJ4', true);
    t.wait(60);
    t.expect('QA5', false, 'Aktionen nur in Schritt 301 – sonst FALSE. Nicht nur im IF setzen!');
  }),
];

const MAIN_CHECKS: Check[] = [
  c('Steuerung AUS → nichts geht', (t) => {
    t.wait(200);
    t.expect('PF3', false);
    t.set('SJ6', true);
    t.wait(200);
    t.expect('QA5', false, 'Ohne SJ3 bleibt G_Main in Schritt 1 → keine Freigabe.');
  }),
  c('Einrichtbetrieb: PF3 Dauerlicht, Tippen möglich', (t) => {
    einricht(t);
    t.hold(1200, () => t.get('PF3') === true, 'PF3 leuchtet im Einrichtbetrieb nicht dauerhaft');
    t.set('SJ6', true);
    t.wait(200);
    t.expect('QA5', true, 'In Schritt 3 muss G_Einricht freigegeben sein (xEinricht).');
  }),
  c('Automatik: PF3 blinkt, Start möglich', (t) => {
    automatik(t);
    if (!blinks(t, 'PF3')) throw new CheckFail('PF3 blinkt im Automatikbetrieb nicht.', 'PF3 := (iStep = 3) OR (iStep = 5 AND xTakt);');
    t.press('SJ5');
    t.wait(200);
    t.expect('QA5', true, 'In Schritt 5 muss G_Auto freigegeben sein (xAuto).');
  }),
  c('Einschalten in Stellung Automatik → bleibt in Schritt 1', (t) => {
    t.set('SJ4', true);
    t.set('SJ3', true);
    t.wait(400);
    t.expect('PF3', false, 'Transition 1→2 verlangt !SJ4.');
  }),
  c('Druckabfall im Automatik → alles aus', (t) => {
    automatik(t);
    t.press('SJ5');
    t.wait(300);
    t.set('Druckluft', false);
    t.wait(100);
    t.expect('QA5', false, 'Transition 5→1 bei !BP1 – dann G_Auto ohne Freigabe.');
    t.expect('PF3', false);
  }),
  c('NOT-AUS → zurück in Schritt 1', (t) => {
    einricht(t);
    t.set('SG1', true);
    t.wait(100);
    t.expect('PF3', false);
    t.set('SG1', false);
    t.press('SJ2');
    t.wait(200);
    t.expect('PF3', true, 'Nach dem Quittieren (KE2) geht es wieder über Schritt 2 in Schritt 3.');
  }),
];

function autoCycle(t: TestCtx) {
  automatik(t);
  t.press('SJ5');
  t.until(() => plantOf(t).slots[0]!.part === 'metall', 25000, 'Kein Würfel auf Pos. 1 abgelegt.', 'Prüfe die Schritte 502–508 und die Zähler C1/C2.');
  t.until(() => !!t.get('BG13') && !t.get('QA6'), 15000, 'Der Schlitten fährt nicht zurück in die Grundposition.', 'Schritt 509: QA6 bis BG13.');
}

const AUTO_CHECKS: Check[] = [
  c('Ohne Würfel im Magazin kein Start', (t) => {
    plantOf(t).emptyMagazine();
    automatik(t);
    t.press('SJ5');
    t.wait(500);
    t.expect('QA5', false, 'Startbedingung enthält BG54.');
  }),
  c('Pos. 1 belegt → kein Start', (t) => {
    plantOf(t).setSlot(0, 'metall');
    automatik(t);
    t.press('SJ5');
    t.wait(500);
    t.expect('QA5', false, 'Startbedingung enthält !BG52 und !BG53.');
  }),
  c('Fährt genau bis zum Magazin (Pos. 4 = 45 Impulse)', (t) => {
    automatik(t);
    t.press('SJ5');
    t.until(() => t.get('QA5') === false, 8000, 'Der Motor stoppt nicht.', 'C1 bei ↓BG12 hochzählen (F_TRIG), Stopp bei C1 = C2.');
    const p = plantOf(t).pulses;
    if (Math.abs(p - 45) > 1.5) throw new CheckFail(`Der Schlitten steht bei ${p.toFixed(1)} Impulsen statt bei 45.`, 'Zählst du jeden Zyklus statt jeder fallenden Flanke?');
  }),
  c('Greifer wartet 1 s vor dem Ausfahren', (t) => {
    automatik(t);
    t.press('SJ5');
    t.until(() => t.get('QA5') === false, 8000, 'Der Motor stoppt nicht.');
    const d = t.until(() => t.get('MB22') === true, 3000, 'MB22 kommt nicht.', 'Schritt 503: MB22 bei 1s/X503.');
    if (d < 900) throw new CheckFail(`MB22 kam schon nach ${d} ms – es fehlt die Wartezeit 1s/X503.`);
  }),
  c('Kompletter Zyklus: Würfel auf Pos. 1, zurück in Grundposition', (t) => {
    autoCycle(t);
    t.wait(200);
    t.expect('G_Auto_1.xX500', true, 'Nach BG13 zurück in Schritt 500.');
  }),
  c('Umschalten auf Einricht stoppt die Fahrt', (t) => {
    automatik(t);
    t.press('SJ5');
    t.wait(800);
    t.set('SJ4', false);
    t.wait(100);
    t.expect('QA5', false);
  }),
];

const GESAMT_CHECKS: Check[] = [TAKT_CHECKS[1]!, ANZEIGE_CHECKS[1]!, EINRICHT_CHECKS[0]!, EINRICHT_CHECKS[7]!, MAIN_CHECKS[2]!, MAIN_CHECKS[3]!, AUTO_CHECKS[0]!, AUTO_CHECKS[2]!, AUTO_CHECKS[4]!];

const AUTO_B_CHECKS: Check[] = [
  c('Zwei Würfel: Pos. 1 und Pos. 3', (t) => {
    automatik(t);
    t.press('SJ5');
    t.until(() => plantOf(t).slots[0]!.part === 'metall', 30000, 'Pos. 1 wird nicht belegt.');
    t.until(() => plantOf(t).slots[1]!.part === 'metall', 40000, 'Pos. 3 wird nicht belegt.', 'Rückwärts zählen: C1 := C1 - 1 bei ↓BG12 während der Rechtsfahrt.');
    t.until(() => !!t.get('BG13') && t.get('G_Auto_1.xX500') === true, 15000, 'Nicht zurück in Grundposition/Schritt 500.');
  }),
  c('PF33 meldet beide Ablagen belegt', (t) => {
    automatik(t);
    t.press('SJ5');
    t.until(() => t.get('PF33') === true, 70000, 'PF33 kommt nicht.');
  }),
];

// ---------- Erweiterung (Übung, nicht aus den Unterlagen) ----------
const EXT_CODE = S.AUTO_CODE.replace(
  "    505: C2 := Pos1;\n         iStep := 506;",
  "    505: IF BG52 THEN\n           C2 := Pos3;\n           iStep := 516;\n         ELSE\n           C2 := Pos1;\n           iStep := 506;\n         END_IF;\n\n    516: IF FT_BG12.Q THEN C1 := C1 - 1; END_IF;\n         IF C1 = C2 THEN iStep := 517; END_IF;\n\n    517: IF T_BG22.Q THEN iStep := 518; END_IF;\n\n    518: IF T_BG21.Q THEN iStep := 509; END_IF;",
)
  .replace('NOT BG52 AND NOT BG53 AND BG54', 'NOT (BG52 AND BG53) AND BG54')
  .replace('T_X508(IN := iStep = 508, PT := T#1s);', 'T_X508(IN := iStep = 508, PT := T#1s);\nT_X517(IN := iStep = 517, PT := T#1s);\nT_X518(IN := iStep = 518, PT := T#1s);')
  .replace('xQA6  := iStep = 509;', 'xQA6  := (iStep = 509) OR (iStep = 516);')
  .replace('xMB22 := (iStep = 503 AND T_X503.Q) OR (iStep = 507 AND T_X507.Q);', 'xMB22 := (iStep = 503 AND T_X503.Q) OR (iStep = 507 AND T_X507.Q) OR (iStep = 517 AND T_X517.Q);')
  .replace('xMB21 := (iStep = 504) OR (iStep = 508 AND T_X508.Q AND BG52);', 'xMB21 := (iStep = 504) OR (iStep = 508 AND T_X508.Q AND BG52) OR (iStep = 518 AND T_X518.Q AND BG53);')
  .replace('xQA60 := iStep = 508;', 'xQA60 := (iStep = 508) OR (iStep = 518);');

const EXT_VARS = S.AUTO_VARS.replace('\tPos4 : INT := 45;\t(* Magazin Position 4 *)', '\tPos3 : INT := 30;\t(* Ablage Position 3 *)\n\tPos4 : INT := 45;\t(* Magazin Position 4 *)').replace(
  '\tT_X508 : TON;',
  '\tT_X508 : TON;\n\tT_X517 : TON;\n\tT_X518 : TON;',
);

const EXT_CHECKS: Check[] = [
  c('Pos. 1 frei → Ablage auf Pos. 1 (wie bisher)', (t) => {
    autoCycle(t);
    if (plantOf(t).slots[1]!.part) throw new CheckFail('Würfel ist auf Pos. 3 gelandet, obwohl Pos. 1 frei war.');
  }),
  c('Pos. 1 belegt → Start trotzdem möglich, Ablage auf Pos. 3', (t) => {
    plantOf(t).setSlot(0, 'metall');
    automatik(t);
    t.press('SJ5');
    t.until(() => plantOf(t).slots[1]!.part === 'metall', 25000, 'Kein Würfel auf Pos. 3.', 'Von Pos. 4 (45) nach Pos. 3 (30) geht es nach RECHTS: QA6 und C1 := C1 - 1.');
    t.until(() => !!t.get('BG13') && t.get('G_Auto_1.xX500') === true, 15000, 'Nicht zurück in Grundposition.');
  }),
  c('Beide belegt → kein Start', (t) => {
    plantOf(t).setSlot(0, 'metall');
    plantOf(t).setSlot(1, 'metall');
    automatik(t);
    t.press('SJ5');
    t.wait(500);
    t.expect('QA5', false);
    t.expect('QA6', false);
  }),
];

const G_AUTO_EXT = {
  ...G_AUTO_V,
  name: 'G_Auto (Erweiterung)',
  note: 'Übungserweiterung: bei belegter Pos. 1 wird auf Pos. 3 abgelegt (alternative Verzweigung nach Schritt 505).',
  steps: [
    ...G_AUTO_V.steps.slice(0, 5),
    { id: 505, actions: [{ text: 'C2 := Pos. 1 bzw. Pos. 3', stored: 'activate' as const }] },
    ...G_AUTO_V.steps.slice(6, 9),
    { id: 516, actions: [{ text: 'QA6 Rechtsfahrt' }, { text: 'C1 := C1 - 1', cond: '↓BG12' }] },
    { id: 517, actions: [{ text: 'MB22', cond: '1s/X517' }] },
    { id: 518, actions: [{ text: 'QA60' }, { text: 'MB21', cond: '1s/X518 * BG53' }] },
    G_AUTO_V.steps[9]!,
  ],
  transitions: [
    { from: 500, to: 501, cond: 'SJ5 * BG13 * BG21 * !(BG52 * BG53) * BG54' },
    ...G_AUTO_V.transitions.slice(1, 5),
    { from: 505, to: 506, cond: '!BG52' },
    { from: 505, to: 516, cond: 'BG52' },
    ...G_AUTO_V.transitions.slice(6, 8),
    { from: 508, to: 509, cond: '1s/BG21' },
    { from: 516, to: 517, cond: '[C1 = C2]' },
    { from: 517, to: 518, cond: '1s/BG22' },
    { from: 518, to: 509, cond: '1s/BG21' },
    G_AUTO_V.transitions[9]!,
  ],
};

export interface ExamTask extends Exercise {
  short: string;
  /** Reihenfolge/Nummer */
  n: number;
  bonus?: boolean;
}

function task(
  n: number,
  id: string,
  title: string,
  short: string,
  focus: FbName,
  task: string,
  hints: string[],
  checks: Check[],
  grafcets: Exercise['grafcets'],
  opts: { variante?: 'vorbereitung' | 'bereitstellung'; editable?: FbName[]; xp?: number; bonus?: boolean; solPatch?: (p: PouSource[]) => PouSource[] } = {},
): ExamTask {
  const variante = opts.variante ?? 'vorbereitung';
  const { pous, sol } = project(variante, opts.editable ?? [focus]);
  return {
    n,
    id,
    title,
    short,
    task,
    hints,
    checks,
    grafcets,
    scenario: { kind: 'achse', variante },
    pous,
    solPous: opts.solPatch ? opts.solPatch(sol) : sol,
    focusPou: focus,
    solCode: '',
    xp: opts.xp ?? 60,
    bonus: opts.bonus,
  };
}

export const EXAM_TASKS: ExamTask[] = [
  task(
    1,
    'p-takt',
    'G_Takt – der Taktgeber',
    'Zwei Schritte, zwei Timer, 1 Hz',
    'G_Takt',
    `Setze den Teil-GRAFCET **G_Takt** im Baustein **G_Takt** um.

- Schrittvariable **iStep** (INT, Start 100) ist schon angelegt.
- Ausgang **xTakt** ist TRUE, solange Schritt **101** aktiv ist.
- \`0,5s/G_Takt.X100\` heißt: Schritt 100 ist seit 0,5 s aktiv.

Die anderen Bausteine (🔒) sind fertig. Du kannst die Anlage also schon bedienen: SJ3 ein, SJ4 auf A → PF3 blinkt mit deinem Takt.`,
    ['Lege zwei TON an: T_X100 und T_X101.', 'T_X100(IN := iStep = 100, PT := T#500ms);  – Aufruf VOR dem CASE.', 'CASE iStep OF  100: IF T_X100.Q THEN iStep := 101; END_IF; …', 'Am Ende:  xTakt := iStep = 101;'],
    TAKT_CHECKS,
    [G_TAKT],
    { xp: 50 },
  ),
  task(
    2,
    'p-anzeige',
    'G_Anzeige – die Meldeleuchten',
    'Zuweisungsbedingungen 1:1 übersetzen',
    'G_Anzeige',
    `Setze **G_Anzeige** um. In Schritt 201 hat jede Leuchte eine **Zuweisungsbedingung**. Die übersetzt du direkt in eine Zeile ST.

- Schritt 200 → 201 bei **SJ3**, zurück bei **~~SJ3~~**.
- Alle Leuchten sind nur in Schritt 201 an: \`PF4 := (iStep = 201) AND BP1;\`
- Den Takt bekommst du über den Eingang **xTakt**.`,
    ['Erst die kleine Schrittkette 200/201 mit CASE.', 'Dann für jede Leuchte eine Zeile:  PFx := (iStep = 201) AND Bedingung;', 'PF6 := (iStep = 201) AND QA5 AND xTakt;  – QA5 ist hier der globale Ausgang.'],
    ANZEIGE_CHECKS,
    [G_ANZEIGE],
    { xp: 60 },
  ),
  task(
    3,
    'p-einricht',
    'G_Einricht – Tippbetrieb',
    'Verriegelungen, Endlagen, Timer',
    'G_Einricht',
    `Setze **G_Einricht** um. Der Baustein bekommt von G_Main die **Freigabe** (\`xFreigabe\`).

- Ohne Freigabe: **iStep := 300**. Das entspricht der Zwangssteuerung {INIT} bzw. { }.
- Mit Freigabe: Schritt 300 → 301 bei ~~SJ4~~, zurück bei SJ4.
- Die Aktionen gibst du auf die Ausgänge **xQA5, xQA6, xMB21, xMB22, xQA60**. Main verknüpft sie mit G_Auto per ODER.
- **xX300** meldet G_Main, dass Schritt 300 aktiv ist.

> Achtung: Im Prototyp eures Ausbilders werden die Ausgänge nur innerhalb von Schritt 301 gesetzt. Dann läuft der Motor weiter, wenn man umschaltet. Weise die Aktionen **immer** zu!`,
    [
      'Struktur: IF NOT xFreigabe THEN iStep := 300; ELSE CASE … END_CASE; END_IF;',
      'xQA5 := (iStep = 301) AND SJ6 AND NOT SJ7 AND NOT QA6 AND NOT BG11 AND BG21;',
      'QA60: Euer Ausbilder setzt den Strich über 5s/SJ12 so um: SJ12 gedrückt → QA60, aber höchstens 5 s. Also T_SJ12(IN := SJ12, PT := T#5s);  xQA60 := (iStep = 301) AND SJ12 AND NOT T_SJ12.Q;',
    ],
    EINRICHT_CHECKS,
    [G_EINRICHT],
    { xp: 80 },
  ),
  task(
    4,
    'p-main',
    'G_Main – Hauptsteuerung',
    'Betriebsarten und Zwangssteuerung',
    'G_Main',
    `Setze die **Hauptsteuerung** um (Schritte 1–5).

- **xEinricht** gibt G_Einricht frei, **xAuto** gibt G_Auto frei.
- Zwangssteuerung in ST: In Schritt 2 (\`G_Einricht{INIT}\`) ist **xEinricht = FALSE**, so bleibt G_Einricht in Schritt 300. Erst in Schritt 3 gibst du frei. Genauso für G_Auto in Schritt 4/5.
- Transition 2 → 3 ist \`G_Einricht.X300\`. Das bekommst du über **xEinrichtX300**.
- **PF3**: Dauerlicht in Schritt 3, blinkend (\`Takt\`) in Schritt 5.
- Aus Schritt 3 gibt es **zwei** Transitionen. Die Rücksprungbedingung prüfst du zuerst (IF … ELSIF).`,
    ['CASE iStep OF 1: IF KE2 AND SJ3 AND BP1 AND NOT SJ4 AND FC7 THEN iStep := 2; END_IF; …', 'Schritt 3: IF NOT KE2 OR NOT BP1 OR NOT SJ3 OR NOT FC7 THEN iStep := 1; ELSIF SJ4 THEN iStep := 4; END_IF;', 'xEinricht := iStep = 3;  xAuto := iStep = 5;  PF3 := (iStep = 3) OR (iStep = 5 AND xTakt);'],
    MAIN_CHECKS,
    [G_MAIN],
    { xp: 80 },
  ),
  task(
    5,
    'p-auto',
    'G_Auto – Automatikablauf',
    'Positionieren mit Impulsen, Greifen, Ablegen',
    'G_Auto',
    `Das Herzstück: **G_Auto** im Stand der **Vorbereitung** (Magazin auf Pos. 4, Ablage Pos. 1).

- Zähler **C1** (Istposition) und **C2** (Sollposition) sind angelegt. **Pos1 = 90** und **Pos4 = 45** Impulse (im Simulator; an eurer Anlage ermittelt ihr die Werte im Tippbetrieb).
- \`C1 := C1 + 1\` mit Ereignis ↓BG12 heißt: zählen bei **fallender Flanke** von BG12 → **F_TRIG**.
- \`1s/BG22\` heißt: BG22 ist seit 1 s TRUE → TON mit IN := BG22.
- \`1s/X503\` heißt: Schritt 503 ist seit 1 s aktiv → TON mit IN := iStep = 503.
- Gespeicherte Aktionen (↑, z. B. \`C2 := Pos. 4\`) führst du einmal beim Eintritt in den Schritt aus. Am einfachsten im Schritt selbst plus sofort weiterschalten (Transition X501 = „Schritt 501 ist aktiv“).

Probiere es in der Anlage: SJ3 ein, SJ4 auf A, **SJ5** drücken.`,
    [
      'Erst alle Timer und F_TRIG aufrufen – außerhalb von CASE.',
      '502: IF FT_BG12.Q THEN C1 := C1 + 1; END_IF;  IF C1 = C2 THEN iStep := 503; END_IF;',
      'Aktionen am Ende:  xQA5 := (iStep = 502) OR (iStep = 506);  xMB22 := (iStep = 503 AND T_X503.Q) OR (iStep = 507 AND T_X507.Q);',
      'Ohne Freigabe: iStep := 500; C1 := 0;',
    ],
    AUTO_CHECKS,
    [G_AUTO_V],
    { xp: 120 },
  ),
  task(
    6,
    'p-gesamt',
    'Generalprobe: alles selbst',
    'Alle Bausteine leer – wie in der Prüfung',
    'G_Takt',
    `Jetzt wie in der Prüfung: **alle fünf Teil-GRAFCETs** schreibst du selbst. Nur **Main** ist vorgegeben (bei euch in PC WORX ein FUP-Arbeitsblatt).

Nimm dir Zeit, arbeite Baustein für Baustein und teste zwischendurch mit ▶ Start. Die Prüfung testet am Ende alles zusammen.

> Prüfung: Am Prüfungstag kommt sehr wahrscheinlich eine Änderung dazu. Dann musst du deine Bausteine schnell anpassen. Je sicherer du hier bist, desto entspannter wird das.`,
    ['Reihenfolge: G_Takt → G_Anzeige → G_Main → G_Einricht → G_Auto.', 'Teste nach jedem Baustein mit ▶ Start an der Anlage.'],
    GESAMT_CHECKS,
    [G_MAIN, G_TAKT, G_EINRICHT, G_ANZEIGE, G_AUTO_V],
    { editable: ['G_Takt', 'G_Main', 'G_Einricht', 'G_Auto', 'G_Anzeige'], xp: 200 },
  ),
  task(
    7,
    'p-bereitstellung',
    'Bonus: G_Auto im Bereitstellungsstand',
    'Zwei Würfel, vor- und rückwärts zählen',
    'G_Auto',
    `Der **Bereitstellungsstand** (Schritte 500–514): Das Magazin steht auf **Pos. 2**. Der erste Würfel kommt auf **Pos. 1** (links), der zweite auf **Pos. 3**. Dabei fährt der Schlitten nach rechts, und **C1 zählt rückwärts**.

Das ist auch der Ablauf, den der Prototyp „AP2“ eures Ausbilders umsetzt.`,
    ['Beim Rechtsfahren:  IF FT_BG12.Q THEN C1 := C1 - 1; END_IF;', 'Pos1 = 90, Pos2 = 60, Pos3 = 30.'],
    AUTO_B_CHECKS,
    [G_AUTO_B],
    { variante: 'bereitstellung', xp: 100, bonus: true },
  ),
  task(
    8,
    'p-erweiterung',
    'Übung: Ausweichablage Pos. 3',
    'Eine Änderung wie am Prüfungstag',
    'G_Auto',
    `**Übungserweiterung** (nicht aus den Unterlagen, so oder ähnlich kann eine Änderung am Prüfungstag aussehen):

Ist **Pos. 1 belegt** (BG52), soll der Würfel stattdessen auf **Pos. 3** abgelegt werden. Gestartet werden darf, solange nicht **beide** Ablagen belegt sind.

- Startbedingung: \`… * !(BG52 * BG53) * BG54\`
- Nach Schritt 505 verzweigt der Ablauf. Bei BG52 geht es mit den Schritten **516–518** nach Pos. 3, also **nach rechts**: QA6, C1 rückwärts.
- Danach fährt der Schlitten wie immer mit Schritt 509 heim.

Startcode ist die Musterlösung von G_Auto. Du musst sie nur erweitern.`,
    ['Pos3 : INT := 30; als Variable ergänzen.', '505: IF BG52 THEN C2 := Pos3; iStep := 516; ELSE C2 := Pos1; iStep := 506; END_IF;', 'Neue Timer T_X517 und T_X518 anlegen und aufrufen.'],
    EXT_CHECKS,
    [G_AUTO_EXT],
    {
      xp: 120,
      bonus: true,
      solPatch: (p) => p.map((x) => (x.name === 'G_Auto' ? { ...x, vars: EXT_VARS, code: EXT_CODE } : x)),
    },
  ),
];

// Erweiterung: Startcode = Musterlösung G_Auto (Vorbereitung)
{
  const ext = EXAM_TASKS.find((t) => t.id === 'p-erweiterung')!;
  ext.pous = ext.pous!.map((p) => (p.name === 'G_Auto' ? { ...p, vars: S.AUTO_VARS, code: S.AUTO_CODE } : p));
}

export const EXAM_MAP: Record<string, ExamTask> = Object.fromEntries(EXAM_TASKS.map((t) => [t.id, t]));
