/**
 * Teil-GRAFCETs des Achsenmodells, nachgezeichnet nach den Bereitstellungs-/Vorbereitungsunterlagen.
 * Schreibweise: "*" UND, "+" ODER, "!X" = X mit Überstrich (negiert).
 */
import type { GrafcetDef } from '../../ui/Grafcet';

export const G_MAIN: GrafcetDef = {
  name: 'G_Hauptsteuerung',
  stepVar: 'G_Main_1.iStep',
  steps: [
    { id: 1, initial: true, actions: [{ text: 'G_Einricht{ }', force: true }, { text: 'G_Auto{ }', force: true }] },
    { id: 2, actions: [{ text: 'G_Einricht{INIT}', force: true }] },
    { id: 3, actions: [{ text: 'PF3 Betriebsart' }] },
    { id: 4, actions: [{ text: 'G_Auto{INIT}', force: true }, { text: 'G_Einricht{ }', force: true }] },
    { id: 5, actions: [{ text: 'PF3 Betriebsart', cond: 'Takt' }] },
  ],
  transitions: [
    { from: 1, to: 2, cond: 'KE2 * SJ3 * BP1 * !SJ4 * FC7' },
    { from: 2, to: 3, cond: 'G_Einricht.X300' },
    { from: 3, to: 4, cond: 'SJ4' },
    { from: 3, to: 1, cond: '!KE2 + !BP1 + !SJ3 + !FC7' },
    { from: 4, to: 5, cond: 'G_Auto.X500' },
    { from: 5, to: 1, cond: '!KE2 + !BP1 + !SJ3 + !SJ4 + !FC7' },
  ],
};

export const G_TAKT: GrafcetDef = {
  name: 'G_Takt',
  stepVar: 'G_Takt_1.iStep',
  steps: [
    { id: 100, initial: true },
    { id: 101, actions: [{ text: 'Takt' }] },
  ],
  transitions: [
    { from: 100, to: 101, cond: '0,5s/G_Takt.X100' },
    { from: 101, to: 100, cond: '0,5s/G_Takt.X101' },
  ],
};

export const G_EINRICHT: GrafcetDef = {
  name: 'G_Einricht',
  stepVar: 'G_Einricht_1.iStep',
  steps: [
    { id: 300, initial: true },
    {
      id: 301,
      actions: [
        { text: 'QA5', cond: 'SJ6 * !SJ7 * !QA6 * !BG11 * BG21' },
        { text: 'QA6', cond: 'SJ7 * !SJ6 * !QA5 * !BG13 * BG21' },
        { text: 'MB21', cond: 'SJ8 * !SJ9 * !BG21' },
        { text: 'MB22', cond: 'SJ9 * !SJ8 * !BG22' },
        { text: 'QA60', cond: '!(5s/SJ12)' },
      ],
    },
  ],
  transitions: [
    { from: 300, to: 301, cond: '!SJ4' },
    { from: 301, to: 300, cond: 'SJ4' },
  ],
};

export const G_ANZEIGE: GrafcetDef = {
  name: 'G_Anzeige',
  stepVar: 'G_Anzeige_1.iStep',
  steps: [
    { id: 200, initial: true },
    {
      id: 201,
      actions: [
        { text: 'PF2 Grundstellung', cond: 'BG13 * BG21 * BG54 * BP1 * FC7' },
        { text: 'PF4 Druck vorhanden', cond: 'BP1' },
        { text: 'PF6 Linksfahrt', cond: 'QA5 * Takt' },
        { text: 'PF7 Rechtsfahrt', cond: 'QA6 * Takt' },
        { text: 'PF10 MM20 eingefahren', cond: 'BG21' },
        { text: 'PF11 MM20 ausgefahren', cond: 'BG22' },
        { text: 'PF15 MB60 deaktiviert', cond: 'QA60' },
        { text: 'PF32 MB60 deaktiviert', cond: 'QA60' },
        { text: 'PF33 Pos. 1 und Pos. 3 belegt', cond: 'BG52 * BG53' },
        { text: 'PF5 Motorschutz ausgelöst', cond: '!FC7' },
      ],
    },
  ],
  transitions: [
    { from: 200, to: 201, cond: 'SJ3' },
    { from: 201, to: 200, cond: '!SJ3' },
  ],
  note: 'Vorbereitungsstand: Grundstellung zusätzlich mit BG54 (Würfel im Magazin).',
};

