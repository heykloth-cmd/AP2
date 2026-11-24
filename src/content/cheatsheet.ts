/** Spickzettel – kompakt, zum Nachschlagen und Ausdrucken */
export const CHEATSHEET = `## Grundregeln
- Zuweisung \`:=\`, Vergleich \`=\`, jede Anweisung endet mit \`;\`
- Kommentar \`(* … *)\` – kein \`//\` in PC WORX
- Namen: Buchstaben, Ziffern, \`_\`; kein \`-\`, nicht mit Ziffer beginnen
- Groß-/Kleinschreibung egal
- Globale Variablen im Baustein als \`VAR_EXTERNAL\` einbinden

## Datentypen
| Typ | Werte | Beispiel |
|---|---|---|
| BOOL | TRUE / FALSE | \`xFertig := TRUE;\` |
| INT | −32768 … 32767 | \`C1 := C1 + 1;\` |
| REAL | Kommazahl | \`rDruck := 3.5;\` |
| TIME | Zeit | \`T#500ms\`, \`T#2s\` |

## Logik & Vergleich
\`AND\` \`OR\` \`XOR\` \`NOT\` · \`=\` \`<>\` \`<\` \`>\` \`<=\` \`>=\`
GRAFCET: \`*\` → AND, \`+\` → OR, Überstrich → NOT

## Kontrollstrukturen
\`\`\`
IF a THEN … ELSIF b THEN … ELSE … END_IF;

CASE iStep OF
  10: …
  20, 21: …
ELSE
  iStep := 10;
END_CASE;
\`\`\`

## Standardbausteine
| Baustein | Aufruf | Ausgang |
|---|---|---|
| TON | \`T1(IN := x, PT := T#1s);\` | \`T1.Q\`, \`T1.ET\` |
| TOF | \`T2(IN := x, PT := T#5s);\` | \`T2.Q\` |
| TP | \`T3(IN := x, PT := T#1s);\` | \`T3.Q\` |
| R_TRIG | \`RT(CLK := x);\` | \`RT.Q\` (1 Zyklus bei ↑) |
| F_TRIG | \`FT(CLK := x);\` | \`FT.Q\` (1 Zyklus bei ↓) |
| CTU | \`Z(CU := x, R := r, PV := 5);\` | \`Z.Q\`, \`Z.CV\` |
| RS | \`S(S := s, R1 := r);\` | \`S.Q1\` (Rücksetzen dominant) |
| SR | \`S(S1 := s, R := r);\` | \`S.Q1\` (Setzen dominant) |

## Muster
\`\`\`
(* Selbsthaltung, Stopp dominant *)
M1 := (S1 OR M1) AND S0;          (* S0 = Öffner *)

(* Verriegelung *)
QA5 := … AND NOT QA6;
QA6 := … AND NOT QA5;

(* Impulse zählen *)
FT_BG12(CLK := BG12);
IF FT_BG12.Q THEN C1 := C1 + 1; END_IF;

(* Analog skalieren *)
rWert := INT_TO_REAL(iRoh) / 27648.0 * 10.0;
\`\`\`

## GRAFCET → ST
| GRAFCET | ST |
|---|---|
| Anfangsschritt 500 | \`iStep : INT := 500;\` |
| Transition 500→501: SJ5 * BG13 | \`500: IF SJ5 AND BG13 THEN iStep := 501; END_IF;\` |
| Aktion QA5 in 502 und 506 | \`xQA5 := (iStep = 502) OR (iStep = 506);\` |
| Aktion PF4 mit Bedingung BP1 | \`PF4 := (iStep = 201) AND BP1;\` |
| ↑ C2 := Pos. 4 (bei Aktivierung) | \`501: C2 := Pos4; iStep := 502;\` |
| ↓BG12 → C1 := C1+1 | \`IF FT_BG12.Q THEN C1 := C1 + 1; END_IF;\` |
| 1s/X503 | \`T_X503(IN := iStep = 503, PT := T#1s);\` → \`T_X503.Q\` |
| 1s/BG22 | \`T_BG22(IN := BG22, PT := T#1s);\` → \`T_BG22.Q\` |
| [C1 = C2] | \`IF C1 = C2 THEN …\` |
| G_Auto{INIT} / G_Auto{ } | Freigabe FALSE → \`iStep := 500;\` |
| G_Einricht.X300 | Ausgang \`xX300 := iStep = 300;\` |

## Aufbau eines Teil-GRAFCET-Bausteins
\`\`\`
(* 1. Timer & Flanken – immer aufrufen *)
T_X503(IN := iStep = 503, PT := T#1s);
FT_BG12(CLK := BG12);

(* 2. Weiterschalten *)
IF NOT xFreigabe THEN
  iStep := 500;
ELSE
  CASE iStep OF
    500: IF … THEN iStep := 501; END_IF;
    …
  ELSE
    iStep := 500;
  END_CASE;
END_IF;

(* 3. Aktionen – immer zuweisen, je Ausgang EINE Zeile *)
xQA5 := (iStep = 502) OR (iStep = 506);
\`\`\`
`;
