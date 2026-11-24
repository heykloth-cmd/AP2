/**
 * Lernpfad: von null bis zur Schrittkette nach GRAFCET.
 * Texte bewusst kurz – lieber viele kleine Karten als eine Textwand.
 */
import { G_EINRICHT, G_TAKT } from './exam/grafcets';
import type { Chapter } from './types';

export const CHAPTERS: Chapter[] = [
  // =====================================================================
  {
    id: 'k1',
    title: 'SPS-Grundlagen',
    icon: '🔌',
    lessons: [
      {
        id: 'l-sps',
        title: 'Was macht eine SPS?',
        goal: 'Eingänge, Ausgänge und der SPS-Zyklus',
        minutes: 5,
        cards: [
          {
            type: 'text',
            title: 'Die SPS ist ein Rechner mit Klemmen',
            body: `Eine **SPS** (speicherprogrammierbare Steuerung) ist ein kleiner Industrierechner. Bei euch ist es eine **AXC 1050** von Phoenix Contact.

- An den **Eingängen** hängen Taster, Schalter und Sensoren, z. B. **SJ5** (Start) oder **BG13** (Endlage).
- An den **Ausgängen** hängen Lampen, Ventile und Schütze, z. B. **PF3** (Leuchtmelder) oder **QA5** (Motorschütz).
- Dein **Programm** entscheidet, welcher Ausgang wann eingeschaltet wird.`,
          },
          {
            type: 'text',
            title: 'Der SPS-Zyklus',
            body: `Die SPS arbeitet in einer Endlosschleife, dem **Zyklus**. Ein Zyklus dauert nur wenige Millisekunden (im Simulator 10 ms):

1. **Eingänge lesen** – alle Eingänge werden auf einmal eingelesen (Prozessabbild).
2. **Programm abarbeiten** – Zeile für Zeile, von oben nach unten.
3. **Ausgänge schreiben** – erst am Ende gehen die Ergebnisse an die Klemmen.

Dann geht es von vorne los. Hundert Mal pro Sekunde!

> Merke: Dein Programm läuft nicht „einmal“, sondern ständig. Jede Zeile wird in jedem Zyklus neu ausgeführt.`,
          },
          {
            type: 'text',
            title: 'Adressen und Namen',
            body: `Jeder Eingang und Ausgang hat eine **Adresse**:

| Adresse | Bedeutung |
|---|---|
| \`%IX0.0\` | **I**nput, Bit (**X**), Byte 0, Bit 0 |
| \`%QX4.6\` | **Q** = Ausgang, Byte 4, Bit 6 |
| \`%IW8\` | Eingang, ein ganzes **W**ort (16 Bit, z. B. Analogwert) |

Im Programm benutzt man aber **Namen** statt Adressen. In der globalen Variablenliste eures PC-WORX-Projekts steht z. B.:

\`\`\`
SJ5  AT %IX0.3 : BOOL;
QA5  AT %QX4.6 : BOOL;
\`\`\`

> PC WORX: Die Betriebsmittelkennzeichnung aus dem Schaltplan heißt **-SJ5**. In PC WORX darf ein Name aber **keinen Bindestrich** haben, deshalb heißt die Variable **SJ5**.`,
          },
          {
            type: 'quiz',
            question: 'In welcher Reihenfolge arbeitet die SPS einen Zyklus ab?',
            options: ['Programm → Eingänge lesen → Ausgänge schreiben', 'Eingänge lesen → Programm → Ausgänge schreiben', 'Ausgänge schreiben → Programm → Eingänge lesen'],
            correct: 1,
            explain: 'Erst werden alle Eingänge gelesen, dann läuft das Programm, und am Ende werden alle Ausgänge auf einmal geschrieben.',
          },
          {
            type: 'quiz',
            question: 'Welcher Variablenname ist in PC WORX erlaubt?',
            options: ['-SJ3', 'SJ3', '3SJ', 'SJ 3'],
            correct: 1,
            explain: 'Namen bestehen aus Buchstaben, Ziffern und _. Sie dürfen nicht mit einer Ziffer beginnen und keine Leer- oder Sonderzeichen wie - enthalten. Umlaute (ä, ö, ü) besser auch vermeiden.',
          },
        ],
      },
      {
        id: 'l-erstes',
        title: 'Dein erstes Programm',
        goal: 'Zuweisung mit :=  und der Simulator',
        minutes: 6,
        cards: [
          {
            type: 'text',
            title: 'Die Zuweisung',
            body: `Der wichtigste Befehl in ST ist die **Zuweisung**:

\`\`\`
H1 := S1;
\`\`\`

Lies es so: „**H1 bekommt den Wert von S1**“.

- \`:=\` ist das Zuweisungszeichen (Doppelpunkt + Gleich, ohne Leerzeichen dazwischen).
- Links steht das **Ziel** (meist ein Ausgang), rechts der **Wert**.
- Jede Anweisung endet mit einem **Semikolon** \`;\`.

> Achtung: Ein einfaches \`=\` ist in ST ein **Vergleich**, keine Zuweisung. \`H1 = S1;\` ist ein Fehler.`,
          },
          {
            type: 'text',
            title: 'TRUE und FALSE',
            body: `Ein Taster oder eine Lampe ist entweder **an** oder **aus**. In ST heißt das:

- \`TRUE\` = 1 = an / betätigt
- \`FALSE\` = 0 = aus / nicht betätigt

\`\`\`
H1 := TRUE;    (* Lampe immer an *)
H2 := FALSE;   (* Lampe immer aus *)
\`\`\`

Alles zwischen \`(*\` und \`*)\` ist ein **Kommentar**. Die SPS ignoriert ihn, für Menschen ist er Gold wert.

> PC WORX: Kommentare mit \`//\` gibt es in PC WORX 6 nicht – nur \`(* … *)\`.`,
          },
          {
            type: 'text',
            title: 'So funktioniert der Simulator',
            body: `In der nächsten Karte probierst du es selbst:

1. Schreibe deinen Code in den Reiter **Code**.
2. Drücke **▶ Start**. Das Programm wird übersetzt, „auf die SPS geladen“ und läuft.
3. Im Reiter **Anlage** drückst du Taster und siehst die Lampen.
4. **✓ Programm prüfen** testet automatisch, ob alles stimmt.

Fehler werden sofort beim Tippen angezeigt, mit Zeilennummer und Tipp.

> Tipp: Auf dem Handy gibt es unter dem Editor Schnelltasten für \`:=\`, \`;\`, \`AND\` usw.`,
          },
          { type: 'exercise', id: 'e-erstes' },
        ],
      },
      {
        id: 'l-oeffner',
        title: 'Schließer und Öffner',
        goal: 'Warum ein Stopp-Taster FALSE liefert, wenn man ihn drückt',
        minutes: 5,
        cards: [
          {
            type: 'text',
            title: 'Schließer (NO)',
            body: `Ein **Schließer** schließt beim Drücken den Kontakt.
- nicht gedrückt → **FALSE**
- gedrückt → **TRUE**

Start-Taster wie **SJ5** sind Schließer.`,
          },
          {
            type: 'text',
            title: 'Öffner (NC) – drahtbruchsicher',
            body: `Ein **Öffner** öffnet beim Drücken den Kontakt.
- nicht gedrückt → **TRUE**
- gedrückt → **FALSE**

Warum so umständlich? **Drahtbruchsicherheit**: Reißt ein Kabel, kommt FALSE an, genau wie beim Drücken. Die Anlage stoppt also auch bei einem Kabelbruch. Deshalb sind **Stopp**-Taster immer Öffner.

> Beispiel: Bei euch meldet **KE2** „NOT-AUS **o. k.**“. KE2 = TRUE heißt alles in Ordnung. Wird NOT-AUS gedrückt oder bricht ein Draht, wird KE2 FALSE. Dasselbe gilt für **FC7** „Motorschutz **i. O.**“ und **BP1** „Druck vorhanden“.`,
          },
          {
            type: 'quiz',
            question: 'FC7 meldet „Motorschutz i. O.“. Der Motorschutz löst aus. Welchen Wert hat FC7?',
            options: ['TRUE', 'FALSE'],
            correct: 1,
            explain: 'FC7 = TRUE heißt „in Ordnung“. Löst der Motorschutz aus, wird FC7 FALSE – deshalb steht im GRAFCET bei PF5 „Motorschutz ausgelöst“ die Bedingung ~~FC7~~ (NOT FC7).',
          },
          { type: 'exercise', id: 'e-oeffner' },
        ],
      },
    ],
  },
  // =====================================================================
  {
    id: 'k2',
    title: 'Variablen & Datentypen',
    icon: '📦',
    lessons: [
      {
        id: 'l-datentypen',
        title: 'Datentypen',
        goal: 'BOOL, INT, REAL, TIME – was passt wohin?',
        minutes: 6,
        cards: [
          {
            type: 'text',
            title: 'Jede Variable hat einen Typ',
            body: `Eine **Variable** ist ein beschrifteter Speicherplatz. Der **Datentyp** legt fest, was hineinpasst:

| Typ | Inhalt | Beispiel |
|---|---|---|
| \`BOOL\` | TRUE / FALSE | Taster, Lampe, Sensor |
| \`INT\` | ganze Zahl −32768 … 32767 | Zähler C1, Schrittnummer |
| \`DINT\` | große ganze Zahl | |
| \`REAL\` | Kommazahl | Druck in bar: 3.5 |
| \`TIME\` | Zeitdauer | \`T#2s\`, \`T#500ms\` |

> Achtung: Kommazahlen schreibt man mit **Punkt**: \`3.5\`, nicht \`3,5\`.`,
          },
          {
            type: 'text',
            title: 'Variablen deklarieren',
            body: `Bevor du eine eigene Variable benutzt, musst du sie **deklarieren** (anmelden):

\`\`\`
VAR
  iStep   : INT := 100;   (* Startwert 100 *)
  C1      : INT;          (* Startwert 0 *)
  xFertig : BOOL;
  T_X503  : TON;          (* ein Timer-Baustein *)
END_VAR
\`\`\`

Aufbau: **Name : Typ := Startwert;** – der Startwert ist freiwillig.

> PC WORX: Jeder Baustein hat ein eigenes **Variablen-Arbeitsblatt** (Tabelle mit Name, Typ, Gültigkeit, Anfangswert, Kommentar). Im Trainer ist das der Reiter **Variablen**. Dort schreibst du es als Text, so wie PC WORX es intern speichert.`,
          },
          {
            type: 'text',
            title: 'Globale Variablen und VAR_EXTERNAL',
            body: `Die Ein- und Ausgänge stehen in der **globalen Variablenliste** des Projekts, mit Adresse (\`AT %IX…\`). Ein Baustein darf sie aber nur benutzen, wenn er sie als **VAR_EXTERNAL** einbindet:

\`\`\`
VAR_EXTERNAL
  SJ5 : BOOL;
  QA5 : BOOL;
END_VAR
\`\`\`

Vergisst du das, meldet PC WORX (und der Trainer) einen Fehler.

> Tipp: Den Reiter **Global** im Trainer kannst du jederzeit aufmachen. Dort stehen alle Ein- und Ausgänge mit Adressen, so wie in eurem Projekt.`,
          },
          {
            type: 'quiz',
            question: 'Welche Deklaration ist richtig?',
            options: ['Zaehler := INT;', 'Zaehler : INT := 0;', 'INT Zaehler = 0;', 'Zaehler : INT = 0;'],
            correct: 1,
            explain: 'Name, Doppelpunkt, Typ, optional := Startwert, Semikolon.',
          },
          {
            type: 'quiz',
            question: 'Welcher Typ passt für „Druck in bar“, z. B. 3.5?',
            options: ['BOOL', 'INT', 'REAL', 'TIME'],
            correct: 2,
            explain: 'Kommazahlen brauchen REAL. INT kann nur ganze Zahlen.',
          },
        ],
      },
      {
        id: 'l-rechnen',
        title: 'Rechnen und Vergleichen',
        goal: '+ − * /, Vergleiche, Typumwandlung',
        minutes: 5,
        cards: [
          {
            type: 'text',
            title: 'Rechnen',
            body: `\`\`\`
C1 := C1 + 1;        (* um 1 erhöhen *)
C1 := C1 - 1;        (* um 1 verringern *)
Mitte := (A + B) / 2;
Rest := C1 MOD 2;    (* Rest der Division *)
\`\`\`

\`C1 := C1 + 1;\` heißt: Nimm den alten Wert von C1, zähle 1 dazu und speichere das Ergebnis wieder in C1.

> Achtung: Bei INT ist \`7 / 2\` = **3** (Nachkommastellen fallen weg).`,
          },
          {
            type: 'text',
            title: 'Vergleiche ergeben TRUE oder FALSE',
            body: `| Zeichen | Bedeutung |
|---|---|
| \`=\` | gleich |
| \`<>\` | ungleich |
| \`<\`  \`>\` | kleiner, größer |
| \`<=\`  \`>=\` | kleiner gleich, größer gleich |

Das Ergebnis eines Vergleichs ist ein BOOL, den du direkt zuweisen kannst:

\`\`\`
PF33 := C1 >= 5;
xQA5 := iStep = 502;
\`\`\``,
          },
          {
            type: 'text',
            title: 'PC WORX ist streng',
            body: `PC WORX rechnet **nicht automatisch** zwischen Typen um. INT und REAL mischen geht nicht:

\`\`\`
rDruck := B1 / 27648.0 * 10.0;               (* Fehler: B1 ist INT *)
rDruck := INT_TO_REAL(B1) / 27648.0 * 10.0;  (* richtig *)
\`\`\`

Wichtige Umwandlungen: \`INT_TO_REAL\`, \`REAL_TO_INT\` (rundet), \`TRUNC\` (schneidet ab), \`INT_TO_DINT\`.`,
          },
          {
            type: 'quiz',
            question: 'C1 hat den Wert 4. Was steht nach  C1 := C1 + 1;  in C1?',
            options: ['1', '4', '5', 'Fehler'],
            correct: 2,
            explain: 'Alter Wert 4 plus 1 ergibt 5. Achtung: Steht diese Zeile ohne Bedingung im Programm, zählt sie in JEDEM Zyklus – also 100-mal pro Sekunde!',
          },
        ],
      },
    ],
  },
  // =====================================================================
  {
    id: 'k3',
    title: 'Logik: UND, ODER, NICHT',
    icon: '🔀',
    lessons: [
      {
        id: 'l-logik',
        title: 'Verknüpfungen',
        goal: 'AND, OR, NOT, XOR und Klammern',
        minutes: 7,
        cards: [
          {
            type: 'text',
            title: 'Die drei Grundverknüpfungen',
            body: `| ST | Bedeutung | Ergebnis TRUE, wenn … |
|---|---|---|
| \`A AND B\` | UND | **beide** TRUE sind |
| \`A OR B\` | ODER | **mindestens einer** TRUE ist |
| \`NOT A\` | NICHT | A FALSE ist |
| \`A XOR B\` | Exklusiv-ODER | **genau einer** TRUE ist |

\`\`\`
M1 := S1 AND S2;          (* Zweihandbedienung *)
H1 := S1 OR S2;           (* Klingel vorne oder hinten *)
H2 := NOT S0;             (* Öffner gedrückt *)
\`\`\``,
          },
          {
            type: 'text',
            title: 'Wahrheitstabelle',
            body: `| A | B | A AND B | A OR B | A XOR B |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 |
| 0 | 1 | 0 | 1 | 1 |
| 1 | 0 | 0 | 1 | 1 |
| 1 | 1 | 1 | 1 | 0 |`,
          },
          {
            type: 'text',
            title: 'Klammern setzen!',
            body: `**NOT** bindet am stärksten, dann **AND**, dann **XOR**, dann **OR**, genau wie „Punkt vor Strich“.

\`\`\`
H1 := S1 OR S2 AND NOT S3;    (* bedeutet: S1 OR (S2 AND NOT S3) *)
H1 := (S1 OR S2) AND NOT S3;  (* meistens gemeint *)
\`\`\`

> Tipp: Im Zweifel immer Klammern setzen. Das kostet nichts und verhindert Fehler.`,
          },
          {
            type: 'quiz',
            question: 'S1 = TRUE, S2 = FALSE, S3 = TRUE. Was ergibt  (S1 OR S2) AND NOT S3 ?',
            options: ['TRUE', 'FALSE'],
            correct: 1,
            explain: '(TRUE OR FALSE) = TRUE, NOT S3 = FALSE, TRUE AND FALSE = FALSE.',
          },
          { type: 'exercise', id: 'e-und' },
          { type: 'exercise', id: 'e-oder-nicht' },
        ],
      },
      {
        id: 'l-grafcet-logik',
        title: 'GRAFCET-Bedingungen lesen',
        goal: 'Stern, Plus und Überstrich in ST übersetzen',
        minutes: 6,
        cards: [
          {
            type: 'text',
            title: 'Die Schreibweise im GRAFCET',
            body: `In euren Prüfungsunterlagen stehen Bedingungen wie:

**KE2 * SJ3 * BP1 * ~~SJ4~~ * FC7**

| GRAFCET | ST |
|---|---|
| \`*\` (oder ·) | \`AND\` |
| \`+\` | \`OR\` |
| Strich über dem Namen | \`NOT\` |
| Bindestrich vor dem Namen (-SJ3) | weglassen → \`SJ3\` |

Übersetzt:
\`\`\`
KE2 AND SJ3 AND BP1 AND NOT SJ4 AND FC7
\`\`\``,
          },
          {
            type: 'text',
            title: 'ODER-Bedingungen',
            body: `Aus G_Hauptsteuerung, Rücksprung aus Schritt 5:

**~~KE2~~ + ~~BP1~~ + ~~SJ3~~ + ~~SJ4~~ + ~~FC7~~**

\`\`\`
NOT KE2 OR NOT BP1 OR NOT SJ3 OR NOT SJ4 OR NOT FC7
\`\`\`

Also: Die Anlage geht zurück in Schritt 1, sobald **irgendeine** Voraussetzung wegfällt.`,
          },
          {
            type: 'quiz',
            question: 'Wie lautet  SJ9 * ~~SJ8~~ * ~~BG22~~  in ST?',
            options: ['SJ9 OR NOT SJ8 OR NOT BG22', 'SJ9 AND NOT SJ8 AND NOT BG22', 'NOT (SJ9 AND SJ8 AND BG22)', 'SJ9 AND SJ8 AND BG22'],
            correct: 1,
            explain: 'Stern = AND, Überstrich = NOT vor genau dieser Variable.',
          },
          { type: 'exercise', id: 'e-grafcet-bedingung' },
        ],
      },
    ],
  },
  // =====================================================================
  {
    id: 'k4',
    title: 'IF – wenn, dann',
    icon: '🔁',
    lessons: [
      {
        id: 'l-if',
        title: 'IF, ELSIF, ELSE',
        goal: 'Entscheidungen im Programm',
        minutes: 6,
        cards: [
          {
            type: 'text',
            title: 'Aufbau',
            body: `\`\`\`
IF Bedingung THEN
  (* wird ausgeführt, wenn Bedingung TRUE *)
ELSIF andere_Bedingung THEN
  (* sonst, wenn diese TRUE *)
ELSE
  (* in allen anderen Fällen *)
END_IF;
\`\`\`

- **ELSIF** und **ELSE** sind freiwillig.
- \`ELSIF\` schreibt man zusammen, ohne E in der Mitte.
- Ganz wichtig: **END_IF;** mit Semikolon.`,
          },
          {
            type: 'text',
            title: 'Beispiel',
            body: `\`\`\`
IF C1 >= 5 THEN
  PF33 := TRUE;
ELSE
  PF33 := FALSE;
END_IF;
\`\`\`

Das ist dasselbe wie die kurze Form:

\`\`\`
PF33 := C1 >= 5;
\`\`\`

> Tipp: Für Ausgänge ist die kurze Form oft besser. Sie setzt den Ausgang **immer**, also auch zurück.`,
          },
          { type: 'exercise', id: 'e-if' },
        ],
      },
      {
        id: 'l-if-falle',
        title: 'Die IF-Falle',
        goal: 'Warum Ausgänge „hängen bleiben“',
        minutes: 5,
        cards: [
          {
            type: 'text',
            title: 'Variablen merken sich ihren Wert',
            body: `Eine Variable behält ihren Wert, bis ihr etwas Neues zugewiesen wird. Auch über viele Zyklen.

\`\`\`
IF NOT SJ4 THEN
  QA5 := SJ6;
END_IF;
\`\`\`

Wird SJ4 TRUE, während SJ6 gedrückt ist, wird die Zeile **übersprungen**. QA5 bleibt TRUE und **der Motor läuft weiter!**

> Achtung: Genau so steht es im Prototyp eures Ausbilders im Baustein G_Einricht: Die Ausgänge werden nur im Schritt 301 gesetzt. Beim Verlassen des Schritts bleiben sie, wie sie waren.`,
          },
          {
            type: 'text',
            title: 'Die sichere Lösung',
            body: `Ausgänge **immer** zuweisen, nicht nur im IF:

\`\`\`
QA5 := NOT SJ4 AND SJ6;
\`\`\`

oder bei Schrittketten:

\`\`\`
xQA5 := (iStep = 301) AND SJ6 AND NOT SJ7 AND …;
\`\`\`

So wird QA5 automatisch FALSE, sobald der Schritt nicht mehr aktiv ist.`,
          },
          { type: 'exercise', id: 'e-if-falle' },
        ],
      },
    ],
  },
  // =====================================================================
  {
    id: 'k5',
    title: 'Speichern & Verriegeln',
    icon: '🔒',
    lessons: [
      {
        id: 'l-selbsthaltung',
        title: 'Selbsthaltung',
        goal: 'Start/Stopp wie beim Schütz',
        minutes: 6,
        cards: [
          {
            type: 'text',
            title: 'Der Ausgang hält sich selbst',
            body: `Aus der Schütztechnik kennst du die Selbsthaltung: Der Schütz hält sich über seinen eigenen Hilfskontakt. In ST sieht das genauso aus:

\`\`\`
M1 := (S1 OR M1) AND S0;
\`\`\`

- \`S1 OR M1\`: Start gedrückt **oder** Motor läuft schon.
- \`AND S0\`: und Stopp (Öffner) ist nicht gedrückt.

Weil M1 auf beiden Seiten steht, „merkt“ sich der Ausgang seinen Zustand.`,
          },
          {
            type: 'text',
            title: 'Wer gewinnt?',
            body: `Werden Start und Stopp gleichzeitig gedrückt:

- \`(S1 OR M1) AND S0\` → **Stopp gewinnt** (rücksetzdominant). So muss es aus Sicherheitsgründen sein.
- \`S1 OR (M1 AND S0)\` → Start gewinnt (setzdominant). Für Motoren nicht nehmen!`,
          },
          { type: 'exercise', id: 'e-selbsthaltung' },
        ],
      },
      {
        id: 'l-rs',
        title: 'SR, RS und Setzen/Rücksetzen',
        goal: 'Speicherbausteine aus der IEC-Bibliothek',
        minutes: 6,
        cards: [
          {
            type: 'text',
            title: 'Bausteine statt Formel',
            body: `Für Speicher gibt es fertige **Funktionsbausteine**:

| Baustein | Eingänge | Ausgang | Wer gewinnt? |
|---|---|---|---|
| \`RS\` | S, **R1** | Q1 | Rücksetzen |
| \`SR\` | **S1**, R | Q1 | Setzen |

Die **1** markiert jeweils den dominanten Eingang.`,
          },
          {
            type: 'text',
            title: 'So benutzt man einen Baustein',
            body: `**1. Instanz deklarieren** (im Reiter Variablen):
\`\`\`
VAR
  Speicher : RS;
END_VAR
\`\`\`

**2. Aufrufen** (im Code), Eingänge mit Namen:
\`\`\`
Speicher(S := S1, R1 := NOT S0);
\`\`\`

**3. Ausgang abfragen:**
\`\`\`
M1 := Speicher.Q1;
\`\`\`

> PC WORX: Im **Bearbeitungsassistenten** kannst du einen Baustein wie RS oder TON per Drag & Drop in das ST-Arbeitsblatt ziehen. PC WORX schreibt dir dann den Aufruf mit allen Ein- und Ausgängen als Text hinein. Du ersetzt nur noch die Platzhalter durch deine Variablen.`,
          },
          {
            type: 'text',
            title: 'Setzen/Rücksetzen mit IF',
            body: `Ohne Baustein geht es auch mit zwei IF:

\`\`\`
IF S1 THEN
  M1 := TRUE;     (* setzen *)
END_IF;
IF NOT S0 THEN
  M1 := FALSE;    (* rücksetzen *)
END_IF;
\`\`\`

Hier gewinnt das **untere** IF, weil es später im Zyklus kommt. So entsteht rücksetzdominantes Verhalten. Hier ist das Speichern übrigens gewollt, anders als bei der IF-Falle.`,
          },
          { type: 'exercise', id: 'e-rs' },
        ],
      },
      {
        id: 'l-verriegelung',
        title: 'Verriegelung',
        goal: 'Links/Rechts nie gleichzeitig',
        minutes: 6,
        cards: [
          {
            type: 'text',
            title: 'Wendeschaltung',
            body: `Der Motor eurer X-Achse dreht über zwei Schütze: **QA5** für links und **QA6** für rechts. Ziehen beide an, gibt es einen **Kurzschluss** zwischen zwei Außenleitern.

Darum wird gegenseitig **verriegelt**: Ein Schütz darf nur kommen, wenn das andere aus ist.

\`\`\`
QA5 := … AND NOT QA6;
QA6 := … AND NOT QA5;
\`\`\`

Genau das steht im GRAFCET G_Einricht: QA5 hat ~~QA6~~ in der Bedingung, QA6 hat ~~QA5~~.

> Merke: Zusätzlich gibt es im Schaltschrank eine Hardware-Verriegelung über Hilfskontakte. Die Software-Verriegelung ist die zweite Sicherheit.`,
          },
          { type: 'exercise', id: 'e-wendeschuetz' },
        ],
      },
    ],
  },
  // =====================================================================
  {
    id: 'k6',
    title: 'Flanken',
    icon: '📈',
    lessons: [
      {
        id: 'l-flanken',
        title: 'R_TRIG und F_TRIG',
        goal: 'Einmal pro Tastendruck reagieren',
        minutes: 7,
        cards: [
          {
            type: 'text',
            title: 'Das Problem',
            body: `Ein Tastendruck dauert vielleicht 0,2 s. Das sind bei 10 ms Zykluszeit **20 Zyklen**. Diese Zeile …

\`\`\`
IF S1 THEN
  Zaehler := Zaehler + 1;
END_IF;
\`\`\`

… zählt bei **einem** Druck also etwa 20-mal hoch.`,
          },
          {
            type: 'text',
            title: 'Die Lösung: Flanke',
            body: `Eine **Flanke** ist der Moment, in dem sich ein Signal ändert:

- **steigende Flanke** ↑: FALSE → TRUE (Taster wird gedrückt) → \`R_TRIG\`
- **fallende Flanke** ↓: TRUE → FALSE (Taster wird losgelassen) → \`F_TRIG\`

Der Ausgang **Q** ist genau **einen Zyklus** lang TRUE.

\`\`\`
VAR
  Flanke_S1 : R_TRIG;
END_VAR

Flanke_S1(CLK := S1);
IF Flanke_S1.Q THEN
  Zaehler := Zaehler + 1;
END_IF;
\`\`\``,
          },
          {
            type: 'text',
            title: 'Wichtig: in jedem Zyklus aufrufen',
            body: `Der Flankenbaustein merkt sich den Wert aus dem letzten Zyklus. Er muss deshalb **in jedem Zyklus** aufgerufen werden, am besten ganz oben im Code und **nicht** innerhalb eines IF oder CASE.

> Achtung: Jede Flanke braucht ihre **eigene Instanz**. Für BG12 und SJ5 brauchst du zwei verschiedene, z. B. \`FT_BG12\` und \`RT_SJ5\`.`,
          },
          {
            type: 'quiz',
            question: 'Wie lange ist R_TRIG.Q TRUE?',
            options: ['Solange der Taster gedrückt ist', 'Genau einen SPS-Zyklus', '1 Sekunde', 'Bis man ihn zurücksetzt'],
            correct: 1,
            explain: 'Q ist nur in dem einen Zyklus TRUE, in dem sich CLK von FALSE nach TRUE ändert.',
          },
          { type: 'exercise', id: 'e-stromstoss' },
        ],
      },
      {
        id: 'l-impulse',
        title: 'Impulse zählen (BG12)',
        goal: 'So weiß die Achse, wo sie ist',
        minutes: 6,
        cards: [
          {
            type: 'text',
            title: 'Positionserfassung mit BG12',
            body: `Eure X-Achse hat keinen Wegmessgeber, sondern den Sensor **BG12**. Beim Fahren erzeugt er Impulse. Wer die Impulse zählt, weiß, wo der Schlitten steht:

- Start in der Grundposition **BG13**: \`C1 := 0\`
- Beim Fahren nach links: bei jeder **fallenden Flanke ↓BG12** \`C1 := C1 + 1\`
- Beim Fahren nach rechts: \`C1 := C1 - 1\`
- Ziel erreicht, wenn \`C1 = C2\` (Sollposition)

Im GRAFCET steht das als Aktion **C1 := C1+1** mit Pfeil ↓BG12 davor.`,
          },
          {
            type: 'text',
            title: 'Der Fehler im Prototyp',
            body: `Im Prototyp „Winter26“ eures Ausbilders steht in Schritt 502:

\`\`\`
502: iC1 := iC1 + 1;
\`\`\`

Ohne Flanke zählt das **jeden Zyklus**, also 100-mal pro Sekunde, egal ob BG12 kommt oder nicht. Der Schlitten würde nach wenigen Millisekunden stoppen.

Richtig:
\`\`\`
FT_BG12(CLK := BG12);          (* oben, außerhalb CASE *)
…
502: IF FT_BG12.Q THEN C1 := C1 + 1; END_IF;
     IF C1 = C2 THEN iStep := 503; END_IF;
\`\`\``,
          },
          { type: 'exercise', id: 'e-impulse' },
        ],
      },
    ],
  },
  // =====================================================================
  {
    id: 'k7',
    title: 'Timer',
    icon: '⏱️',
    lessons: [
      {
        id: 'l-ton',
        title: 'TON – Einschaltverzögerung',
        goal: 'Warten in der SPS',
        minutes: 7,
        cards: [
          {
            type: 'text',
            title: 'Der TON',
            body: `\`TON\` (Timer On-Delay) schaltet seinen Ausgang **verzögert ein**:

| Anschluss | Bedeutung |
|---|---|
| \`IN\` (BOOL) | Startsignal |
| \`PT\` (TIME) | Zeit, z. B. \`T#3s\` |
| \`Q\` (BOOL) | wird TRUE, wenn IN seit PT TRUE ist |
| \`ET\` (TIME) | bisher abgelaufene Zeit |

Fällt IN weg, wird Q sofort FALSE und die Zeit beginnt beim nächsten Mal von vorn.`,
          },
          {
            type: 'text',
            title: 'Benutzen',
            body: `\`\`\`
VAR
  T_S1 : TON;
END_VAR

T_S1(IN := S1, PT := T#3s);
H1 := T_S1.Q;
\`\`\`

Zeitangaben: \`T#500ms\`, \`T#2s\`, \`T#1m30s\`, \`T#0.5s\`.

> Achtung: Den Timer **immer** aufrufen, nicht in einem IF verstecken. Sonst „friert“ er ein, wenn die Bedingung wegfällt, und behält sein altes Q.`,
          },
          { type: 'exercise', id: 'e-ton' },
        ],
      },
      {
        id: 'l-tof-tp',
        title: 'TOF und TP',
        goal: 'Ausschaltverzögerung und Impuls',
        minutes: 5,
        cards: [
          {
            type: 'text',
            title: 'Drei Timer-Typen',
            body: `| Baustein | Verhalten |
|---|---|
| \`TON\` | Q kommt **verzögert**, geht sofort |
| \`TOF\` | Q kommt sofort, geht **verzögert** |
| \`TP\` | Q ist für genau PT an (Impuls), egal wie lange IN anliegt |

Alle haben die gleichen Anschlüsse IN, PT, Q, ET.`,
          },
          {
            type: 'quiz',
            question: 'Ein Lüfter soll nach dem Ausschalten noch 30 s nachlaufen. Welcher Timer?',
            options: ['TON', 'TOF', 'TP'],
            correct: 1,
            explain: 'Nachlauf = Ausschaltverzögerung = TOF.',
          },
          { type: 'exercise', id: 'e-treppenlicht' },
        ],
      },
      {
        id: 'l-grafcet-zeit',
        title: 'Zeiten im GRAFCET',
        goal: '1s/X503, 1s/BG22, 0,5s/G_Takt.X100',
        minutes: 7,
        cards: [
          {
            type: 'text',
            title: 'Zeitbedingung „t/Signal“',
            body: `Im GRAFCET steht eine Zeit so: **Zeit / Signal**.

**1s/BG22** heißt: „BG22 ist **seit 1 Sekunde** TRUE“. Das ist genau ein TON:

\`\`\`
T_BG22(IN := BG22, PT := T#1s);
… IF T_BG22.Q THEN …
\`\`\`

**1s/X503** heißt: „Schritt 503 ist **seit 1 Sekunde** aktiv“ (X503 = Schrittvariable von Schritt 503):

\`\`\`
T_X503(IN := iStep = 503, PT := T#1s);
\`\`\``,
          },
          {
            type: 'text',
            title: 'Mit Überstrich',
            body: `Bei QA60 in G_Einricht steht **~~5s/SJ12~~**, der Strich geht über alles.

„5s/SJ12“ = SJ12 ist seit 5 s gedrückt. Der Strich darüber bedeutet: **nicht** seit 5 s gedrückt.

\`\`\`
T_SJ12(IN := SJ12, PT := T#5s);
\`\`\`

Euer Ausbilder setzt das so um: Solange SJ12 gedrückt ist, wird der Magnet abgeschaltet, aber **höchstens 5 s**:

\`\`\`
xQA60 := (iStep = 301) AND SJ12 AND NOT T_SJ12.Q;
\`\`\`

> Prüfung: Kläre mit deinem Ausbilder, ob das so gemeint ist. Wörtlich genommen bedeutet der Strich nur „NOT T_SJ12.Q“, ohne „AND SJ12“. Dann wäre der Magnet im Einrichtbetrieb ständig abgeschaltet.`,
          },
          {
            type: 'grafcet',
            title: 'G_Takt: zwei Zeitbedingungen',
            body: 'Schritt 100 wartet 0,5 s, dann Schritt 101 (Aktion „Takt“) 0,5 s – ergibt 1 Hz.',
            grafcet: G_TAKT,
          },
          { type: 'exercise', id: 'e-blinker' },
        ],
      },
    ],
  },
  // =====================================================================
  {
    id: 'k8',
    title: 'Zähler & Vergleicher',
    icon: '🔢',
    lessons: [
      {
        id: 'l-ctu',
        title: 'Zählerbausteine',
        goal: 'CTU, CTD und eigene Zähler',
        minutes: 6,
        cards: [
          {
            type: 'text',
            title: 'CTU – Vorwärtszähler',
            body: `| Anschluss | Bedeutung |
|---|---|
| \`CU\` | zählt bei **steigender Flanke** +1 |
| \`R\` | Reset: CV := 0 |
| \`PV\` | Sollwert (INT) |
| \`Q\` | TRUE, wenn CV >= PV |
| \`CV\` | aktueller Zählerstand |

\`\`\`
Zaehler(CU := B1, R := S0, PV := 3);
H1 := Zaehler.Q;
\`\`\`

Den CTU musst du nicht mit einer Flanke füttern, er erkennt die Flanke selbst. **CTD** zählt rückwärts, **CTUD** in beide Richtungen.`,
          },
          {
            type: 'text',
            title: 'Oder selbst zählen',
            body: `In eurem GRAFCET wird mit Zuweisungen gezählt (\`C1 := C1 + 1\`). Das schreibt man meist selbst, mit einer INT-Variable und einer Flanke. So hat man die volle Kontrolle über vor- und rückwärts:

\`\`\`
IF FT_BG12.Q THEN
  C1 := C1 + 1;
END_IF;
\`\`\``,
          },
          { type: 'exercise', id: 'e-ctu' },
        ],
      },
      {
        id: 'l-vergleich',
        title: 'Vergleicher & Positionieren',
        goal: 'Sollwert erreicht? C1 = C2',
        minutes: 6,
        cards: [
          {
            type: 'text',
            title: 'Vergleichen im GRAFCET',
            body: `Im GRAFCET stehen Vergleiche in eckigen Klammern: **[C1 = C2]**. In ST:

\`\`\`
IF C1 = C2 THEN
  iStep := 503;
END_IF;
\`\`\`

Bei euch ist **C1** die Istposition und **C2** die Sollposition (\`C2 := Pos. 4\` usw.).

> Tipp: \`=\` ist exakt. Wenn der Zähler einen Wert überspringen könnte, ist \`>=\` sicherer. Bei sauber gezählten Flanken passt \`=\` aber, so steht es auch im GRAFCET.`,
          },
          { type: 'exercise', id: 'e-position' },
        ],
      },
    ],
  },
  // =====================================================================
  {
    id: 'k9',
    title: 'Analogwerte',
    icon: '📊',
    lessons: [
      {
        id: 'l-analog',
        title: 'Analogwerte skalieren',
        goal: 'Rohwert → physikalische Größe',
        minutes: 7,
        cards: [
          {
            type: 'text',
            title: 'Was ist ein Analogwert?',
            body: `Ein Sensor liefert z. B. 0–10 V oder 4–20 mA. Die Analogkarte macht daraus eine Zahl, den **Rohwert**. Bei Phoenix Contact ist das typischerweise **0 … 27648** für den Nennbereich (INT).

> Prüfung: In euren AP2-Unterlagen kommt **kein** Analogwert vor. BP1 ist ein Druck**schalter** (BOOL). Dieses Kapitel ist also Zusatzwissen. Für das Fachgespräch oder die schriftliche Prüfung lohnt es sich trotzdem.`,
          },
          {
            type: 'text',
            title: 'Die Formel (Dreisatz)',
            body: `\`\`\`
Wert = Rohwert / Rohwert_max * (Messbereich_max - Messbereich_min) + Messbereich_min
\`\`\`

Beispiel 0 … 10 bar:
\`\`\`
rDruck := INT_TO_REAL(B1) / 27648.0 * 10.0;
\`\`\`

Beispiel −20 … +80 °C:
\`\`\`
rTemp := INT_TO_REAL(B2) / 27648.0 * 100.0 - 20.0;
\`\`\`

> Achtung: Erst in REAL umwandeln, dann teilen! \`B1 / 27648\` mit INT ergibt fast immer 0.`,
          },
          {
            type: 'quiz',
            question: 'Rohwert 13824 bei 0…27648 ≙ 0…10 bar. Welcher Druck?',
            options: ['2,5 bar', '5 bar', '7,5 bar', '13,8 bar'],
            correct: 1,
            explain: '13824 ist genau die Hälfte von 27648 → die Hälfte von 10 bar.',
          },
          { type: 'exercise', id: 'e-analog' },
        ],
      },
    ],
  },
  // =====================================================================
  {
    id: 'k10',
    title: 'GRAFCET & Schrittketten',
    icon: '🪜',
    lessons: [
      {
        id: 'l-grafcet',
        title: 'GRAFCET lesen',
        goal: 'Schritte, Transitionen, Aktionen',
        minutes: 8,
        cards: [
          {
            type: 'text',
            title: 'Die Bausteine eines GRAFCET',
            body: `- **Schritt** (Kästchen mit Nummer): ein Zustand der Anlage. Immer ist (mindestens) einer aktiv.
- **Anfangsschritt** (Doppelrahmen): ist beim Einschalten aktiv.
- **Transition** (Querstrich mit Bedingung): Ist der Schritt davor aktiv und die Bedingung erfüllt, geht es zum nächsten Schritt.
- **Aktion** (Kästchen rechts am Schritt): Was passiert, solange der Schritt aktiv ist.
- **Teil-GRAFCET** (Rahmen mit Namen, z. B. G_Auto): ein eigener Ablauf. Bei euch wird jeder zu einem Baustein.`,
          },
          {
            type: 'text',
            title: 'Arten von Aktionen',
            body: `| Darstellung | Bedeutung | ST |
|---|---|---|
| Kasten „QA5“ | **kontinuierlich**: an, solange der Schritt aktiv ist | \`QA5 := iStep = 502;\` |
| Bedingung über dem Kasten | **mit Zuweisungsbedingung**: nur wenn zusätzlich die Bedingung gilt | \`PF4 := (iStep = 201) AND BP1;\` |
| Pfeil ↑ am Kasten, „C1 := 0“ | **gespeichert bei Aktivierung**: einmal beim Eintritt in den Schritt | im Schritt ausführen |
| ↓BG12 über „C1 := C1+1“ | **gespeichert bei Ereignis**: bei jeder fallenden Flanke von BG12 | \`IF FT_BG12.Q THEN …\` |`,
          },
          {
            type: 'text',
            title: 'Zwangssteuerung',
            body: `Ein Teil-GRAFCET kann einen anderen steuern:

- **G_Einricht{INIT}**: G_Einricht wird in seinen Anfangsschritt (300) gezwungen.
- **G_Auto{ }**: In G_Auto ist kein Schritt aktiv. Er ist „ausgeschaltet“.

In ST löst man das mit einem **Freigabe-Eingang** am Baustein:
\`\`\`
IF NOT xFreigabe THEN
  iStep := 300;     (* festhalten im Anfangsschritt *)
ELSE
  CASE iStep OF … END_CASE;
END_IF;
\`\`\`
Weil in den Anfangsschritten keine Aktionen stehen, wirken {INIT} und { } hier gleich.`,
          },
          {
            type: 'grafcet',
            title: 'G_Einricht aus euren Unterlagen',
            body: 'Schritt 301 hat fünf Aktionen mit Zuweisungsbedingungen. Die übersetzt du jeweils in eine Zeile ST.',
            grafcet: G_EINRICHT,
          },
          {
            type: 'quiz',
            question: 'Was bedeutet der Doppelrahmen um Schritt 500?',
            options: ['Der Schritt ist besonders wichtig', 'Anfangsschritt – beim Start aktiv', 'Der Schritt wird doppelt ausgeführt', 'Hier endet der GRAFCET'],
            correct: 1,
            explain: 'Doppelrahmen = Anfangsschritt. In ST: Startwert der Schrittvariable, z. B. iStep : INT := 500;',
          },
        ],
      },
      {
        id: 'l-case',
        title: 'Schrittkette mit CASE',
        goal: 'Das Muster für jeden GRAFCET',
        minutes: 9,
        cards: [
          {
            type: 'text',
            title: 'CASE',
            body: `\`CASE\` wählt je nach Zahlenwert einen Programmteil aus. Perfekt für Schritte:

\`\`\`
CASE iStep OF
  500: (* nur ausgeführt, wenn iStep = 500 *)
  501: …
  502, 503: (* bei 502 ODER 503 *)
ELSE
  iStep := 500;   (* ungültiger Wert → zurück auf Anfang *)
END_CASE;
\`\`\``,
          },
          {
            type: 'text',
            title: 'Das 3-Teile-Muster',
            body: `So setzt du **jeden** Teil-GRAFCET um:

**1. Timer und Flanken aufrufen** (immer, ganz oben)
\`\`\`
T_X503(IN := iStep = 503, PT := T#1s);
FT_BG12(CLK := BG12);
\`\`\`

**2. CASE: nur Transitionen**, also weiterschalten
\`\`\`
CASE iStep OF
  500: IF SJ5 AND BG13 THEN iStep := 501; END_IF;
  501: …
END_CASE;
\`\`\`

**3. Aktionen** (immer zuweisen, außerhalb CASE)
\`\`\`
xQA5 := (iStep = 502) OR (iStep = 506);
xMB22 := (iStep = 503) AND T_X503.Q;
\`\`\`

> Merke: Ein Ausgang = **eine** Zuweisung. Kommt eine Aktion in mehreren Schritten vor, verbindest du sie mit OR. Nie zweimal zuweisen, sonst zählt nur die letzte Zeile. Diesen Fehler (MB22) hat auch der Prototyp.`,
          },
          {
            type: 'text',
            title: 'Gespeicherte Aktionen',
            body: `Aktionen mit ↑ (z. B. \`C2 := Pos. 4\` in Schritt 501) passieren **einmal**. Meist folgt danach eine Transition „X501“, die sofort erfüllt ist. Dann geht das ganz einfach:

\`\`\`
501: C2 := Pos4;
     iStep := 502;
\`\`\`

Bei „C1 := 0“ in Schritt 500 schadet es auch nicht, die Zuweisung in jedem Zyklus zu machen, solange der Schritt aktiv ist.`,
          },
          {
            type: 'quiz',
            question: 'MB22 kommt in Schritt 503 und 507 vor. Wie schreibst du das?',
            options: ['MB22 := iStep = 503;\nMB22 := iStep = 507;', 'MB22 := (iStep = 503) OR (iStep = 507);', 'MB22 := (iStep = 503) AND (iStep = 507);'],
            correct: 1,
            explain: 'Eine Zuweisung mit OR. Zwei Zuweisungen hintereinander → die erste wird von der zweiten überschrieben. AND wäre nie TRUE, weil iStep nicht gleichzeitig 503 und 507 sein kann.',
          },
          { type: 'exercise', id: 'e-kette' },
        ],
      },
      {
        id: 'l-bausteine',
        title: 'Funktionsbausteine & Projektstruktur',
        goal: 'So ist das Projekt eures Betriebs aufgebaut',
        minutes: 8,
        cards: [
          {
            type: 'text',
            title: 'POE: Programm, Funktionsbaustein, Funktion',
            body: `In PC WORX besteht ein Projekt aus **POEs** (Programm-Organisations-Einheiten):

- **Programm** (PROGRAM): wird von der Task zyklisch aufgerufen. Bei euch heißt es **Main**.
- **Funktionsbaustein** (FUNCTION_BLOCK, FB): hat ein **Gedächtnis**, z. B. die Schrittnummer. Man legt **Instanzen** davon an, so wie bei TON.
- **Funktion**: ohne Gedächtnis, liefert nur einen Wert (z. B. INT_TO_REAL).`,
          },
          {
            type: 'text',
            title: 'Das Projekt „Winter26“ eures Ausbilders',
            body: `Jeder Teil-GRAFCET ist ein eigener FB in **ST**. **Main** ist ein **FUP**-Arbeitsblatt (Funktionsplan), das die FBs aufruft und verbindet:

| Baustein | Sprache | Aufgabe |
|---|---|---|
| Main | FUP | ruft alle FBs auf |
| G_Main | ST | Hauptsteuerung, Betriebsarten |
| G_Takt | ST | 1-Hz-Takt |
| G_Einricht | ST | Tippbetrieb |
| G_Auto | ST | Automatikablauf |

Im Trainer kommt noch **G_Anzeige** für die Leuchtmelder dazu. Main steht hier als ST da, weil der Simulator kein FUP zeichnet. Inhaltlich ist es dasselbe.

> Prüfung: Ob du Teile in FUP schreiben darfst, steht nicht in den Unterlagen („in die erforderliche Programmiersprache umsetzen“). Kläre das mit deinem Ausbilder. FUP für Main und ST für die FBs ist bei euch schon so üblich.`,
          },
          {
            type: 'text',
            title: 'Ein- und Ausgänge eines FB',
            body: `\`\`\`
VAR_INPUT
  xFreigabe : BOOL;    (* kommt von außen *)
END_VAR
VAR_OUTPUT
  xQA5 : BOOL;         (* geht nach außen *)
END_VAR
VAR
  iStep : INT := 300;  (* intern, das „Gedächtnis“ *)
END_VAR
\`\`\`

Aufruf in Main:
\`\`\`
G_Einricht_1(xFreigabe := G_Main_1.xEinricht);
QA5 := G_Einricht_1.xQA5 OR G_Auto_1.xQA5;
\`\`\`

> Tipp: Steuern zwei FBs denselben Aktor, gib jeweils einen eigenen Ausgang heraus und verbinde sie in Main mit OR. Würden beide FBs direkt QA5 schreiben, würde der zweite den ersten überschreiben.`,
          },
          { type: 'exercise', id: 'e-fb' },
        ],
      },
    ],
  },
];

export const LESSON_MAP = new Map(CHAPTERS.flatMap((ch) => ch.lessons.map((l) => [l.id, { lesson: l, chapter: ch }] as const)));
export const ALL_LESSONS = CHAPTERS.flatMap((c) => c.lessons);
