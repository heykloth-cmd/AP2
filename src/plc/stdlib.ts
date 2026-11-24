import type { ElemType } from './ast';

export type Value = boolean | number;
export type Store = Record<string, Value>;

export interface FbPin {
  name: string;
  type: ElemType;
  dir: 'in' | 'out' | 'internal';
  comment?: string;
}

export interface StdFb {
  name: string;
  title: string;
  pins: FbPin[];
  /** Interner Zustand beim Anlegen */
  init(): Store;
  exec(v: Store, now: number): void;
}

const timerPins = (): FbPin[] => [
  { name: 'IN', type: 'BOOL', dir: 'in', comment: 'Startsignal' },
  { name: 'PT', type: 'TIME', dir: 'in', comment: 'Zeitvorgabe, z. B. T#2s' },
  { name: 'Q', type: 'BOOL', dir: 'out', comment: 'Ausgang' },
  { name: 'ET', type: 'TIME', dir: 'out', comment: 'abgelaufene Zeit' },
];

const TON: StdFb = {
  name: 'TON',
  title: 'Einschaltverzögerung',
  pins: timerPins(),
  init: () => ({ IN: false, PT: 0, Q: false, ET: 0, _START: 0, _RUN: false }),
  exec(v, now) {
    if (!v.IN) {
      v._RUN = false;
      v.Q = false;
      v.ET = 0;
      return;
    }
    if (!v._RUN) {
      v._RUN = true;
      v._START = now;
    }
    const et = now - (v._START as number);
    const pt = v.PT as number;
    v.ET = Math.min(et, pt);
    v.Q = et >= pt;
  },
};

const TOF: StdFb = {
  name: 'TOF',
  title: 'Ausschaltverzögerung',
  pins: timerPins(),
  init: () => ({ IN: false, PT: 0, Q: false, ET: 0, _START: 0, _RUN: false }),
  exec(v, now) {
    if (v.IN) {
      v._RUN = false;
      v.Q = true;
      v.ET = 0;
      return;
    }
    if (!v.Q) {
      v.ET = 0;
      return;
    }
    if (!v._RUN) {
      v._RUN = true;
      v._START = now;
    }
    const et = now - (v._START as number);
    const pt = v.PT as number;
    v.ET = Math.min(et, pt);
    if (et >= pt) {
      v.Q = false;
      v._RUN = false;
    }
  },
};

const TP: StdFb = {
  name: 'TP',
  title: 'Impuls',
  pins: timerPins(),
  init: () => ({ IN: false, PT: 0, Q: false, ET: 0, _START: 0, _PREV: false }),
  exec(v, now) {
    if (!v.Q && v.IN && !v._PREV && (v.ET as number) === 0) {
      v.Q = true;
      v._START = now;
    }
    if (v.Q) {
      const et = now - (v._START as number);
      const pt = v.PT as number;
      v.ET = Math.min(et, pt);
      if (et >= pt) v.Q = false;
    } else if (!v.IN) {
      v.ET = 0;
    }
    v._PREV = v.IN;
  },
};

const R_TRIG: StdFb = {
  name: 'R_TRIG',
  title: 'steigende Flanke',
  pins: [
    { name: 'CLK', type: 'BOOL', dir: 'in', comment: 'Signal' },
    { name: 'Q', type: 'BOOL', dir: 'out', comment: 'TRUE für genau einen Zyklus bei 0→1' },
  ],
  init: () => ({ CLK: false, Q: false, _M: false }),
  exec(v) {
    v.Q = !!v.CLK && !v._M;
    v._M = v.CLK;
  },
};

const F_TRIG: StdFb = {
  name: 'F_TRIG',
  title: 'fallende Flanke',
  pins: [
    { name: 'CLK', type: 'BOOL', dir: 'in', comment: 'Signal' },
    { name: 'Q', type: 'BOOL', dir: 'out', comment: 'TRUE für genau einen Zyklus bei 1→0' },
  ],
  // _M = "war das Signal vorher FALSE?" – Start mit TRUE, damit es beim Einschalten keinen Fehlimpuls gibt
  init: () => ({ CLK: false, Q: false, _M: true }),
  exec(v) {
    v.Q = !v.CLK && !v._M;
    v._M = !v.CLK;
  },
};

const CTU: StdFb = {
  name: 'CTU',
  title: 'Vorwärtszähler',
  pins: [
    { name: 'CU', type: 'BOOL', dir: 'in', comment: 'Zähleingang (zählt bei steigender Flanke)' },
    { name: 'R', type: 'BOOL', dir: 'in', comment: 'Zurücksetzen' },
    { name: 'PV', type: 'INT', dir: 'in', comment: 'Sollwert' },
    { name: 'Q', type: 'BOOL', dir: 'out', comment: 'TRUE, wenn CV >= PV' },
    { name: 'CV', type: 'INT', dir: 'out', comment: 'aktueller Zählerstand' },
  ],
  init: () => ({ CU: false, R: false, PV: 0, Q: false, CV: 0, _M: false }),
  exec(v) {
    if (v.R) v.CV = 0;
    else if (v.CU && !v._M && (v.CV as number) < 32767) v.CV = (v.CV as number) + 1;
    v._M = v.CU;
    v.Q = (v.CV as number) >= (v.PV as number);
  },
};

