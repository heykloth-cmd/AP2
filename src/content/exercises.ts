/**
 * Übungsaufgaben der Lektionen. Jede Aufgabe hat eine Musterlösung und automatische Prüfungen.
 */
import { CheckFail, type Check, type TestCtx } from '../sim/checks';
import { ana, btn, lamp, motor, nc, panel, sens, sw, valve } from './panels';
import type { Exercise } from './types';

const c = (name: string, run: (t: TestCtx) => void): Check => ({ name, run });

export const EXERCISES: Exercise[] = [
  // ---------------- Kapitel 1 ----------------
  {
    id: 'e-erstes',
    title: 'Deine erste Zuweisung',
    task: `Die Lampe **H1** soll leuchten, **solange** der Taster **S1** gedrückt ist.

Schreibe dazu eine einzige Zeile in den Code. Danach: ▶ Start, im Reiter „Anlage“ den Taster drücken – und dann **Programm prüfen**.`,
    scenario: panel([btn('S1', 'Taster')], [lamp('H1', 'Lampe', 'yellow')]),
    code: '(* Schreibe hier deine Zeile: *)\n',
    solCode: 'H1 := S1;\n',
    hints: ['Eine Zuweisung sieht so aus:  Ziel := Quelle;', 'Ziel ist der Ausgang H1, Quelle der Eingang S1. Das Semikolon am Ende nicht vergessen.'],
    checks: [
      c('S1 nicht gedrückt → H1 aus', (t) => {
        t.wait(50);
        t.expect('H1', false);
      }),
      c('S1 gedrückt → H1 an', (t) => {
        t.set('S1', true);
        t.wait(50);
        t.expect('H1', true, 'H1 muss den Wert von S1 bekommen.');
      }),
      c('S1 losgelassen → H1 wieder aus', (t) => {
        t.set('S1', true);
        t.wait(50);
        t.set('S1', false);
        t.wait(50);
        t.expect('H1', false);
      }),
    ],
    xp: 15,
  },
  {
    id: 'e-oeffner',
    title: 'Öffner richtig abfragen',
    task: `**S0** ist ein **Stopp-Taster als Öffner**. Nicht gedrückt liefert er TRUE, gedrückt FALSE.

Die rote Lampe **H2** soll leuchten, solange **S0 gedrückt** ist. Die grüne Lampe **H1** soll leuchten, solange S0 **nicht** gedrückt ist („Bereit“).`,
    scenario: panel([nc('S0', 'Stopp (Öffner)')], [lamp('H1', 'Bereit', 'green'), lamp('H2', 'Stopp gedrückt', 'red')]),
    code: '',
    solCode: 'H1 := S0;\nH2 := NOT S0;\n',
    hints: ['Beim Öffner ist die Logik umgedreht: gedrückt = FALSE.', 'Für „nicht“ schreibt man in ST das Wort NOT vor die Variable.'],
    checks: [
      c('S0 nicht gedrückt → H1 an, H2 aus', (t) => {
        t.wait(50);
        t.expect('H1', true, 'Ein Öffner liefert TRUE, wenn er NICHT gedrückt ist.');
        t.expect('H2', false);
      }),
      c('S0 gedrückt → H1 aus, H2 an', (t) => {
        t.set('S0', true);
        t.wait(50);
        t.expect('H2', true, 'Gedrückter Öffner = FALSE. Also H2 := NOT S0;');
        t.expect('H1', false);
      }),
    ],
    xp: 15,
  },

  // ---------------- Kapitel 3: Logik ----------------
  {
    id: 'e-und',
    title: 'Zweihandbedienung (UND)',
    task: `Eine Presse **M1** darf nur laufen, wenn **beide** Taster **S1** und **S2** gleichzeitig gedrückt sind.`,
    scenario: panel([btn('S1', 'Taster links'), btn('S2', 'Taster rechts')], [motor('M1', 'Presse')]),
    solCode: 'M1 := S1 AND S2;\n',
    hints: ['„beide gleichzeitig“ = UND = AND'],
    checks: [
      c('nur S1 → M1 aus', (t) => {
        t.set('S1', true);
        t.wait(50);
        t.expect('M1', false, 'Mit nur einem Taster darf die Presse nicht laufen.');
      }),
      c('nur S2 → M1 aus', (t) => {
        t.set('S2', true);
        t.wait(50);
        t.expect('M1', false, 'Mit nur einem Taster darf die Presse nicht laufen.');
      }),
      c('S1 und S2 → M1 an', (t) => {
        t.set('S1', true);
        t.set('S2', true);
        t.wait(50);
        t.expect('M1', true);
      }),
    ],
    xp: 15,
  },
  {
    id: 'e-oder-nicht',
    title: 'Klingel mit Sperre (ODER, NICHT)',
    task: `Die Klingel **H1** soll leuchten, wenn **S1 oder S2** gedrückt ist – aber **nicht**, wenn der Schalter **S3** („Ruhe“) eingeschaltet ist.`,
    scenario: panel([btn('S1', 'Klingel vorne'), btn('S2', 'Klingel hinten'), sw('S3', 'Ruhe')], [lamp('H1', 'Klingel', 'yellow')]),
    solCode: 'H1 := (S1 OR S2) AND NOT S3;\n',
    hints: ['Erst die beiden Klingeltaster mit OR verbinden – in Klammern!', 'AND bindet stärker als OR. Ohne Klammern würde  S1 OR S2 AND NOT S3  bedeuten: S1 OR (S2 AND NOT S3).'],
    checks: [
      c('S1 → H1 an', (t) => {
        t.set('S1', true);
        t.wait(50);
        t.expect('H1', true);
      }),
      c('S2 → H1 an', (t) => {
        t.set('S2', true);
        t.wait(50);
        t.expect('H1', true);
      }),
      c('S1 bei Ruhe → H1 aus', (t) => {
        t.set('S3', true);
        t.set('S1', true);
        t.wait(50);
        t.expect('H1', false, 'Hast du Klammern um (S1 OR S2) gesetzt?');
      }),
      c('S2 bei Ruhe → H1 aus', (t) => {
        t.set('S3', true);
        t.set('S2', true);
        t.wait(50);
        t.expect('H1', false);
      }),
    ],
    xp: 20,
  },
  {
    id: 'e-grafcet-bedingung',
    title: 'GRAFCET-Bedingung übersetzen',
    task: `Aus eurem GRAFCET **G_Einricht** (Schritt 301):

Die Aktion **QA5** (Linksfahrt) hat die Zuweisungsbedingung
**SJ6 * ~~SJ7~~ * ~~QA6~~ * ~~BG11~~ * BG21**

Übersetze die Bedingung in ST. Hier im Pult gibt es noch keine Schrittkette, nur die Bedingung.

> Tipp: \`*\` heißt UND, ein Strich über dem Namen heißt NICHT.`,
    scenario: panel(
      [btn('SJ6', 'Linksfahrt'), btn('SJ7', 'Rechtsfahrt'), sens('BG11', 'Endlage links'), sens('BG21', 'MM20 eingefahren')],
      [motor('QA5', 'Linksfahrt'), motor('QA6', 'Rechtsfahrt')],
    ),
    code: '(* QA6 bleibt hier immer FALSE *)\nQA6 := FALSE;\n\n',
    solCode: '(* QA6 bleibt hier immer FALSE *)\nQA6 := FALSE;\n\nQA5 := SJ6 AND NOT SJ7 AND NOT QA6 AND NOT BG11 AND BG21;\n',
    hints: ['Strich darüber = NOT, Stern = AND. Also z. B.  SJ6 AND NOT SJ7 …', 'Vergiss BG21 nicht: der Zylinder muss eingefahren sein, sonst kracht es.'],
    checks: [
      c('SJ6 und Zylinder oben → QA5 an', (t) => {
        t.set('BG21', true);
        t.set('SJ6', true);
        t.wait(50);
        t.expect('QA5', true);
      }),
      c('Zylinder nicht eingefahren → QA5 aus', (t) => {
        t.set('SJ6', true);
        t.wait(50);
        t.expect('QA5', false, 'BG21 muss TRUE sein (Zylinder eingefahren).');
      }),
      c('Endlage links erreicht → QA5 aus', (t) => {
        t.set('BG21', true);
        t.set('BG11', true);
        t.set('SJ6', true);
        t.wait(50);
        t.expect('QA5', false, 'Bei BG11 muss der Motor abschalten: NOT BG11.');
      }),
      c('beide Taster → QA5 aus', (t) => {
        t.set('BG21', true);
        t.set('SJ6', true);
        t.set('SJ7', true);
        t.wait(50);
        t.expect('QA5', false, 'NOT SJ7 fehlt.');
      }),
    ],
    xp: 25,
  },

  // ---------------- Kapitel 4: IF ----------------
  {
    id: 'e-if',
    title: 'IF … ELSE',
    task: `Schreibe mit **IF / ELSE**:
- Ist der Schalter **S1** an, leuchtet **H1** (grün) und **H2** ist aus.
- Sonst leuchtet **H2** (rot) und **H1** ist aus.`,
    scenario: panel([sw('S1', 'Schalter')], [lamp('H1', 'Ein', 'green'), lamp('H2', 'Aus', 'red')]),
    solCode: 'IF S1 THEN\n  H1 := TRUE;\n  H2 := FALSE;\nELSE\n  H1 := FALSE;\n  H2 := TRUE;\nEND_IF;\n',
    hints: ['Aufbau:  IF Bedingung THEN … ELSE … END_IF;', 'Setze in beiden Zweigen BEIDE Lampen – sonst behalten sie ihren alten Wert.'],
    checks: [
      c('S1 aus → H2 an, H1 aus', (t) => {
        t.wait(50);
        t.expect('H2', true);
        t.expect('H1', false);
      }),
      c('S1 an → H1 an, H2 aus', (t) => {
        t.set('S1', true);
        t.wait(50);
        t.expect('H1', true);
        t.expect('H2', false);
      }),
      c('wieder aus → H2 an, H1 aus', (t) => {
        t.set('S1', true);
        t.wait(50);
        t.set('S1', false);
        t.wait(50);
        t.expect('H1', false, 'Im ELSE-Zweig muss H1 := FALSE stehen.');
        t.expect('H2', true);
      }),
    ],
    xp: 20,
  },
  {
    id: 'e-if-falle',
    title: 'Die IF-Falle reparieren',
    task: `Dieser Code soll im **Einrichtbetrieb** (Schalter **SJ4 = FALSE**) mit dem Taster **SJ6** den Motor **QA5** tippen.

Teste: SJ6 gedrückt halten und dabei SJ4 auf Automatik schalten → **der Motor läuft weiter!** Genau dieser Fehler steckt im Prototyp eures Ausbilders (G_Einricht).

Repariere den Code so, dass QA5 **immer** aus ist, wenn nicht Einrichtbetrieb ist.`,
    scenario: panel([sw('SJ4', 'Einricht (0) / Automatik (1)'), btn('SJ6', 'Linksfahrt')], [motor('QA5', 'Linksfahrt')]),
    code: 'IF NOT SJ4 THEN\n  QA5 := SJ6;\nEND_IF;\n',
    solCode: 'QA5 := NOT SJ4 AND SJ6;\n',
    hints: [
      'Wenn die IF-Bedingung FALSE ist, wird die Zuweisung übersprungen – QA5 behält dann seinen alten Wert.',
      'Lösung 1: ELSE-Zweig mit QA5 := FALSE;  Lösung 2 (besser): ganz ohne IF:  QA5 := NOT SJ4 AND SJ6;',
    ],
    checks: [
      c('Einricht + SJ6 → QA5 an', (t) => {
        t.set('SJ6', true);
        t.wait(50);
        t.expect('QA5', true);
      }),
      c('während der Fahrt auf Automatik → QA5 aus', (t) => {
        t.set('SJ6', true);
        t.wait(50);
        t.set('SJ4', true);
        t.wait(50);
        t.expect('QA5', false, 'Im Automatikbetrieb muss QA5 FALSE werden – das IF allein schaltet nicht ab.');
      }),
    ],
    xp: 25,
  },

  // ---------------- Kapitel 5: Speichern ----------------
  {
    id: 'e-selbsthaltung',
    title: 'Motor mit Selbsthaltung',
    task: `Klassiker aus der Schütztechnik – jetzt in ST:
- Taster **S1** (Schließer) startet den Motor **M1**.
- Taster **S0** (**Öffner**) stoppt ihn.
- Der Motor läuft nach dem Loslassen von S1 weiter (Selbsthaltung).
- Werden beide gedrückt, gewinnt **Stopp**.`,
    scenario: panel([btn('S1', 'Start'), nc('S0', 'Stopp (Öffner)')], [motor('M1', 'Motor'), lamp('H1', 'Motor läuft', 'green')]),
    code: '',
    solCode: 'M1 := (S1 OR M1) AND S0;\nH1 := M1;\n',
    hints: ['Selbsthaltung: Der Ausgang hält sich selbst: (S1 OR M1).', 'S0 ist ein Öffner: nicht gedrückt = TRUE. Also einfach  AND S0  (ohne NOT!).', 'Vergiss die Meldelampe H1 nicht.'],
    checks: [
      c('Start → Motor läuft', (t) => {
        t.press('S1');
        t.expect('M1', true, 'Nach dem Loslassen von S1 muss M1 weiterlaufen (Selbsthaltung).');
        t.expect('H1', true, 'H1 soll anzeigen, dass der Motor läuft.');
      }),
      c('Stopp → Motor aus', (t) => {
        t.press('S1');
        t.press('S0');
        t.expect('M1', false, 'S0 (Öffner) gedrückt = FALSE → Motor aus.');
      }),
      c('Start und Stopp gleichzeitig → Stopp gewinnt', (t) => {
        t.set('S0', true);
        t.set('S1', true);
        t.wait(50);
        t.expect('M1', false, 'Sicherheit: Stopp muss dominant sein.');
      }),
      c('Motor bleibt nach Start dauerhaft an', (t) => {
        t.press('S1');
        t.hold(2000, () => t.get('M1') === true, 'Motor ist ausgegangen');
      }),
    ],
    xp: 25,
  },
  {
    id: 'e-rs',
    title: 'Speicher mit RS-Baustein',
    task: `Gleiche Aufgabe wie eben – aber diesmal mit dem Baustein **RS** (Rücksetzen dominant).

1. Lege im Reiter **Variablen** eine Instanz an:  \`Speicher : RS;\`
2. Rufe sie im Code auf und verbinde **S** (Setzen) und **R1** (Rücksetzen).
3. Gib den Ausgang **Q1** auf **M1**.

Achtung: S0 ist wieder ein Öffner.`,
    scenario: panel([btn('S1', 'Start'), nc('S0', 'Stopp (Öffner)')], [motor('M1', 'Motor')]),
    vars: 'VAR\n\t(* hier die RS-Instanz anlegen *)\nEND_VAR',
    solVars: 'VAR\n\tSpeicher : RS;\nEND_VAR',
    solCode: 'Speicher(S := S1, R1 := NOT S0);\nM1 := Speicher.Q1;\n',
    hints: ['Aufruf:  Speicher(S := S1, R1 := NOT S0);', 'Dann:  M1 := Speicher.Q1;'],
    checks: [
      c('Start → Motor läuft weiter', (t) => {
        t.press('S1');
        t.expect('M1', true);
      }),
      c('Stopp → aus', (t) => {
        t.press('S1');
        t.press('S0');
        t.expect('M1', false, 'R1 braucht NOT S0, weil S0 ein Öffner ist.');
      }),
      c('beide gedrückt → aus', (t) => {
        t.set('S1', true);
        t.set('S0', true);
        t.wait(50);
        t.expect('M1', false);
      }),
    ],
    xp: 25,
  },
  {
    id: 'e-wendeschuetz',
    title: 'Wendeschaltung mit Verriegelung',
    task: `Der Motor eurer X-Achse hat zwei Schütze: **QA5** (links) und **QA6** (rechts). **Beide gleichzeitig = Kurzschluss!**

- **SJ6** startet Linkslauf, **SJ7** Rechtslauf (jeweils mit Selbsthaltung).
- **S0** (Öffner) stoppt alles.
- Ein Schütz darf nur anziehen, wenn das andere **aus** ist (Verriegelung).
- Läuft der Motor links und SJ7 wird gedrückt, passiert nichts – erst stoppen.`,
    scenario: panel([btn('SJ6', 'Links'), btn('SJ7', 'Rechts'), nc('S0', 'Stopp (Öffner)')], [motor('QA5', 'Linkslauf'), motor('QA6', 'Rechtslauf')]),
    solCode: 'QA5 := (SJ6 OR QA5) AND S0 AND NOT QA6;\nQA6 := (SJ7 OR QA6) AND S0 AND NOT QA5;\n',
    hints: ['Zwei Selbsthaltungen, jeweils mit  AND NOT  des anderen Schützes.', 'QA5 := (SJ6 OR QA5) AND S0 AND NOT QA6;'],
    checks: [
      c('Links starten', (t) => {
        t.press('SJ6');
        t.expect('QA5', true);
        t.expect('QA6', false);
      }),
      c('Rechts starten', (t) => {
        t.press('SJ7');
        t.expect('QA6', true);
        t.expect('QA5', false);
      }),
      c('Umschalten ohne Stopp verboten', (t) => {
        t.press('SJ6');
        t.press('SJ7');
        t.expect('QA6', false, 'Solange QA5 läuft, darf QA6 nicht einschalten.');
        t.expect('QA5', true);
      }),
      c('beide Taster gleichzeitig → nie beide Schütze', (t) => {
        t.set('SJ6', true);
        t.set('SJ7', true);
        t.hold(300, () => !(t.get('QA5') && t.get('QA6')), 'QA5 und QA6 waren gleichzeitig an – Kurzschluss!');
      }),
      c('Stopp', (t) => {
        t.press('SJ6');
        t.press('S0');
        t.expect('QA5', false);
      }),
    ],
    xp: 30,
  },

  // ---------------- Kapitel 6: Flanken ----------------
  {
    id: 'e-stromstoss',
    title: 'Stromstoßschalter (Flanke)',
    task: `Mit **jedem Druck** auf **S1** soll die Lampe **H1** umschalten: an – aus – an – …

Ohne Flanke klappt das nicht, weil der Taster viele SPS-Zyklen lang gedrückt ist.

1. Variablen: \`Flanke_S1 : R_TRIG;\`
2. Code: Flanke aufrufen, dann bei \`Flanke_S1.Q\` die Lampe umschalten.`,
    scenario: panel([btn('S1', 'Taster')], [lamp('H1', 'Licht', 'yellow')]),
    vars: 'VAR\n\t\nEND_VAR',
    solVars: 'VAR\n\tFlanke_S1 : R_TRIG;\nEND_VAR',
    solCode: 'Flanke_S1(CLK := S1);\nIF Flanke_S1.Q THEN\n  H1 := NOT H1;\nEND_IF;\n',
    hints: ['Aufruf:  Flanke_S1(CLK := S1);', 'Umschalten:  IF Flanke_S1.Q THEN H1 := NOT H1; END_IF;'],
    checks: [
      c('1× drücken → an', (t) => {
        t.press('S1', 300);
        t.expect('H1', true, 'Nach einem Druck muss das Licht an sein – auch wenn man den Taster lange hält.');
      }),
      c('2× drücken → aus', (t) => {
        t.press('S1', 300);
        t.press('S1', 300);
        t.expect('H1', false);
      }),
      c('3× drücken → an', (t) => {
        t.press('S1');
        t.press('S1');
        t.press('S1');
        t.expect('H1', true);
      }),
      c('Taster lange halten flackert nicht', (t) => {
        t.set('S1', true);
        t.wait(30);
        const v = t.get('H1');
        t.hold(1000, () => t.get('H1') === v, 'H1 hat sich während des Haltens verändert – ohne Flanke schaltet es jeden Zyklus um');
      }),
    ],
    xp: 30,
  },
  {
    id: 'e-impulse',
    title: 'Impulse zählen wie BG12',
    task: `Der Sensor **BG12** an eurer Achse liefert beim Fahren Impulse. Gezählt wird bei der **fallenden Flanke** (↓BG12).

- Zähle die fallenden Flanken von **BG12** in der Variable **C1** (INT).
- **PF33** soll leuchten, sobald **C1 >= 5** ist.
- **SJ2** setzt C1 auf 0 zurück.

Probiere in der Anlage: Sensor BG12 mehrmals an und aus klicken.`,
    scenario: panel([sens('BG12', 'Impulsgeber'), btn('SJ2', 'Zähler zurücksetzen')], [lamp('PF33', 'Ziel erreicht', 'green')]),
    vars: 'VAR\n\tC1 : INT;\n\t\nEND_VAR',
    solVars: 'VAR\n\tC1 : INT;\n\tFT_BG12 : F_TRIG;\nEND_VAR',
    solCode: 'FT_BG12(CLK := BG12);\nIF FT_BG12.Q THEN\n  C1 := C1 + 1;\nEND_IF;\nIF SJ2 THEN\n  C1 := 0;\nEND_IF;\nPF33 := C1 >= 5;\n',
    hints: ['Variable:  FT_BG12 : F_TRIG;', 'Ohne Flanke würde  C1 := C1 + 1;  in jedem Zyklus (alle 10 ms) zählen – genau der Fehler aus dem Prototyp.'],
    checks: [
      c('3 Impulse → C1 = 3', (t) => {
        for (let i = 0; i < 3; i++) {
          t.set('BG12', true);
          t.wait(100);
          t.set('BG12', false);
          t.wait(100);
        }
        t.expect('C1', 3, 'Pro Impuls genau +1 – dafür brauchst du die Flanke.');
        t.expect('PF33', false);
      }),
      c('Zählt erst beim Loslassen (fallende Flanke)', (t) => {
        t.set('BG12', true);
        t.wait(200);
        t.expect('C1', 0, 'Bei 0→1 darf noch nicht gezählt werden: F_TRIG nehmen.');
        t.set('BG12', false);
        t.wait(50);
        t.expect('C1', 1);
      }),
      c('5 Impulse → PF33', (t) => {
        for (let i = 0; i < 5; i++) {
          t.set('BG12', true);
          t.wait(60);
          t.set('BG12', false);
          t.wait(60);
        }
        t.expect('PF33', true);
      }),
      c('SJ2 setzt zurück', (t) => {
        t.set('BG12', true);
        t.wait(60);
        t.set('BG12', false);
        t.wait(60);
        t.press('SJ2');
        t.expect('C1', 0);
      }),
    ],
    xp: 30,
  },

  // ---------------- Kapitel 7: Timer ----------------
  {
    id: 'e-ton',
    title: 'Einschaltverzögerung TON',
    task: `Die Lampe **H1** soll erst leuchten, wenn **S1** mindestens **3 Sekunden** gedrückt gehalten wird. Lässt man los, geht sie sofort aus.`,
    scenario: panel([btn('S1', 'Taster halten')], [lamp('H1', 'Lampe', 'yellow')]),
    vars: 'VAR\n\t\nEND_VAR',
    solVars: 'VAR\n\tT_S1 : TON;\nEND_VAR',
    solCode: 'T_S1(IN := S1, PT := T#3s);\nH1 := T_S1.Q;\n',
    hints: ['Variable:  T_S1 : TON;', 'Aufruf:  T_S1(IN := S1, PT := T#3s);  danach  H1 := T_S1.Q;'],
    checks: [
      c('nach 2,5 s noch aus', (t) => {
        t.set('S1', true);
        t.wait(2500);
        t.expect('H1', false, 'Zu früh! PT muss T#3s sein.');
      }),
      c('nach 3 s an', (t) => {
        t.set('S1', true);
        t.wait(3100);
        t.expect('H1', true);
      }),
      c('loslassen → sofort aus', (t) => {
        t.set('S1', true);
        t.wait(3100);
        t.set('S1', false);
        t.wait(30);
        t.expect('H1', false);
      }),
      c('kurz loslassen startet neu', (t) => {
        t.set('S1', true);
        t.wait(2000);
        t.set('S1', false);
        t.wait(50);
        t.set('S1', true);
        t.wait(2000);
        t.expect('H1', false, 'Der TON muss nach dem Loslassen wieder bei 0 anfangen.');
      }),
    ],
    xp: 25,
  },
  {
    id: 'e-treppenlicht',
    title: 'Treppenhauslicht (TOF)',
    task: `Ein kurzer Druck auf **S1** schaltet das Licht **H1** ein. Nach dem Loslassen bleibt es noch **5 s** an.

Nimm dafür den Baustein **TOF** (Ausschaltverzögerung).`,
    scenario: panel([btn('S1', 'Lichttaster')], [lamp('H1', 'Licht', 'yellow')]),
    vars: 'VAR\n\t\nEND_VAR',
    solVars: 'VAR\n\tT_Licht : TOF;\nEND_VAR',
    solCode: 'T_Licht(IN := S1, PT := T#5s);\nH1 := T_Licht.Q;\n',
    hints: ['TOF: Q wird sofort TRUE, wenn IN TRUE ist, und bleibt nach dem Abfallen von IN noch PT lang an.'],
    checks: [
      c('Druck → sofort an', (t) => {
        t.set('S1', true);
        t.wait(30);
        t.expect('H1', true);
      }),
      c('4,5 s nach Loslassen noch an', (t) => {
        t.press('S1', 200);
        t.wait(4400);
        t.expect('H1', true);
      }),
      c('nach 5 s aus', (t) => {
        t.press('S1', 200);
        t.wait(5200);
        t.expect('H1', false);
      }),
    ],
    xp: 25,
  },
  {
    id: 'e-blinker',
    title: 'Blinktakt 1 Hz',
    task: `Wenn der Schalter **S1** an ist, soll **H1** im **1-Hz-Takt** blinken: 0,5 s an, 0,5 s aus. Das ist genau euer Teil-GRAFCET **G_Takt**.

Baue es mit **zwei TON** und einer **Schrittvariable**:
- Schritt 100: Lampe aus, nach 0,5 s → Schritt 101
- Schritt 101: Lampe an, nach 0,5 s → Schritt 100

Ist S1 aus, ist H1 aus.`,
    scenario: panel([sw('S1', 'Blinker ein')], [lamp('H1', 'Blinklicht', 'yellow')]),
    vars: 'VAR\n\tiStep : INT := 100;\n\t\nEND_VAR',
    solVars: 'VAR\n\tiStep : INT := 100;\n\tT_X100 : TON;\n\tT_X101 : TON;\nEND_VAR',
    solCode:
      'T_X100(IN := iStep = 100, PT := T#500ms);\nT_X101(IN := iStep = 101, PT := T#500ms);\n\nCASE iStep OF\n  100: IF T_X100.Q THEN iStep := 101; END_IF;\n  101: IF T_X101.Q THEN iStep := 100; END_IF;\nELSE\n  iStep := 100;\nEND_CASE;\n\nH1 := S1 AND (iStep = 101);\n',
    hints: [
      'Die Timer messen, wie lange ein Schritt schon aktiv ist:  T_X100(IN := iStep = 100, PT := T#500ms);',
      'Mit CASE iStep OF … wechselst du den Schritt, wenn der Timer abgelaufen ist.',
      'Ausgang:  H1 := S1 AND (iStep = 101);',
    ],
    checks: [
      c('S1 aus → H1 bleibt aus', (t) => {
        t.hold(1500, () => t.get('H1') === false, 'H1 war an, obwohl S1 aus ist');
      }),
      c('S1 an → H1 blinkt mit 1 Hz', (t) => {
        t.set('S1', true);
        t.wait(20);
        const on: number[] = [];
        let prev = t.get('H1');
        for (let i = 0; i < 300; i++) {
          t.wait(10);
          const v = t.get('H1');
          if (v && !prev) on.push(t.e.t);
          prev = v;
        }
        if (on.length < 2) throw new CheckFail('H1 blinkt nicht.', 'Prüfe die beiden Timer und die Schrittwechsel.');
        const period = on[1]! - on[0]!;
        if (Math.abs(period - 1000) > 60) throw new CheckFail(`Ein Blinktakt dauert ${period} ms statt 1000 ms.`, 'Je 0,5 s an und aus: PT := T#500ms.');
      }),
      c('Leuchtdauer 0,5 s', (t) => {
        t.set('S1', true);
        t.until(() => t.get('H1') === true, 2000, 'H1 geht nie an');
        const d = t.until(() => t.get('H1') === false, 2000, 'H1 geht nicht mehr aus');
        if (Math.abs(d - 500) > 40) throw new CheckFail(`H1 war ${d} ms an statt 500 ms.`);
      }),
    ],
    xp: 35,
  },

  // ---------------- Kapitel 8: Zähler, Vergleicher ----------------
  {
    id: 'e-ctu',
    title: 'Teile zählen mit CTU',
    task: `Ein Sensor **B1** meldet jedes Teil auf einem Band. Nach **3 Teilen** soll **H1** („Karton voll“) leuchten. **S0** setzt den Zähler zurück.

Benutze den Zählerbaustein **CTU** (Eingänge CU, R, PV – Ausgänge Q, CV).`,
    scenario: panel([sens('B1', 'Teil erkannt'), btn('S0', 'Reset')], [lamp('H1', 'Karton voll', 'green')]),
    vars: 'VAR\n\t\nEND_VAR',
    solVars: 'VAR\n\tZaehler : CTU;\nEND_VAR',
    solCode: 'Zaehler(CU := B1, R := S0, PV := 3);\nH1 := Zaehler.Q;\n',
    hints: ['Variable:  Zaehler : CTU;', 'CTU zählt selbst bei steigender Flanke an CU – du brauchst hier kein R_TRIG.', 'Zaehler(CU := B1, R := S0, PV := 3);  H1 := Zaehler.Q;'],
    checks: [
      c('2 Teile → noch nicht voll', (t) => {
        for (let i = 0; i < 2; i++) {
          t.set('B1', true);
          t.wait(80);
          t.set('B1', false);
          t.wait(80);
        }
        t.expect('H1', false);
      }),
      c('3 Teile → voll', (t) => {
        for (let i = 0; i < 3; i++) {
          t.set('B1', true);
          t.wait(80);
          t.set('B1', false);
          t.wait(80);
        }
        t.expect('H1', true);
      }),
      c('Reset', (t) => {
        for (let i = 0; i < 3; i++) {
          t.set('B1', true);
          t.wait(80);
          t.set('B1', false);
          t.wait(80);
        }
        t.press('S0');
        t.expect('H1', false);
      }),
    ],
    xp: 25,
  },
  {
    id: 'e-position',
    title: 'Auf Position fahren',
    task: `So positioniert eure Achse:

- **SJ5** startet den Motor **QA5**.
- Jede **fallende Flanke** von **BG12** zählt **C1** um 1 hoch.
- Bei **C1 = C2** stoppt der Motor. **C2** ist die Sollposition, hier **10**.
- Beim Start wird C1 auf 0 gesetzt.

Klicke in der Anlage BG12 an und aus, um das Fahren zu simulieren.`,
    scenario: panel([btn('SJ5', 'Start'), sens('BG12', 'Impulsgeber')], [motor('QA5', 'Linksfahrt')]),
    vars: 'VAR\n\tC1 : INT;\n\tC2 : INT := 10;\n\t\nEND_VAR',
    solVars: 'VAR\n\tC1 : INT;\n\tC2 : INT := 10;\n\tFT_BG12 : F_TRIG;\nEND_VAR',
    solCode:
      'FT_BG12(CLK := BG12);\n\nIF SJ5 AND NOT QA5 THEN\n  C1 := 0;\n  QA5 := TRUE;\nEND_IF;\n\nIF QA5 AND FT_BG12.Q THEN\n  C1 := C1 + 1;\nEND_IF;\n\nIF C1 = C2 THEN\n  QA5 := FALSE;\nEND_IF;\n',
    hints: ['Start:  IF SJ5 AND NOT QA5 THEN C1 := 0; QA5 := TRUE; END_IF;', 'Zählen nur bei laufendem Motor:  IF QA5 AND FT_BG12.Q THEN C1 := C1 + 1; END_IF;', 'Stopp:  IF C1 = C2 THEN QA5 := FALSE; END_IF;'],
    checks: [
      c('Start → Motor läuft', (t) => {
        t.press('SJ5');
        t.expect('QA5', true);
      }),
      c('nach 9 Impulsen läuft er noch', (t) => {
        t.press('SJ5');
        for (let i = 0; i < 9; i++) {
          t.set('BG12', true);
          t.wait(40);
          t.set('BG12', false);
          t.wait(40);
        }
        t.expect('QA5', true, 'Der Motor hat zu früh gestoppt.');
        t.expect('C1', 9);
      }),
      c('nach 10 Impulsen Stopp', (t) => {
        t.press('SJ5');
        for (let i = 0; i < 10; i++) {
          t.set('BG12', true);
          t.wait(40);
          t.set('BG12', false);
          t.wait(40);
        }
        t.expect('QA5', false, 'Bei C1 = C2 (10) muss der Motor stoppen.');
      }),
      c('neuer Start beginnt bei 0', (t) => {
        t.press('SJ5');
        for (let i = 0; i < 10; i++) {
          t.set('BG12', true);
          t.wait(40);
          t.set('BG12', false);
          t.wait(40);
        }
        t.press('SJ5');
        t.expect('C1', 0, 'Beim Start muss C1 := 0 gesetzt werden.');
        t.expect('QA5', true);
      }),
    ],
    xp: 35,
  },

  // ---------------- Kapitel 9: Analog ----------------
  {
    id: 'e-analog',
    title: 'Druck skalieren',
    task: `Ein Drucksensor liefert an **B1** einen Rohwert von **0 … 27648** für **0 … 10 bar**.

1. Rechne den Wert in **bar** um und speichere ihn in **rDruck** (REAL).
2. **H1** (grün, „Druck i. O.“) soll leuchten, wenn **rDruck > 3.5** bar ist.
3. **H2** (rot) soll leuchten, wenn der Druck zu niedrig ist.

Formel:  Wert = Rohwert / 27648 * 10`,
    scenario: panel([ana('B1', 'Drucksensor (Rohwert)')], [lamp('H1', 'Druck i. O.', 'green'), lamp('H2', 'Druck zu niedrig', 'red')]),
    vars: 'VAR\n\trDruck : REAL;\t(* bar *)\nEND_VAR',
    solVars: 'VAR\n\trDruck : REAL;\t(* bar *)\nEND_VAR',
    solCode: 'rDruck := INT_TO_REAL(B1) / 27648.0 * 10.0;\nH1 := rDruck > 3.5;\nH2 := NOT H1;\n',
    hints: ['B1 ist INT, rDruck ist REAL. PC WORX rechnet nicht automatisch um:  INT_TO_REAL(B1)', 'Rechne mit Kommazahlen:  / 27648.0 * 10.0'],
    checks: [
      c('Rohwert 27648 → 10 bar', (t) => {
        t.set('B1', 27648);
        t.wait(30);
        const v = t.get('rDruck') as number;
        if (Math.abs(v - 10) > 0.01) throw new CheckFail(`rDruck ist ${v} statt 10.0.`, 'Formel: INT_TO_REAL(B1) / 27648.0 * 10.0');
      }),
      c('Rohwert 13824 → 5 bar → H1', (t) => {
        t.set('B1', 13824);
        t.wait(30);
        const v = t.get('rDruck') as number;
        if (Math.abs(v - 5) > 0.01) throw new CheckFail(`rDruck ist ${v} statt 5.0.`);
        t.expect('H1', true);
        t.expect('H2', false);
      }),
      c('Rohwert 8000 (≈ 2,9 bar) → H2', (t) => {
        t.set('B1', 8000);
        t.wait(30);
        t.expect('H1', false);
        t.expect('H2', true);
      }),
    ],
    xp: 30,
  },

  // ---------------- Kapitel 10: Schrittketten ----------------
  {
    id: 'e-kette',
    title: 'Erste Schrittkette mit CASE',
    task: `Ein Zylinder soll ausfahren, warten und wieder einfahren.

- **Schritt 0:** Warten auf Start **S1** und Zylinder eingefahren **B1** → Schritt 1
- **Schritt 1:** **Y1** (ausfahren). Wenn **B2** (ausgefahren) → Schritt 2
- **Schritt 2:** **H1** leuchtet. Nach **2 s** → Schritt 3
- **Schritt 3:** **Y2** (einfahren). Wenn **B1** → Schritt 0

Muster: (1) Timer aufrufen, (2) CASE nur für Weiterschalten, (3) Aktionen danach zuweisen.`,
    scenario: panel(
      [btn('S1', 'Start'), sens('B1', 'Zylinder eingefahren'), sens('B2', 'Zylinder ausgefahren')],
      [valve('Y1', 'ausfahren'), valve('Y2', 'einfahren'), lamp('H1', 'Warten', 'yellow')],
    ),
    vars: 'VAR\n\tiStep : INT := 0;\n\t\nEND_VAR',
    solVars: 'VAR\n\tiStep : INT := 0;\n\tT_X2 : TON;\nEND_VAR',
    code: '(* 1. Timer *)\n\n(* 2. Weiterschalten *)\nCASE iStep OF\n  0: IF S1 AND B1 THEN iStep := 1; END_IF;\n\nEND_CASE;\n\n(* 3. Aktionen *)\n',
    solCode:
      '(* 1. Timer *)\nT_X2(IN := iStep = 2, PT := T#2s);\n\n(* 2. Weiterschalten *)\nCASE iStep OF\n  0: IF S1 AND B1 THEN iStep := 1; END_IF;\n  1: IF B2 THEN iStep := 2; END_IF;\n  2: IF T_X2.Q THEN iStep := 3; END_IF;\n  3: IF B1 THEN iStep := 0; END_IF;\nEND_CASE;\n\n(* 3. Aktionen *)\nY1 := iStep = 1;\nH1 := iStep = 2;\nY2 := iStep = 3;\n',
    hints: ['Für Schritt 2 brauchst du einen TON, der läuft, solange iStep = 2 ist:  T_X2(IN := iStep = 2, PT := T#2s);', 'Aktionen ganz unten:  Y1 := iStep = 1;  usw.'],
    checks: [
      c('Start ohne B1 → nichts passiert', (t) => {
        t.press('S1');
        t.expect('Y1', false, 'Startbedingung: S1 UND B1.');
      }),
      c('Start → Y1', (t) => {
        t.set('B1', true);
        t.press('S1');
        t.expect('Y1', true);
        t.expect('iStep', 1);
      }),
      c('B2 → Warten mit H1, Y1 aus', (t) => {
        t.set('B1', true);
        t.press('S1');
        t.set('B1', false);
        t.set('B2', true);
        t.wait(50);
        t.expect('H1', true);
        t.expect('Y1', false);
      }),
      c('nach 2 s → Y2, dann zurück zu 0', (t) => {
        t.set('B1', true);
        t.press('S1');
        t.set('B1', false);
        t.set('B2', true);
        t.wait(1800);
        t.expect('Y2', false, 'Zu früh weitergeschaltet.');
        t.wait(400);
        t.expect('Y2', true);
        t.set('B2', false);
        t.set('B1', true);
        t.wait(50);
        t.expect('iStep', 0);
        t.expect('Y2', false);
      }),
    ],
    xp: 40,
  },
  // ---------------- Kapitel 10: Bausteine ----------------
  {
    id: 'e-fb',
    title: 'Eigener Funktionsbaustein',
    task: `Zwei Motoren sollen beide mit Selbsthaltung laufen. Statt die Logik zweimal zu schreiben, baust du **einen Funktionsbaustein FB_Motor** – und Main benutzt ihn **zweimal** (zwei Instanzen).

**Main ist schon fertig** (🔒, schau es dir an). Schreibe den Baustein **FB_Motor**:
- Eingänge: **xStart** (Schließer), **xStop** (Öffner – nicht gedrückt = TRUE)
- Ausgang: **xQ** (Motor läuft, mit Selbsthaltung, Stopp dominant)`,
    scenario: panel([btn('S1', 'Start Motor 1'), btn('S2', 'Start Motor 2'), nc('S0', 'Stopp (Öffner)')], [motor('M1', 'Motor 1'), motor('M2', 'Motor 2')]),
    pous: [
      {
        name: 'Main',
        kind: 'PROGRAM',
        readonly: true,
        vars: 'VAR_EXTERNAL\n\tS1 : BOOL;\n\tS2 : BOOL;\n\tS0 : BOOL;\n\tM1 : BOOL;\n\tM2 : BOOL;\nEND_VAR\n\nVAR\n\tMotor1 : FB_Motor;\t(* erste Instanz *)\n\tMotor2 : FB_Motor;\t(* zweite Instanz *)\nEND_VAR',
        code: 'Motor1(xStart := S1, xStop := S0);\nM1 := Motor1.xQ;\n\nMotor2(xStart := S2, xStop := S0);\nM2 := Motor2.xQ;\n',
      },
      {
        name: 'FB_Motor',
        kind: 'FUNCTION_BLOCK',
        vars: 'VAR_INPUT\n\txStart : BOOL;\n\txStop : BOOL;\t(* Öffner *)\nEND_VAR\n\nVAR_OUTPUT\n\txQ : BOOL;\nEND_VAR',
        code: '',
      },
    ],
    solPous: [
      {
        name: 'FB_Motor',
        kind: 'FUNCTION_BLOCK',
        vars: 'VAR_INPUT\n\txStart : BOOL;\n\txStop : BOOL;\t(* Öffner *)\nEND_VAR\n\nVAR_OUTPUT\n\txQ : BOOL;\nEND_VAR',
        code: 'xQ := (xStart OR xQ) AND xStop;\n',
      },
    ],
    focusPou: 'FB_Motor',
    solCode: '',
    hints: ['Im Baustein arbeitest du nur mit seinen eigenen Ein- und Ausgängen – S1, M1 usw. kennt er nicht.', 'xQ := (xStart OR xQ) AND xStop;'],
    checks: [
      c('S1 → nur Motor 1', (t) => {
        t.press('S1');
        t.expect('M1', true);
        t.expect('M2', false, 'Jede Instanz hat ihren eigenen Speicher.');
      }),
      c('S2 → nur Motor 2', (t) => {
        t.press('S2');
        t.expect('M2', true);
        t.expect('M1', false);
      }),
      c('S0 stoppt beide', (t) => {
        t.press('S1');
        t.press('S2');
        t.press('S0');
        t.expect('M1', false);
        t.expect('M2', false);
      }),
    ],
    xp: 35,
  },
];

export const EXERCISE_MAP: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
