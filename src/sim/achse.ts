/**
 * Achsenmodell der AP2 (Winter 2026/27), nachgebaut als Simulation.
 * Schlitten auf Spindel (Motor QA5 links / QA6 rechts), Impulsgeber BG12,
 * Endlagen BG11 (links, Pos. 0) und BG13 (rechts, Grundposition 10),
 * Hubzylinder MM20 mit Elektromagnet MB60 zum Greifen der Würfel.
 * Adressen wie im PC-WORX-Projekt des Ausbildungsbetriebs (AXC 1050).
 */
import type { InputCtl, OutputInd, Plant, PlantEvent, Value } from './types';
import { globalsText } from './types';

export type Material = 'metall' | 'kunststoff';
export type Variante = 'bereitstellung' | 'vorbereitung';

/** mm Weg pro BG12-Impuls */
export const PITCH = 1.8;
/** Strecke von BG13 (rechts, 0 mm) bis BG11 (links) */
export const LEN = 190;
/** Abstand bis zum mechanischen Anschlag hinter den Endlagen */
const OVERTRAVEL = 35;
/** Fahrgeschwindigkeit in mm/s */
const SPEED = 30;
/** Hubzeit Zylinder in s */
const STROKE_TIME = 0.4;
/** Toleranz beim Greifen/Ablegen in mm */
const TOL = 3.6;

export const POS = { pos1: 90, pos2: 60, pos3: 30, pos4: 45 } as const;

export const ACHSE_INPUTS: (InputCtl & { op: string })[] = [
  { name: 'KE2', label: 'Meldung NOT-AUS o. k.', kind: 'sensor', address: '%IX0.0', op: 'I0' },
  { name: 'SJ3', label: 'Steuerung AUS/EIN', kind: 'switch', address: '%IX0.1', op: 'I1' },
  { name: 'SJ4', label: 'Betriebsart Einricht (0) / Automatik (1)', kind: 'switch', address: '%IX0.2', op: 'I2' },
  { name: 'SJ5', label: 'Start Automatik', kind: 'button', address: '%IX0.3', op: 'I3' },
  { name: 'SJ6', label: 'MA10 Linksfahrt', kind: 'button', address: '%IX0.4', op: 'I4' },
  { name: 'SJ7', label: 'MA10 Rechtsfahrt', kind: 'button', address: '%IX0.5', op: 'I5' },
  { name: 'SJ8', label: 'Zylinder MM20 einfahren', kind: 'button', address: '%IX0.6', op: 'I6' },
  { name: 'SJ9', label: 'Zylinder MM20 ausfahren', kind: 'button', address: '%IX0.7', op: 'I7' },
  { name: 'SJ12', label: 'Magnet deaktivieren', kind: 'button', address: '%IX1.2', op: 'I10' },
  { name: 'BP1', label: 'Betriebsdruck vorhanden', kind: 'sensor', address: '%IX1.3', op: 'I11' },
  { name: 'BG11', label: 'X-Achse Endlage links (Pos. 0)', kind: 'sensor', address: '%IX1.4', op: 'I12' },
  { name: 'BG12', label: 'X-Achse Positionserfassung (Impulse)', kind: 'sensor', address: '%IX1.5', op: 'I13' },
  { name: 'BG13', label: 'X-Achse Endlage rechts (Grundposition)', kind: 'sensor', address: '%IX1.6', op: 'I14' },
  { name: 'BG21', label: 'Zylinder MM20 eingefahren', kind: 'sensor', address: '%IX1.7', op: 'I15' },
  { name: 'BG22', label: 'Zylinder MM20 ausgefahren', kind: 'sensor', address: '%IX2.0', op: 'I16' },
  { name: 'BG54', label: 'Materialerkennung Magazin (kapazitiv)', kind: 'sensor', address: '%IX2.4', op: 'I20' },
  { name: 'BG52', label: 'Ind. Sensor: Teil auf Pos. 1', kind: 'sensor', address: '%IX2.5', op: 'I21' },
  { name: 'BG53', label: 'Kap. Sensor: Teil auf Pos. 3', kind: 'sensor', address: '%IX2.6', op: 'I22' },
  { name: 'FC7', label: 'Motorschutz i. O.', kind: 'sensor', address: '%IX2.7', op: 'I23' },
];

