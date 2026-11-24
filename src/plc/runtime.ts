/**
 * Laufzeit: führt ein geprüftes Projekt zyklisch aus – wie eine echte SPS.
 * Ein Zyklus: Eingänge lesen → Programm Main abarbeiten → Ausgänge schreiben.
 */
import type { ElemType, Expr, Stmt, VarDecl } from './ast';
import type { CompiledPou, CompiledProject } from './compiler';
import { RuntimeError } from './errors';
import { STD_FBS, STD_FUNCS, type Store, type Value } from './stdlib';

export interface Instance {
  /** Typname: PROGRAM-/FB-Name oder Standardbaustein */
  type: string;
  vars: Store;
  fbs: Record<string, Instance>;
  pou?: CompiledPou;
}

const MAX_LOOP = 10000;

class ExitSignal {}
class ReturnSignal {}

function defaultValue(t: string): Value {
  return t === 'BOOL' ? false : 0;
}

function wrap(t: ElemType | undefined, v: Value): Value {
  if (typeof v !== 'number' || !t) return v;
  switch (t) {
    case 'INT':
      return ((Math.trunc(v) + 32768) & 0xffff) - 32768;
    case 'UINT':
    case 'WORD':
      return Math.trunc(v) & 0xffff;
    case 'BYTE':
      return Math.trunc(v) & 0xff;
    case 'DINT':
      return Math.trunc(v) | 0;
    case 'TIME':
      return Math.max(0, Math.round(v));
    default:
      return v;
  }
}

export class PlcRuntime {
  globals: Store = {};
  main: Instance;
  /** SPS-Zeit in ms */
  now = 0;
  cycleCount = 0;
  error?: RuntimeError;

  constructor(public project: CompiledProject) {
    for (const g of project.globals) {
      this.globals[g.upper] = g.init ? this.constEval(g.init, g.typeName) : defaultValue(g.typeName);
    }
    this.main = this.createInstance(project.main.upper);
  }

  constEval(e: Expr, t: string): Value {
    const v = this.evalExpr(e, { type: '', vars: {}, fbs: {} });
    return wrap(t as ElemType, v);
  }

  createInstance(type: string): Instance {
    const std = STD_FBS[type];
    if (std) return { type, vars: std.init(), fbs: {} };
    const pou = this.project.pous.get(type);
    if (!pou) throw new RuntimeError(`Baustein ${type} fehlt`);
    const inst: Instance = { type, vars: {}, fbs: {}, pou };
    for (const d of pou.decls) {
      if (d.kind === 'VAR_EXTERNAL') continue;
      const sym = pou.syms.get(d.upper);
      if (sym?.fb) inst.fbs[d.upper] = this.createInstance(sym.fb);
      else inst.vars[d.upper] = d.init ? this.constEval(d.init, d.typeName) : defaultValue(d.typeName);
    }
    return inst;
  }

  /** Einen SPS-Zyklus ausführen */
  cycle(dtMs: number) {
    if (this.error) return;
    this.now += dtMs;
    this.cycleCount++;
    try {
      this.execPou(this.main);
    } catch (e) {
      if (e instanceof RuntimeError) this.error = e;
      else if (e instanceof ReturnSignal) {
        /* RETURN im Hauptprogramm */
      } else throw e;
    }
  }

  execPou(inst: Instance) {
    try {
      this.execList(inst.pou!.body, inst);
    } catch (e) {
      if (!(e instanceof ReturnSignal)) throw e;
    }
  }

  // ---------- Variablen lesen/schreiben ----------
  read(inst: Instance, upper: string, pos?: Expr['pos']): Value {
    const sym = inst.pou?.syms.get(upper);
    if (sym?.scope === 'global') return this.globals[upper]!;
    const v = inst.vars[upper];
    if (v === undefined) throw new RuntimeError(`Variable ${upper} nicht gefunden`, pos);
    return v;
  }

