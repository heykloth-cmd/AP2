/**
 * Musterlösung für das Achsenmodell, aufgebaut wie im Betrieb:
 * Main (in PC WORX als FUP) ruft je Teil-GRAFCET einen Funktionsbaustein in ST auf.
 */
import type { PouSource } from '../../plc/compiler';

export const MAIN_VARS = `VAR
\tG_Takt_1 : G_Takt;
\tG_Main_1 : G_Main;
\tG_Einricht_1 : G_Einricht;
\tG_Auto_1 : G_Auto;
\tG_Anzeige_1 : G_Anzeige;
END_VAR

VAR_EXTERNAL
\tQA5 : BOOL;
\tQA6 : BOOL;
\tMB21 : BOOL;
\tMB22 : BOOL;
\tQA60 : BOOL;
END_VAR`;

export const MAIN_CODE = `(* In PC WORX ist Main bei euch ein FUP-Arbeitsblatt.
   Hier steht dasselbe als ST: jeder Baustein wird einmal pro Zyklus aufgerufen. *)
G_Takt_1();
G_Main_1(xTakt := G_Takt_1.xTakt,
         xEinrichtX300 := G_Einricht_1.xX300,
         xAutoX500 := G_Auto_1.xX500);
G_Einricht_1(xFreigabe := G_Main_1.xEinricht);
G_Auto_1(xFreigabe := G_Main_1.xAuto);

(* Beide Betriebsarten steuern dieselben Aktoren -> mit ODER zusammenfassen *)
QA5  := G_Einricht_1.xQA5  OR G_Auto_1.xQA5;
QA6  := G_Einricht_1.xQA6  OR G_Auto_1.xQA6;
MB21 := G_Einricht_1.xMB21 OR G_Auto_1.xMB21;
MB22 := G_Einricht_1.xMB22 OR G_Auto_1.xMB22;
QA60 := G_Einricht_1.xQA60 OR G_Auto_1.xQA60;

G_Anzeige_1(xTakt := G_Takt_1.xTakt);
`;

export const TAKT_VARS = `VAR_OUTPUT
\txTakt : BOOL;\t(* Taktsignal 1 Hz *)
END_VAR

VAR
\tiStep : INT := 100;
\tT_X100 : TON;
\tT_X101 : TON;
END_VAR`;

export const TAKT_CODE = `(* Timer immer außerhalb von CASE aufrufen *)
T_X100(IN := iStep = 100, PT := T#500ms);
T_X101(IN := iStep = 101, PT := T#500ms);

CASE iStep OF
  100: IF T_X100.Q THEN iStep := 101; END_IF;
  101: IF T_X101.Q THEN iStep := 100; END_IF;
ELSE
  iStep := 100;
END_CASE;

xTakt := iStep = 101;
`;

export const MAINSTEP_VARS = `VAR_INPUT
\txTakt : BOOL;
\txEinrichtX300 : BOOL;\t(* G_Einricht steht in Schritt 300 *)
\txAutoX500 : BOOL;\t\t(* G_Auto steht in Schritt 500 *)
END_VAR

VAR_OUTPUT
\txEinricht : BOOL;\t(* Freigabe G_Einricht *)
\txAuto : BOOL;\t\t(* Freigabe G_Auto *)
END_VAR

VAR_EXTERNAL
\tKE2 : BOOL;
\tSJ3 : BOOL;
\tSJ4 : BOOL;
\tBP1 : BOOL;
\tFC7 : BOOL;
\tPF3 : BOOL;
END_VAR

VAR
\tiStep : INT := 1;
END_VAR`;

export const MAINSTEP_CODE = `CASE iStep OF
  1: IF KE2 AND SJ3 AND BP1 AND NOT SJ4 AND FC7 THEN iStep := 2; END_IF;

  2: IF xEinrichtX300 THEN iStep := 3; END_IF;

  3: IF NOT KE2 OR NOT BP1 OR NOT SJ3 OR NOT FC7 THEN
       iStep := 1;
     ELSIF SJ4 THEN
       iStep := 4;
     END_IF;

  4: IF xAutoX500 THEN iStep := 5; END_IF;

  5: IF NOT KE2 OR NOT BP1 OR NOT SJ3 OR NOT SJ4 OR NOT FC7 THEN iStep := 1; END_IF;
ELSE
  iStep := 1;
END_CASE;

(* Zwangssteuerung: ohne Freigabe steht der Teil-GRAFCET im Anfangsschritt *)
xEinricht := iStep = 3;\t(* Schritt 2: G_Einricht{INIT}, Schritt 4: G_Einricht{ } *)
xAuto := iStep = 5;\t\t(* Schritt 4: G_Auto{INIT} *)

PF3 := (iStep = 3) OR (iStep = 5 AND xTakt);
`;