export const ACHSE_OUTPUTS: (OutputInd & { op: string })[] = [
  { name: 'MB21', label: 'Zylinder MM20 einfahren', kind: 'valve', address: '%QX4.0', op: 'O0' },
  { name: 'MB22', label: 'Zylinder MM20 ausfahren', kind: 'valve', address: '%QX4.1', op: 'O1' },
  { name: 'QA5', label: 'X-Achse Linksfahrt', kind: 'motor', address: '%QX4.6', op: 'O6' },
  { name: 'QA6', label: 'X-Achse Rechtsfahrt', kind: 'motor', address: '%QX4.7', op: 'O7' },
  { name: 'PF32', label: 'Magnet deaktiviert (Signalsäule)', kind: 'lamp', color: 'yellow', address: '%QX6.0', op: 'O8' },
  { name: 'PF33', label: 'Pos. 1 und Pos. 3 belegt (Signalsäule)', kind: 'lamp', color: 'green', address: '%QX6.1', op: 'O9' },
  { name: 'QA60', label: 'Schütz Magnet MB60 deaktivieren', kind: 'valve', address: '%QX6.2', op: 'O10' },
  { name: 'PF2', label: 'Grundstellung', kind: 'lamp', color: 'white', address: '%QX6.3', op: 'O11' },
  { name: 'PF3', label: 'Betriebsart Einricht/Automatik', kind: 'lamp', color: 'white', address: '%QX6.4', op: 'O12' },
  { name: 'PF4', label: 'Betriebsdruck vorhanden', kind: 'lamp', color: 'green', address: '%QX6.5', op: 'O13' },
  { name: 'PF5', label: 'Motorschutz ausgelöst', kind: 'lamp', color: 'red', address: '%QX6.6', op: 'O14' },
  { name: 'PF6', label: 'Linksfahrt (blinkend)', kind: 'lamp', color: 'yellow', address: '%QX6.7', op: 'O15' },
  { name: 'PF7', label: 'Rechtsfahrt (blinkend)', kind: 'lamp', color: 'yellow', address: '%QX7.0', op: 'O16' },
  { name: 'PF10', label: 'Zylinder MM20 eingefahren', kind: 'lamp', color: 'blue', address: '%QX7.2', op: 'O18' },
  { name: 'PF11', label: 'Zylinder MM20 ausgefahren', kind: 'lamp', color: 'blue', address: '%QX7.3', op: 'O19' },
  { name: 'PF15', label: 'Magnet MB60 deaktiviert', kind: 'lamp', color: 'yellow', address: '%QX7.4', op: 'O23' },
];

export const ACHSE_GLOBALS = globalsText(ACHSE_INPUTS, ACHSE_OUTPUTS);

export interface Slot {
  name: string;
  pulses: number;
  part: Material | null;
}

export class AchsePlant implements Plant {
  operator: Record<string, Value> = {};
  outputs: Record<string, Value> = {};
  events: PlantEvent[] = [];
  fault?: string;

  /** Schlittenposition in mm links von BG13 */
  x = 0;
  /** Zylinderhub 0 = eingefahren (oben), 1 = ausgefahren (unten) */
  z = 0;
  /** Richtung des 5/2-Impulsventils: true = ausfahren */
  valveOut = false;
  holding: Material | null = null;
  magazine: Material[] = [];
  magazinePulses: number;
  slots: Slot[] = [];
  floor = 0;
  ke2 = true;
  /** Bewegungsrichtung für Anzeige: -1 rechts, 1 links */
  moving = 0;
  now = 0;
  /** zählt Ablagen zur Bewertung */
  placed: { slot: string; material: Material; t: number }[] = [];