  write(inst: Instance, upper: string, v: Value) {
    const sym = inst.pou?.syms.get(upper);
    const t = sym?.elem;
    if (sym?.scope === 'global') this.globals[upper] = wrap(t, v);
    else inst.vars[upper] = wrap(t, v);
  }

  // ---------- Anweisungen ----------
  execList(list: Stmt[], inst: Instance) {
    for (const s of list) this.exec(s, inst);
  }

  exec(s: Stmt, inst: Instance) {
    switch (s.k) {
      case 'assign':
        if (s.member) {
          const fb = inst.fbs[s.targetUpper]!;
          const v = this.evalExpr(s.expr, inst);
          const t = this.pinElem(fb, s.memberUpper!);
          if (fb.pou) this.writeFbVar(fb, s.memberUpper!, v);
          else fb.vars[s.memberUpper!] = wrap(t, v);
          return;
        }
        this.write(inst, s.targetUpper, this.evalExpr(s.expr, inst));
        return;
      case 'fbcall':
        this.callFb(inst, s);
        return;
      case 'if':
        for (const b of s.branches) {
          if (this.evalExpr(b.cond, inst)) {
            this.execList(b.body, inst);
            return;
          }
        }
        if (s.elseBody) this.execList(s.elseBody, inst);
        return;
      case 'case': {
        const v = this.evalExpr(s.sel, inst) as number;
        for (const c of s.cases) {
          if (c.labels.some((l) => v >= l.from && v <= l.to)) {
            this.execList(c.body, inst);
            return;
          }
        }
        if (s.elseBody) this.execList(s.elseBody, inst);
        return;
      }
      case 'for': {
        const from = this.evalExpr(s.from, inst) as number;
        const to = this.evalExpr(s.to, inst) as number;
        const by = s.by ? (this.evalExpr(s.by, inst) as number) : 1;
        if (by === 0) throw new RuntimeError('FOR-Schleife mit Schrittweite 0 läuft endlos', s.pos);
        let n = 0;
        try {
          for (let i = from; by > 0 ? i <= to : i >= to; i += by) {
            this.write(inst, s.vUpper, i);
            this.execList(s.body, inst);
            if (++n > MAX_LOOP) throw new RuntimeError('Endlosschleife – die SPS würde hier hängen bleiben (Zykluszeit überschritten)', s.pos);
          }
        } catch (e) {
          if (!(e instanceof ExitSignal)) throw e;
        }
        return;
      }
      case 'while': {
        let n = 0;
        try {
          while (this.evalExpr(s.cond, inst)) {
            this.execList(s.body, inst);
            if (++n > MAX_LOOP) throw new RuntimeError('Endlosschleife – die SPS würde hier hängen bleiben (Zykluszeit überschritten)', s.pos);
          }
        } catch (e) {
          if (!(e instanceof ExitSignal)) throw e;
        }
        return;
      }
      case 'repeat': {
        let n = 0;
        try {
          do {
            this.execList(s.body, inst);
            if (++n > MAX_LOOP) throw new RuntimeError('Endlosschleife – die SPS würde hier hängen bleiben (Zykluszeit überschritten)', s.pos);
          } while (!this.evalExpr(s.cond, inst));
        } catch (e) {
          if (!(e instanceof ExitSignal)) throw e;
        }
        return;
      }
      case 'exit':
        throw new ExitSignal();
      case 'return':
        throw new ReturnSignal();
      case 'empty':
        return;
    }
  }

  pinElem(fb: Instance, pin: string): ElemType | undefined {
    const std = STD_FBS[fb.type];
    if (std) return std.pins.find((p) => p.name === pin)?.type;
    return fb.pou?.syms.get(pin)?.elem;
  }

  writeFbVar(fb: Instance, upper: string, v: Value) {
    fb.vars[upper] = wrap(fb.pou?.syms.get(upper)?.elem, v);
  }