const CTD: StdFb = {
  name: 'CTD',
  title: 'Rückwärtszähler',
  pins: [
    { name: 'CD', type: 'BOOL', dir: 'in', comment: 'Zähleingang (zählt bei steigender Flanke rückwärts)' },
    { name: 'LD', type: 'BOOL', dir: 'in', comment: 'Laden: CV := PV' },
    { name: 'PV', type: 'INT', dir: 'in', comment: 'Startwert' },
    { name: 'Q', type: 'BOOL', dir: 'out', comment: 'TRUE, wenn CV <= 0' },
    { name: 'CV', type: 'INT', dir: 'out', comment: 'aktueller Zählerstand' },
  ],
  init: () => ({ CD: false, LD: false, PV: 0, Q: false, CV: 0, _M: false }),
  exec(v) {
    if (v.LD) v.CV = v.PV;
    else if (v.CD && !v._M && (v.CV as number) > -32768) v.CV = (v.CV as number) - 1;
    v._M = v.CD;
    v.Q = (v.CV as number) <= 0;
  },
};

const CTUD: StdFb = {
  name: 'CTUD',
  title: 'Vor-/Rückwärtszähler',
  pins: [
    { name: 'CU', type: 'BOOL', dir: 'in', comment: 'vorwärts zählen' },
    { name: 'CD', type: 'BOOL', dir: 'in', comment: 'rückwärts zählen' },
    { name: 'R', type: 'BOOL', dir: 'in', comment: 'Zurücksetzen auf 0' },
    { name: 'LD', type: 'BOOL', dir: 'in', comment: 'Laden: CV := PV' },
    { name: 'PV', type: 'INT', dir: 'in', comment: 'Sollwert' },
    { name: 'QU', type: 'BOOL', dir: 'out', comment: 'CV >= PV' },
    { name: 'QD', type: 'BOOL', dir: 'out', comment: 'CV <= 0' },
    { name: 'CV', type: 'INT', dir: 'out', comment: 'Zählerstand' },
  ],
  init: () => ({ CU: false, CD: false, R: false, LD: false, PV: 0, QU: false, QD: false, CV: 0, _MU: false, _MD: false }),
  exec(v) {
    if (v.R) v.CV = 0;
    else if (v.LD) v.CV = v.PV;
    else {
      const up = v.CU && !v._MU;
      const dn = v.CD && !v._MD;
      if (up && !dn) v.CV = (v.CV as number) + 1;
      if (dn && !up) v.CV = (v.CV as number) - 1;
    }
    v._MU = v.CU;
    v._MD = v.CD;
    v.QU = (v.CV as number) >= (v.PV as number);
    v.QD = (v.CV as number) <= 0;
  },
};

const SR: StdFb = {
  name: 'SR',
  title: 'Speicher, Setzen dominant',
  pins: [
    { name: 'S1', type: 'BOOL', dir: 'in', comment: 'Setzen (gewinnt)' },
    { name: 'R', type: 'BOOL', dir: 'in', comment: 'Rücksetzen' },
    { name: 'Q1', type: 'BOOL', dir: 'out', comment: 'Ausgang' },
  ],
  init: () => ({ S1: false, R: false, Q1: false }),
  exec(v) {
    v.Q1 = !!v.S1 || (!v.R && !!v.Q1);
  },
};

const RS: StdFb = {
  name: 'RS',
  title: 'Speicher, Rücksetzen dominant',
  pins: [
    { name: 'S', type: 'BOOL', dir: 'in', comment: 'Setzen' },
    { name: 'R1', type: 'BOOL', dir: 'in', comment: 'Rücksetzen (gewinnt)' },
    { name: 'Q1', type: 'BOOL', dir: 'out', comment: 'Ausgang' },
  ],
  init: () => ({ S: false, R1: false, Q1: false }),
  exec(v) {
    v.Q1 = !v.R1 && (!!v.S || !!v.Q1);
  },
};

export const STD_FBS: Record<string, StdFb> = { TON, TOF, TP, R_TRIG, F_TRIG, CTU, CTD, CTUD, SR, RS };

// ---------- Standardfunktionen ----------
export interface StdFunc {
  name: string;
  /** Rückgabetyp ermitteln; wirft Fehlertext bei falschen Argumenten */
  sig: (args: string[]) => ElemType | string;
  exec: (args: Value[]) => Value;
  doc: string;
}

const NUM = ['INT', 'DINT', 'UINT', 'WORD', 'BYTE', 'REAL', 'LREAL', 'INTLIT', 'REALLIT'];
const isNum = (t: string) => NUM.includes(t);