  constructor(public variante: Variante = 'vorbereitung') {
    this.magazinePulses = variante === 'vorbereitung' ? POS.pos4 : POS.pos2;
    this.reset();
  }

  reset() {
    this.operator = {
      SJ3: false,
      SJ4: false,
      SJ5: false,
      SJ6: false,
      SJ7: false,
      SJ8: false,
      SJ9: false,
      SJ12: false,
      /** NOT-AUS-Pilztaster gedrückt */
      SG1: false,
      /** Quittiertaster NOT-AUS */
      SJ2: false,
      /** Handventil Druckluft */
      Druckluft: true,
      /** Motorschutzschalter ausgelöst (Simulation) */
      Motorschutz: false,
    };
    this.outputs = {};
    this.events = [];
    this.fault = undefined;
    this.x = 0;
    this.z = 0;
    this.valveOut = false;
    this.holding = null;
    this.magazine = ['metall', 'metall', 'metall', 'metall'];
    this.slots = [
      { name: 'Pos. 1', pulses: POS.pos1, part: null },
      { name: 'Pos. 3', pulses: POS.pos3, part: null },
    ];
    this.floor = 0;
    this.ke2 = true;
    this.moving = 0;
    this.now = 0;
    this.placed = [];
  }

  log(level: PlantEvent['level'], text: string) {
    this.events.push({ t: this.now, level, text });
    if (this.events.length > 60) this.events.shift();
    if (level === 'fault' && !this.fault) this.fault = text;
  }

  /** Impulse ab Grundposition (für Anzeige) */
  get pulses() {
    return this.x / PITCH;
  }

  slotAt(pulsePos: number) {
    return Math.abs(this.x - pulsePos * PITCH) <= TOL;
  }

  readInputs(): Record<string, Value> {
    const s1 = this.slots[0]!;
    const s3 = this.slots[1]!;
    const frac = ((this.x / PITCH) % 1 + 1) % 1;
    return {
      KE2: this.ke2,
      SJ3: this.operator.SJ3!,
      SJ4: this.operator.SJ4!,
      SJ5: this.operator.SJ5!,
      SJ6: this.operator.SJ6!,
      SJ7: this.operator.SJ7!,
      SJ8: this.operator.SJ8!,
      SJ9: this.operator.SJ9!,
      SJ12: this.operator.SJ12!,
      BP1: !!this.operator.Druckluft,
      BG11: this.x >= LEN - 0.5,
      BG12: frac >= 0.5,
      BG13: this.x <= 0.5,
      BG21: this.z <= 0.02,
      BG22: this.z >= 0.98,
      BG54: this.variante === 'vorbereitung' && this.magazine.length > 0,
      BG52: s1.part === 'metall',
      BG53: s3.part !== null,
      FC7: !this.operator.Motorschutz,
    };
  }