  callFb(inst: Instance, s: Extract<Stmt, { k: 'fbcall' }>) {
    const fb = inst.fbs[s.instUpper]!;
    for (const a of s.args) {
      if (a.dir === 'in') {
        const v = this.evalExpr(a.expr!, inst);
        if (fb.pou) this.writeFbVar(fb, a.upper, v);
        else fb.vars[a.upper] = wrap(this.pinElem(fb, a.upper), v);
      }
    }
    const std = STD_FBS[fb.type];
    if (std) std.exec(fb.vars, this.now);
    else this.execPou(fb);
    for (const a of s.args) {
      if (a.dir === 'out') this.write(inst, a.target!, fb.vars[a.upper]!);
    }
  }

  // ---------- Ausdrücke ----------
  evalExpr(e: Expr, inst: Instance): Value {
    switch (e.k) {
      case 'lit':
        return e.value;
      case 'var':
        return this.read(inst, e.upper, e.pos);
      case 'member': {
        const fb = inst.fbs[e.objUpper];
        if (!fb) throw new RuntimeError(`Baustein ${e.obj} nicht gefunden`, e.pos);
        return fb.vars[e.memberUpper]!;
      }
      case 'unary': {
        const v = this.evalExpr(e.arg, inst);
        if (e.op === 'NOT') return typeof v === 'boolean' ? !v : ~v & 0xffff;
        return -(v as number);
      }
      case 'call': {
        const f = STD_FUNCS[e.upper]!;
        return f.exec(e.args.map((a) => this.evalExpr(a, inst)));
      }
      case 'bin': {
        const op = e.op;
        if (op === 'AND') {
          const l = this.evalExpr(e.left, inst);
          if (typeof l === 'boolean') return l && (this.evalExpr(e.right, inst) as boolean);
          return (l as number) & (this.evalExpr(e.right, inst) as number);
        }
        if (op === 'OR') {
          const l = this.evalExpr(e.left, inst);
          if (typeof l === 'boolean') return l || (this.evalExpr(e.right, inst) as boolean);
          return (l as number) | (this.evalExpr(e.right, inst) as number);
        }
        const l = this.evalExpr(e.left, inst);
        const r = this.evalExpr(e.right, inst);
        switch (op) {
          case 'XOR':
            return typeof l === 'boolean' ? l !== r : (l as number) ^ (r as number);
          case '=':
            return l === r;
          case '<>':
            return l !== r;
          case '<':
            return (l as number) < (r as number);
          case '>':
            return (l as number) > (r as number);
          case '<=':
            return (l as number) <= (r as number);
          case '>=':
            return (l as number) >= (r as number);
          case '+':
            return (l as number) + (r as number);
          case '-':
            return (l as number) - (r as number);
          case '*':
            return (l as number) * (r as number);
          case '/': {
            if (r === 0) throw new RuntimeError('Division durch 0 – die SPS geht in STOP', e.pos, 'Prüfe vor dem Teilen, ob der Teiler 0 ist.');
            const isInt = Number.isInteger(l) && Number.isInteger(r) && this.isIntExpr(e, inst);
            return isInt ? Math.trunc((l as number) / (r as number)) : (l as number) / (r as number);
          }
          case 'MOD':
            if (r === 0) throw new RuntimeError('MOD 0 – Division durch 0', e.pos);
            return (l as number) % (r as number);
        }
        throw new RuntimeError(`Unbekannter Operator ${op}`, e.pos);
      }
    }
  }

  /** Ganzzahl-Division erkennen (REAL-Operanden können zufällig ganzzahlig sein) */
  isIntExpr(e: Expr, inst: Instance): boolean {
    switch (e.k) {
      case 'lit':
        return e.type === 'INTLIT';
      case 'var': {
        const sym = inst.pou?.syms.get(e.upper);
        const t = sym?.elem;
        return !!t && t !== 'REAL' && t !== 'LREAL';
      }
      case 'member':
        return true;
      case 'unary':
        return this.isIntExpr(e.arg, inst);
      case 'bin':
        return this.isIntExpr(e.left, inst) && this.isIntExpr(e.right, inst);
      case 'call':
        return !e.upper.endsWith('REAL');
    }
  }