export const G_AUTO_V: GrafcetDef = {
  name: 'G_Auto (Vorbereitung)',
  stepVar: 'G_Auto_1.iStep',
  steps: [
    { id: 500, initial: true, actions: [{ text: 'C1 := 0', stored: 'activate' }] },
    { id: 501, actions: [{ text: 'C2 := Pos. 4', stored: 'activate' }] },
    { id: 502, actions: [{ text: 'QA5 Linksfahrt' }, { text: 'C1 := C1 + 1', cond: '↓BG12' }] },
    { id: 503, actions: [{ text: 'MB22', cond: '1s/X503' }] },
    { id: 504, actions: [{ text: 'MB21' }] },
    { id: 505, actions: [{ text: 'C2 := Pos. 1', stored: 'activate' }] },
    { id: 506, actions: [{ text: 'QA5 Linksfahrt' }, { text: 'C1 := C1 + 1', cond: '↓BG12' }] },
    { id: 507, actions: [{ text: 'MB22', cond: '1s/X507' }] },
    { id: 508, actions: [{ text: 'QA60' }, { text: 'MB21', cond: '1s/X508 * BG52' }] },
    { id: 509, actions: [{ text: 'QA6 Rechtsfahrt' }] },
  ],
  transitions: [
    { from: 500, to: 501, cond: 'SJ5 * BG13 * BG21 * !BG52 * !BG53 * BG54' },
    { from: 501, to: 502, cond: 'X501' },
    { from: 502, to: 503, cond: '[C1 = C2]' },
    { from: 503, to: 504, cond: '1s/BG22' },
    { from: 504, to: 505, cond: '1s/BG21' },
    { from: 505, to: 506, cond: 'X505' },
    { from: 506, to: 507, cond: '[C1 = C2]' },
    { from: 507, to: 508, cond: '1s/BG22' },
    { from: 508, to: 509, cond: '1s/BG21' },
    { from: 509, to: 500, cond: 'BG13' },
  ],
};

export const G_AUTO_B: GrafcetDef = {
  name: 'G_Auto (Bereitstellung)',
  stepVar: 'G_Auto_1.iStep',
  steps: [
    { id: 500, initial: true, actions: [{ text: 'C1 := 0', stored: 'activate' }] },
    { id: 501, actions: [{ text: 'C2 := Pos. 2', stored: 'activate' }] },
    { id: 502, actions: [{ text: 'QA5 Linksfahrt' }, { text: 'C1 := C1 + 1', cond: '↓BG12' }] },
    { id: 503, actions: [{ text: 'MB22', cond: '1s/X503' }] },
    { id: 504, actions: [{ text: 'MB21' }, { text: 'C2 := Pos. 1', stored: 'activate' }] },
    { id: 505, actions: [{ text: 'QA5 Linksfahrt' }, { text: 'C1 := C1 + 1', cond: '↓BG12' }] },
    { id: 506, actions: [{ text: 'MB22', cond: '1s/X506' }] },
    { id: 507, actions: [{ text: 'QA60' }, { text: 'MB21', cond: '1s/X507 * BG52' }, { text: 'C2 := Pos. 2', stored: 'activate' }] },
    { id: 508, actions: [{ text: 'QA6 Rechtsfahrt' }, { text: 'C1 := C1 - 1', cond: '↓BG12' }] },
    { id: 509, actions: [{ text: 'MB22', cond: '1s/X509' }] },
    { id: 510, actions: [{ text: 'MB21' }, { text: 'C2 := Pos. 3', stored: 'activate' }] },
    { id: 511, actions: [{ text: 'QA6 Rechtsfahrt' }, { text: 'C1 := C1 - 1', cond: '↓BG12' }] },
    { id: 512, actions: [{ text: 'MB22', cond: '1s/X512' }] },
    { id: 513, actions: [{ text: 'QA60' }, { text: 'MB21', cond: '1s/X513 * BG53' }] },
    { id: 514, actions: [{ text: 'QA6 Rechtsfahrt' }] },
  ],
  transitions: [
    { from: 500, to: 501, cond: 'SJ5 * BG13 * BG21 * !BG52 * !BG53' },
    { from: 501, to: 502, cond: 'X501' },
    { from: 502, to: 503, cond: '[C1 = C2]' },
    { from: 503, to: 504, cond: '1s/BG22' },
    { from: 504, to: 505, cond: '1s/BG21' },
    { from: 505, to: 506, cond: '[C1 = C2]' },
    { from: 506, to: 507, cond: '1s/BG22' },
    { from: 507, to: 508, cond: '1s/BG21' },
    { from: 508, to: 509, cond: '[C1 = C2]' },
    { from: 509, to: 510, cond: '1s/BG22' },
    { from: 510, to: 511, cond: '1s/BG21' },
    { from: 511, to: 512, cond: '[C1 = C2]' },
    { from: 512, to: 513, cond: '1s/BG22' },
    { from: 513, to: 514, cond: '1s/BG21' },
    { from: 514, to: 500, cond: 'BG13' },
  ],
};

export const ALL_V = [G_MAIN, G_TAKT, G_EINRICHT, G_ANZEIGE, G_AUTO_V];