  step(out: Record<string, Value>, dt: number, now: number) {
    this.now = now;
    this.outputs = out;
    // NOT-AUS-Kreis (Sicherheitsrelais KE2)
    if (this.operator.SG1) this.ke2 = false;
    else if (this.operator.SJ2 && !this.ke2) {
      this.ke2 = true;
      this.log('info', 'NOT-AUS quittiert');
    }
    const power = this.ke2;
    const air = !!this.operator.Druckluft;
    const qa5 = !!out.QA5 && power;
    const qa6 = !!out.QA6 && power;

    // Motor
    this.moving = 0;
    if (qa5 && qa6) {
      this.log('fault', 'QA5 und QA6 gleichzeitig an – Kurzschluss im Wendeschütz! Die Ausgänge müssen gegeneinander verriegelt sein.');
    } else if ((qa5 || qa6) && !this.operator.Motorschutz) {
      if (this.z > 0.1) {
        this.log('fault', 'Der Schlitten fährt mit ausgefahrenem Zylinder MM20 – Kollision! Erst einfahren (BG21), dann verfahren.');
      } else {
        const dir = qa5 ? 1 : -1;
        this.moving = dir;
        this.x += (dir * SPEED * dt) / 1000;
        if (this.x > LEN + OVERTRAVEL) {
          this.x = LEN + OVERTRAVEL;
          this.log('fault', 'Mechanischer Anschlag links! Der Motor wurde bei BG11 (Endlage links) nicht abgeschaltet.');
        }
        if (this.x < -OVERTRAVEL) {
          this.x = -OVERTRAVEL;
          this.log('fault', 'Mechanischer Anschlag rechts! Der Motor wurde bei BG13 (Grundposition) nicht abgeschaltet.');
        }
      }
    }

    // Ventil 5/2 mit zwei Spulen (Impulsventil): behält seine Stellung
    const mb21 = !!out.MB21 && power;
    const mb22 = !!out.MB22 && power;
    if (mb22 && !mb21) this.valveOut = true;
    else if (mb21 && !mb22) this.valveOut = false;
    if (air) {
      const dz = dt / 1000 / STROKE_TIME;
      const before = this.z;
      this.z = this.valveOut ? Math.min(1, this.z + dz) : Math.max(0, this.z - dz);
      if (before < 0.95 && this.z >= 0.95) this.onDown();
    }

    // Magnet: ist dauernd an, QA60 schaltet ihn ab (über Schütz). Bei NOT-AUS bleibt er an (Teil fällt nicht).
    const magnetOn = !(out.QA60 && power);
    if (this.holding && !magnetOn) this.release();
  }

  onDown() {
    if (this.holding) return;
    const magnetOn = !(this.outputs.QA60 && this.ke2);
    if (this.slotAt(this.magazinePulses)) {
      if (!magnetOn) return;
      const top = this.magazine[this.magazine.length - 1];
      if (!top) {
        this.log('warn', 'Das Magazin ist leer – nichts zu greifen.');
        return;
      }
      if (top === 'kunststoff') {
        this.log('warn', 'Kunststoffwürfel: der Magnet kann ihn nicht greifen.');
        return;
      }
      this.magazine.pop();
      this.holding = top;
      this.log('info', 'Metallwürfel aus dem Magazin gegriffen.');
      return;
    }
    for (const s of this.slots) {
      if (this.slotAt(s.pulses) && s.part && magnetOn && s.part === 'metall') {
        this.holding = s.part;
        s.part = null;
        this.log('info', `Würfel von ${s.name} wieder aufgenommen.`);
        return;
      }
    }
  }

  release() {
    const part = this.holding!;
    this.holding = null;
    const low = this.z >= 0.9;
    for (const s of this.slots) {
      if (this.slotAt(s.pulses)) {
        if (s.part) {
          this.floor++;
          this.log('fault', `${s.name} war schon belegt – der Würfel ist heruntergefallen.`);
          return;
        }
        s.part = part;
        this.placed.push({ slot: s.name, material: part, t: this.now });
        this.log(low ? 'info' : 'warn', low ? `Würfel auf ${s.name} abgelegt.` : `Würfel aus der Höhe auf ${s.name} fallen gelassen (Zylinder war nicht unten).`);
        return;
      }
    }
    if (this.slotAt(this.magazinePulses)) {
      this.magazine.push(part);
      this.log('warn', 'Würfel zurück ins Magazin gelegt.');
      return;
    }
    this.floor++;
    this.log('fault', `Würfel daneben fallen gelassen (bei ${this.pulses.toFixed(0)} Impulsen) – keine Ablage an dieser Stelle.`);
  }

  // ---------- Bedienung von außen ----------
  clearSlot(i: number) {
    const s = this.slots[i];
    if (s) s.part = null;
  }
  setSlot(i: number, m: Material | null) {
    const s = this.slots[i];
    if (s) s.part = m;
  }
  refill(m: Material) {
    if (this.magazine.length < 6) this.magazine.push(m);
  }
  emptyMagazine() {
    this.magazine = [];
  }
}