export const EINRICHT_VARS = `VAR_INPUT
\txFreigabe : BOOL;
END_VAR

VAR_OUTPUT
\txX300 : BOOL;
\txQA5 : BOOL;
\txQA6 : BOOL;
\txMB21 : BOOL;
\txMB22 : BOOL;
\txQA60 : BOOL;
END_VAR

VAR_EXTERNAL
\tSJ4 : BOOL;
\tSJ6 : BOOL;
\tSJ7 : BOOL;
\tSJ8 : BOOL;
\tSJ9 : BOOL;
\tSJ12 : BOOL;
\tBG11 : BOOL;
\tBG13 : BOOL;
\tBG21 : BOOL;
\tBG22 : BOOL;
\tQA5 : BOOL;
\tQA6 : BOOL;
END_VAR

VAR
\tiStep : INT := 300;
\tT_SJ12 : TON;
END_VAR`;

export const EINRICHT_CODE = `IF NOT xFreigabe THEN
  iStep := 300;
ELSE
  CASE iStep OF
    300: IF NOT SJ4 THEN iStep := 301; END_IF;
    301: IF SJ4 THEN iStep := 300; END_IF;
  ELSE
    iStep := 300;
  END_CASE;
END_IF;

T_SJ12(IN := SJ12, PT := T#5s);

(* Aktionen immer zuweisen – so werden sie FALSE, sobald der Schritt verlassen wird *)
xX300 := iStep = 300;
xQA5  := (iStep = 301) AND SJ6 AND NOT SJ7 AND NOT QA6 AND NOT BG11 AND BG21;
xQA6  := (iStep = 301) AND SJ7 AND NOT SJ6 AND NOT QA5 AND NOT BG13 AND BG21;
xMB21 := (iStep = 301) AND SJ8 AND NOT SJ9 AND NOT BG21;
xMB22 := (iStep = 301) AND SJ9 AND NOT SJ8 AND NOT BG22;
xQA60 := (iStep = 301) AND SJ12 AND NOT T_SJ12.Q;
`;

export const AUTO_VARS = `VAR_INPUT
\txFreigabe : BOOL;
END_VAR

VAR_OUTPUT
\txX500 : BOOL;
\txQA5 : BOOL;
\txQA6 : BOOL;
\txMB21 : BOOL;
\txMB22 : BOOL;
\txQA60 : BOOL;
END_VAR

VAR_EXTERNAL
\tSJ5 : BOOL;
\tBG12 : BOOL;
\tBG13 : BOOL;
\tBG21 : BOOL;
\tBG22 : BOOL;
\tBG52 : BOOL;
\tBG53 : BOOL;
\tBG54 : BOOL;
END_VAR

VAR
\tiStep : INT := 500;
\tC1 : INT;\t\t\t(* Istposition in Impulsen *)
\tC2 : INT;\t\t\t(* Sollposition *)
\tPos1 : INT := 90;\t(* Ablage Position 1 *)
\tPos4 : INT := 45;\t(* Magazin Position 4 *)
\tFT_BG12 : F_TRIG;
\tT_X503 : TON;
\tT_X507 : TON;
\tT_X508 : TON;
\tT_BG21 : TON;
\tT_BG22 : TON;
END_VAR`;