  // ---------- Zugriff von außen (Simulator, Tests, Beobachten) ----------

  getGlobal(name: string): Value | undefined {
    return this.globals[name.toUpperCase()];
  }

  setGlobal(name: string, v: Value) {
    const u = name.toUpperCase();
    if (u in this.globals) {
      const d = this.project.globalSyms.get(u);
      this.globals[u] = wrap(d?.typeName as ElemType, v);
    }
  }

  /** Pfad wie "Main.Schritt", "G_Auto_1.iStep", "T1.Q" (relativ zu Main) oder globaler Name */
  resolve(path: string): Value | undefined {
    const parts = path.toUpperCase().split('.');
    if (parts[0] === 'MAIN') parts.shift();
    if (parts.length === 1 && parts[0]! in this.globals && !(parts[0]! in this.main.vars)) return this.globals[parts[0]!];
    let inst: Instance = this.main;
    for (let i = 0; i < parts.length - 1; i++) {
      const next = inst.fbs[parts[i]!];
      if (!next) return undefined;
      inst = next;
    }
    const last = parts[parts.length - 1]!;
    const sym = inst.pou?.syms.get(last);
    if (sym?.scope === 'global') return this.globals[last];
    return inst.vars[last];
  }

  /** Alle beobachtbaren Werte für die Online-Ansicht */
  watchList(): WatchEntry[] {
    const out: WatchEntry[] = [];
    const walk = (inst: Instance, prefix: string, depth: number) => {
      const decls: VarDecl[] = inst.pou?.decls ?? [];
      if (inst.pou) {
        for (const d of decls) {
          if (d.kind === 'VAR_EXTERNAL') continue;
          const sym = inst.pou.syms.get(d.upper);
          if (sym?.fb) {
            const child = inst.fbs[d.upper];
            if (!child) continue;
            if (child.pou) walk(child, prefix + d.name + '.', depth + 1);
            else {
              const std = STD_FBS[child.type]!;
              for (const p of std.pins) {
                if (p.dir === 'internal') continue;
                out.push({ path: prefix + d.name + '.' + p.name, type: p.type, value: child.vars[p.name]!, depth: depth + 1, group: prefix + d.name, kind: p.dir === 'in' ? 'VAR_INPUT' : 'VAR_OUTPUT' });
              }
            }
          } else {
            out.push({ path: prefix + d.name, type: d.typeName as ElemType, value: inst.vars[d.upper]!, depth, group: prefix.replace(/\.$/, '') || 'Main', kind: d.kind });
          }
        }
      }
    };
    walk(this.main, '', 0);
    return out;
  }
}

export interface WatchEntry {
  path: string;
  type: ElemType;
  value: Value;
  depth: number;
  group: string;
  kind: string;
}

export function formatValue(v: Value | undefined, type?: string): string {
  if (v === undefined) return '–';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (type === 'TIME') return formatTime(v);
  if (type === 'REAL' || type === 'LREAL') return Number.isInteger(v) ? v.toFixed(1) : String(Math.round(v * 1000) / 1000);
  return String(v);
}

export function formatTime(ms: number): string {
  if (ms === 0) return 'T#0ms';
  let rest = Math.round(ms);
  const parts: string[] = [];
  const h = Math.floor(rest / 3600000);
  rest -= h * 3600000;
  const m = Math.floor(rest / 60000);
  rest -= m * 60000;
  const s = Math.floor(rest / 1000);
  rest -= s * 1000;
  if (h) parts.push(h + 'h');
  if (m) parts.push(m + 'm');
  if (s) parts.push(s + 's');
  if (rest) parts.push(rest + 'ms');
  return 'T#' + parts.join('');
}