function conv(from: ElemType, to: ElemType, f: (x: number) => Value): StdFunc {
  return {
    name: `${from}_TO_${to}`,
    doc: `wandelt ${from} in ${to} um`,
    sig: (a) => {
      if (a.length !== 1) return `${from}_TO_${to} braucht genau einen Wert`;
      const t = a[0]!;
      const ok = t === from || (t === 'INTLIT' && from !== 'REAL' && from !== 'LREAL' && from !== 'BOOL') || (t === 'REALLIT' && (from === 'REAL' || from === 'LREAL'));
      if (!ok) return `${from}_TO_${to} erwartet einen ${from}-Wert, bekommt aber ${t.replace('LIT', '')}`;
      return to;
    },
    exec: (a) => f(typeof a[0] === 'boolean' ? (a[0] ? 1 : 0) : (a[0] as number)),
  };
}

/** Runden wie IEC: zur nächsten ganzen Zahl, .5 von der Null weg */
const roundIec = (x: number) => (x < 0 ? -Math.round(-x) : Math.round(x));

const funcs: StdFunc[] = [
  conv('INT', 'REAL', (x) => x),
  conv('DINT', 'REAL', (x) => x),
  conv('INT', 'LREAL', (x) => x),
  conv('REAL', 'INT', (x) => roundIec(x)),
  conv('REAL', 'DINT', (x) => roundIec(x)),
  conv('LREAL', 'INT', (x) => roundIec(x)),
  conv('REAL', 'LREAL', (x) => x),
  conv('LREAL', 'REAL', (x) => x),
  conv('INT', 'DINT', (x) => x),
  conv('DINT', 'INT', (x) => x),
  conv('INT', 'WORD', (x) => x),
  conv('WORD', 'INT', (x) => x),
  conv('INT', 'UINT', (x) => x),
  conv('UINT', 'INT', (x) => x),
  conv('BOOL', 'INT', (x) => x),
  conv('INT', 'BOOL', (x) => x !== 0),
  conv('TIME', 'DINT', (x) => x),
  conv('DINT', 'TIME', (x) => x),
  conv('INT', 'TIME', (x) => x),
  conv('TIME', 'INT', (x) => x),
  {
    name: 'TRUNC',
    doc: 'schneidet die Nachkommastellen ab (REAL → INT)',
    sig: (a) => (a.length === 1 && (a[0] === 'REAL' || a[0] === 'REALLIT' || a[0] === 'LREAL') ? 'INT' : 'TRUNC erwartet einen REAL-Wert'),
    exec: (a) => Math.trunc(a[0] as number),
  },
  {
    name: 'ABS',
    doc: 'Betrag (ohne Vorzeichen)',
    sig: (a) => (a.length === 1 && isNum(a[0]!) ? lit(a[0]!) : 'ABS erwartet eine Zahl'),
    exec: (a) => Math.abs(a[0] as number),
  },
  {
    name: 'MIN',
    doc: 'kleinerer Wert',
    sig: (a) => same(a, 'MIN'),
    exec: (a) => Math.min(...(a as number[])),
  },
  {
    name: 'MAX',
    doc: 'größerer Wert',
    sig: (a) => same(a, 'MAX'),
    exec: (a) => Math.max(...(a as number[])),
  },
  {
    name: 'LIMIT',
    doc: 'LIMIT(MN, IN, MX) begrenzt IN auf den Bereich MN…MX',
    sig: (a) => (a.length === 3 ? same(a, 'LIMIT') : 'LIMIT braucht drei Werte: LIMIT(Minimum, Wert, Maximum)'),
    exec: (a) => Math.min(Math.max(a[1] as number, a[0] as number), a[2] as number),
  },
  {
    name: 'SEL',
    doc: 'SEL(G, IN0, IN1): G=FALSE → IN0, G=TRUE → IN1',
    sig: (a) => {
      if (a.length !== 3) return 'SEL braucht drei Werte: SEL(Bedingung, Wert0, Wert1)';
      if (a[0] !== 'BOOL') return 'Der erste Wert von SEL muss BOOL sein';
      const r = same([a[1]!, a[2]!], 'SEL');
      return r;
    },
    exec: (a) => (a[0] ? a[2]! : a[1]!),
  },
];

function lit(t: string): ElemType {
  if (t === 'INTLIT') return 'INT';
  if (t === 'REALLIT') return 'REAL';
  return t as ElemType;
}

function same(a: string[], name: string): ElemType | string {
  if (a.length < 2) return `${name} braucht mindestens zwei Werte`;
  let t: string | undefined;
  for (const x of a) {
    if (!isNum(x) && x !== 'TIME') return `${name} arbeitet nur mit Zahlen`;
    if (x === 'INTLIT' || x === 'REALLIT') continue;
    if (t && t !== x) return `${name}: alle Werte müssen denselben Datentyp haben (${t} und ${x})`;
    t = x;
  }
  if (!t) return a.includes('REALLIT') ? 'REAL' : 'INT';
  return t as ElemType;
}

export const STD_FUNCS: Record<string, StdFunc> = Object.fromEntries(funcs.map((f) => [f.name, f]));