export const AUTO_CODE = `(* Flanke und Timer in jedem Zyklus aufrufen *)
FT_BG12(CLK := BG12);
T_X503(IN := iStep = 503, PT := T#1s);
T_X507(IN := iStep = 507, PT := T#1s);
T_X508(IN := iStep = 508, PT := T#1s);
T_BG21(IN := BG21, PT := T#1s);
T_BG22(IN := BG22, PT := T#1s);

IF NOT xFreigabe THEN
  iStep := 500;
  C1 := 0;
ELSE
  CASE iStep OF
    500: C1 := 0;
         IF SJ5 AND BG13 AND BG21 AND NOT BG52 AND NOT BG53 AND BG54 THEN
           iStep := 501;
         END_IF;

    501: C2 := Pos4;
         iStep := 502;

    502: IF FT_BG12.Q THEN C1 := C1 + 1; END_IF;
         IF C1 = C2 THEN iStep := 503; END_IF;

    503: IF T_BG22.Q THEN iStep := 504; END_IF;

    504: IF T_BG21.Q THEN iStep := 505; END_IF;

    505: C2 := Pos1;
         iStep := 506;

    506: IF FT_BG12.Q THEN C1 := C1 + 1; END_IF;
         IF C1 = C2 THEN iStep := 507; END_IF;

    507: IF T_BG22.Q THEN iStep := 508; END_IF;

    508: IF T_BG21.Q THEN iStep := 509; END_IF;

    509: IF BG13 THEN iStep := 500; END_IF;
  ELSE
    iStep := 500;
  END_CASE;
END_IF;

(* Aktionen *)
xX500 := iStep = 500;
xQA5  := (iStep = 502) OR (iStep = 506);
xQA6  := iStep = 509;
xMB22 := (iStep = 503 AND T_X503.Q) OR (iStep = 507 AND T_X507.Q);
xMB21 := (iStep = 504) OR (iStep = 508 AND T_X508.Q AND BG52);
xQA60 := iStep = 508;
`;

export const AUTO_B_VARS = `VAR_INPUT
\txFreigabe : BOOL;
END_VAR

VAR_OUTPUT
\txX500 : BOOL;
\txQA5 : BOOL;
\txQA6 : BOOL;
\txMB21 : BOOL;
\txMB22 : BOOL;
\txQA60 : BOOL;
END_VAR

VAR_EXTERNAL
\tSJ5 : BOOL;
\tBG12 : BOOL;
\tBG13 : BOOL;
\tBG21 : BOOL;
\tBG22 : BOOL;
\tBG52 : BOOL;
\tBG53 : BOOL;
END_VAR

VAR
\tiStep : INT := 500;
\tC1 : INT;
\tC2 : INT;
\tPos1 : INT := 90;
\tPos2 : INT := 60;
\tPos3 : INT := 30;
\tFT_BG12 : F_TRIG;
\tT_X503 : TON;
\tT_X506 : TON;
\tT_X507 : TON;
\tT_X509 : TON;
\tT_X512 : TON;
\tT_X513 : TON;
\tT_BG21 : TON;
\tT_BG22 : TON;
END_VAR`;

export const AUTO_B_CODE = `FT_BG12(CLK := BG12);
T_X503(IN := iStep = 503, PT := T#1s);
T_X506(IN := iStep = 506, PT := T#1s);
T_X507(IN := iStep = 507, PT := T#1s);
T_X509(IN := iStep = 509, PT := T#1s);
T_X512(IN := iStep = 512, PT := T#1s);
T_X513(IN := iStep = 513, PT := T#1s);
T_BG21(IN := BG21, PT := T#1s);
T_BG22(IN := BG22, PT := T#1s);

IF NOT xFreigabe THEN
  iStep := 500;
  C1 := 0;
ELSE
  CASE iStep OF
    500: C1 := 0;
         IF SJ5 AND BG13 AND BG21 AND NOT BG52 AND NOT BG53 THEN iStep := 501; END_IF;
    501: C2 := Pos2;
         iStep := 502;
    502: IF FT_BG12.Q THEN C1 := C1 + 1; END_IF;
         IF C1 = C2 THEN iStep := 503; END_IF;
    503: IF T_BG22.Q THEN iStep := 504; C2 := Pos1; END_IF;
    504: IF T_BG21.Q THEN iStep := 505; END_IF;
    505: IF FT_BG12.Q THEN C1 := C1 + 1; END_IF;
         IF C1 = C2 THEN iStep := 506; END_IF;
    506: IF T_BG22.Q THEN iStep := 507; C2 := Pos2; END_IF;
    507: IF T_BG21.Q THEN iStep := 508; END_IF;
    508: IF FT_BG12.Q THEN C1 := C1 - 1; END_IF;
         IF C1 = C2 THEN iStep := 509; END_IF;
    509: IF T_BG22.Q THEN iStep := 510; C2 := Pos3; END_IF;
    510: IF T_BG21.Q THEN iStep := 511; END_IF;
    511: IF FT_BG12.Q THEN C1 := C1 - 1; END_IF;
         IF C1 = C2 THEN iStep := 512; END_IF;
    512: IF T_BG22.Q THEN iStep := 513; END_IF;
    513: IF T_BG21.Q THEN iStep := 514; END_IF;
    514: IF BG13 THEN iStep := 500; END_IF;
  ELSE
    iStep := 500;
  END_CASE;
END_IF;

xX500 := iStep = 500;
xQA5  := (iStep = 502) OR (iStep = 505);
xQA6  := (iStep = 508) OR (iStep = 511) OR (iStep = 514);
xMB22 := (iStep = 503 AND T_X503.Q) OR (iStep = 506 AND T_X506.Q)
      OR (iStep = 509 AND T_X509.Q) OR (iStep = 512 AND T_X512.Q);
xMB21 := (iStep = 504) OR (iStep = 507 AND T_X507.Q AND BG52)
      OR (iStep = 510) OR (iStep = 513 AND T_X513.Q AND BG53);
xQA60 := (iStep = 507) OR (iStep = 513);
`;

export const ANZEIGE_VARS = `VAR_INPUT
\txTakt : BOOL;
END_VAR

VAR_EXTERNAL
\tSJ3 : BOOL;
\tBG13 : BOOL;
\tBG21 : BOOL;
\tBG22 : BOOL;
\tBG52 : BOOL;
\tBG53 : BOOL;
\tBG54 : BOOL;
\tBP1 : BOOL;
\tFC7 : BOOL;
\tQA5 : BOOL;
\tQA6 : BOOL;
\tQA60 : BOOL;
\tPF2 : BOOL;
\tPF4 : BOOL;
\tPF5 : BOOL;
\tPF6 : BOOL;
\tPF7 : BOOL;
\tPF10 : BOOL;
\tPF11 : BOOL;
\tPF15 : BOOL;
\tPF32 : BOOL;
\tPF33 : BOOL;
END_VAR

VAR
\tiStep : INT := 200;
END_VAR`;

export const ANZEIGE_CODE = `CASE iStep OF
  200: IF SJ3 THEN iStep := 201; END_IF;
  201: IF NOT SJ3 THEN iStep := 200; END_IF;
ELSE
  iStep := 200;
END_CASE;

PF2  := (iStep = 201) AND BG13 AND BG21 AND BG54 AND BP1 AND FC7;
PF4  := (iStep = 201) AND BP1;
PF5  := (iStep = 201) AND NOT FC7;
PF6  := (iStep = 201) AND QA5 AND xTakt;
PF7  := (iStep = 201) AND QA6 AND xTakt;
PF10 := (iStep = 201) AND BG21;
PF11 := (iStep = 201) AND BG22;
PF15 := (iStep = 201) AND QA60;
PF32 := (iStep = 201) AND QA60;
PF33 := (iStep = 201) AND BG52 AND BG53;
`;

export function solutionSources(variante: 'vorbereitung' | 'bereitstellung' = 'vorbereitung'): PouSource[] {
  return [
    { name: 'Main', kind: 'PROGRAM', vars: MAIN_VARS, code: MAIN_CODE },
    { name: 'G_Takt', kind: 'FUNCTION_BLOCK', vars: TAKT_VARS, code: TAKT_CODE },
    { name: 'G_Main', kind: 'FUNCTION_BLOCK', vars: MAINSTEP_VARS, code: MAINSTEP_CODE },
    { name: 'G_Einricht', kind: 'FUNCTION_BLOCK', vars: EINRICHT_VARS, code: EINRICHT_CODE },
    variante === 'vorbereitung'
      ? { name: 'G_Auto', kind: 'FUNCTION_BLOCK', vars: AUTO_VARS, code: AUTO_CODE }
      : { name: 'G_Auto', kind: 'FUNCTION_BLOCK', vars: AUTO_B_VARS, code: AUTO_B_CODE },
    { name: 'G_Anzeige', kind: 'FUNCTION_BLOCK', vars: ANZEIGE_VARS, code: ANZEIGE_CODE },
  ];
}
