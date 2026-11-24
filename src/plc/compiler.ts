/**
 * Prüft ein Projekt (Typen, Namen, Bausteinaufrufe) und erzeugt daraus ein ausführbares Programm.
 * Strenge wie in PC WORX: keine automatische Typumwandlung, globale Variablen nur über VAR_EXTERNAL.
 */
import { ELEM_TYPES, type ElemType, type Expr, type Stmt, type VarDecl } from './ast';
import { CompileError, type Diagnostic, type Pos, suggest } from './errors';
import { parseCode, parseVars } from './parser';
import { STD_FBS, STD_FUNCS } from './stdlib';

export interface PouSource {
  name: string;
  kind: 'PROGRAM' | 'FUNCTION_BLOCK';
  vars: string;
  code: string;
  /** nur anzeigen, nicht bearbeitbar */
  readonly?: boolean;
}

/** Typ eines Ausdrucks während der Prüfung */
export type TypeT = ElemType | 'INTLIT' | 'REALLIT';

export interface Sym {
  decl: VarDecl;
  /** 'global' = über VAR_EXTERNAL; sonst Speicher der Instanz */
  scope: 'local' | 'global';
  elem?: ElemType;
  /** Name des Bausteintyps (TON, G_Auto, …) */
  fb?: string;
}

export interface CompiledPou {
  name: string;
  upper: string;
  kind: 'PROGRAM' | 'FUNCTION_BLOCK';
  decls: VarDecl[];
  syms: Map<string, Sym>;
  body: Stmt[];
}

export interface CompiledProject {
  pous: Map<string, CompiledPou>;
  main: CompiledPou;
  globals: VarDecl[];
  globalSyms: Map<string, VarDecl>;
}

export interface CompileResult {
  ok: boolean;
  diagnostics: Diagnostic[];
  project?: CompiledProject;
}

const INT_TYPES: TypeT[] = ['INT', 'DINT', 'UINT', 'WORD', 'BYTE'];
const REAL_TYPES: TypeT[] = ['REAL', 'LREAL'];
const isIntT = (t: TypeT) => INT_TYPES.includes(t) || t === 'INTLIT';
const isRealT = (t: TypeT) => REAL_TYPES.includes(t) || t === 'REALLIT';
const show = (t: TypeT) => (t === 'INTLIT' ? 'ganze Zahl' : t === 'REALLIT' ? 'Kommazahl' : t);

class PouChecker {
  syms = new Map<string, Sym>();
  diags: Diagnostic[] = [];
  /** wie oft wird welche Instanz aufgerufen */
  calls = new Map<string, number>();

  constructor(
    public src: PouSource,
    public decls: VarDecl[],
    public globals: Map<string, VarDecl>,
    public fbTypes: Map<string, { decls: VarDecl[] }>,
  ) {}

  diag(severity: 'error' | 'warning', message: string, pos: Pos, hint?: string, part: 'code' | 'vars' = 'code') {
    this.diags.push({ severity, message, hint, line: pos.line, col: pos.col, pou: this.src.name, part });
  }

  buildSymbols() {
    for (const d of this.decls) {
      if (this.syms.has(d.upper)) {
        this.diag('error', `Die Variable ${d.name} ist doppelt deklariert`, d.pos, undefined, 'vars');
        continue;
      }
      if (d.kind === 'VAR_GLOBAL') {
        this.diag('error', 'VAR_GLOBAL gehört in die globale Variablenliste, nicht in einen Baustein', d.pos, 'Im Baustein schreibst du stattdessen VAR_EXTERNAL.', 'vars');
        continue;
      }
      if (this.src.kind === 'PROGRAM' && (d.kind === 'VAR_INPUT' || d.kind === 'VAR_OUTPUT')) {
        // In PC WORX erlaubt, hier aber nicht verdrahtet
      }
      if (d.address && d.kind !== 'VAR') {
        this.diag('error', 'Eine Adresse (AT %…) gibt es nur in der globalen Variablenliste', d.pos, undefined, 'vars');
      }
      const sym: Sym = { decl: d, scope: d.kind === 'VAR_EXTERNAL' ? 'global' : 'local' };
      if (d.kind === 'VAR_EXTERNAL') {
        const g = this.globals.get(d.upper);
        if (!g) {
          const s = suggest(d.name, [...this.globals.values()].map((x) => x.name));
          this.diag(
            'error',
            `Die globale Variable ${d.name} gibt es nicht`,
            d.pos,
            s ? `Meintest du ${s}?` : 'VAR_EXTERNAL kann nur Variablen aus der globalen Variablenliste einbinden.',
            'vars',
          );
          continue;
        }
        if (g.typeName !== d.typeName) {
          this.diag('error', `${d.name} ist global als ${g.typeName} deklariert, hier aber als ${d.typeName}`, d.pos, undefined, 'vars');
        }
        if (d.init) this.diag('warning', 'Bei VAR_EXTERNAL wird kein Startwert angegeben – er kommt aus der globalen Liste', d.pos, undefined, 'vars');
      }
      if ((ELEM_TYPES as string[]).includes(d.typeName)) sym.elem = d.typeName as ElemType;
      else if (STD_FBS[d.typeName] || this.fbTypes.has(d.typeName)) {
        sym.fb = d.typeName;
        if (d.init) this.diag('error', 'Ein Funktionsbaustein bekommt keinen Startwert', d.pos, undefined, 'vars');
        if (d.kind !== 'VAR') {
          this.diag('error', `Bausteininstanzen (${d.typeName}) gehören in einen normalen VAR-Block`, d.pos, undefined, 'vars');
        }
        if (d.typeName === this.src.name.toUpperCase()) {
          this.diag('error', 'Ein Baustein kann sich nicht selbst enthalten', d.pos, undefined, 'vars');
        }
      } else {
        const s = suggest(d.typeName, [...ELEM_TYPES, ...Object.keys(STD_FBS), ...this.fbTypes.keys()]);
        this.diag(
          'error',
          `Unbekannter Datentyp ${d.typeName}`,
          d.pos,
          s ? `Meintest du ${s}?` : 'Möglich sind z. B. BOOL, INT, REAL, TIME oder Bausteine wie TON, R_TRIG, CTU.',
          'vars',
        );
        continue;
      }
      if (d.init && sym.elem) {
        try {
          const t = this.expr(d.init);
          this.assignable(sym.elem, t, d.init.pos, d.name);
        } catch (e) {
          if (e instanceof CompileError) this.diag('error', e.message, e.pos, e.hint, 'vars');
          else throw e;
        }
      }
      this.syms.set(d.upper, sym);
    }
  }

  lookup(name: string, upper: string, pos: Pos): Sym {
    const s = this.syms.get(upper);
    if (s) return s;
    if (this.globals.has(upper)) {
      throw new CompileError(
        `${name} ist eine globale Variable und muss im Baustein unter VAR_EXTERNAL eingetragen werden`,
        pos,
        `In PC WORX: Variable in die Variablentabelle des Bausteins übernehmen (Gültigkeit VAR_EXTERNAL). Hier:  VAR_EXTERNAL ${this.globals.get(upper)!.name} : ${this.globals.get(upper)!.typeName}; END_VAR`,
      );
    }
    if (STD_FBS[upper]) {
      throw new CompileError(
        `${name} ist ein Bausteintyp – du brauchst eine Instanz davon`,
        pos,
        `Deklariere z. B.  T_Start : ${upper};  und rufe dann  T_Start(…);  auf.`,
      );
    }
    const s2 = suggest(name, [...[...this.syms.values()].map((x) => x.decl.name), ...[...this.globals.values()].map((x) => x.name)]);
    throw new CompileError(
      `Die Variable ${name} ist nicht deklariert`,
      pos,
      s2 ? `Meintest du ${s2}? (Groß-/Kleinschreibung ist in ST egal, Tippfehler nicht.)` : 'Lege sie im Reiter „Variablen“ an, z. B.  ' + name + ' : BOOL;',
    );
  }

  /** Typ des Ausdrucks ermitteln */
  expr(e: Expr): TypeT {
    switch (e.k) {
      case 'lit':
        return e.type;
      case 'var': {
        const s = this.lookup(e.name, e.upper, e.pos);
        if (s.fb) {
          throw new CompileError(
            `${e.name} ist ein Baustein (${s.fb}) – frag einen Ausgang ab, z. B. ${e.name}.${this.firstOut(s.fb)}`,
            e.pos,
          );
        }
        return s.elem!;
      }
      case 'member': {
        const s = this.lookup(e.obj, e.objUpper, e.pos);
        if (!s.fb) {
          throw new CompileError(`${e.obj} ist kein Baustein, deshalb gibt es ${e.obj}.${e.member} nicht`, e.pos);
        }
        return this.pinType(s.fb, e.memberUpper, e.member, e.pos, 'read');
      }
      case 'unary': {
        const t = this.expr(e.arg);
        if (e.op === 'NOT') {
          if (t === 'BOOL' || t === 'WORD' || t === 'BYTE') return t;
          throw new CompileError(`NOT funktioniert nur mit BOOL, hier steht aber ${show(t)}`, e.pos);
        }
        if (isIntT(t) || isRealT(t)) return t;
        throw new CompileError(`Minus vor ${show(t)} ist nicht möglich`, e.pos);
      }
      case 'bin':
        return this.bin(e);
      case 'call': {
        const f = STD_FUNCS[e.upper];
        if (!f) {
          const s = this.syms.get(e.upper);
          if (s?.fb) {
            throw new CompileError(
              `Den Baustein ${e.name} ruft man als eigene Anweisung auf, nicht innerhalb eines Ausdrucks`,
              e.pos,
              `Erst:  ${e.name}(…);   dann:  … := ${e.name}.${this.firstOut(s.fb)};`,
            );
          }
          const sug = suggest(e.name, Object.keys(STD_FUNCS));
          throw new CompileError(`Unbekannte Funktion ${e.name}`, e.pos, sug ? `Meintest du ${sug}?` : undefined);
        }
        const ts = e.args.map((a) => this.expr(a));
        const r = f.sig(ts);
        if (!(ELEM_TYPES as string[]).includes(r)) throw new CompileError(r, e.pos);
        return r as ElemType;
      }
    }
  }

  firstOut(fb: string): string {
    const std = STD_FBS[fb];
    if (std) return std.pins.find((p) => p.dir === 'out')!.name;
    const u = this.fbTypes.get(fb);
    return u?.decls.find((d) => d.kind === 'VAR_OUTPUT')?.name ?? 'Ausgang';
  }

  pinType(fb: string, pinU: string, pin: string, pos: Pos, mode: 'read' | 'write'): ElemType {
    const std = STD_FBS[fb];
    if (std) {
      const p = std.pins.find((x) => x.name === pinU);
      if (!p) {
        const names = std.pins.map((x) => x.name).join(', ');
        throw new CompileError(`Der Baustein ${fb} hat keinen Anschluss ${pin}`, pos, `${fb} hat: ${names}`);
      }
      if (mode === 'write' && p.dir !== 'in') throw new CompileError(`${pin} ist ein Ausgang von ${fb} und kann nicht beschrieben werden`, pos);
      return p.type;
    }
    const u = this.fbTypes.get(fb)!;
    const d = u.decls.find((x) => x.upper === pinU);
    if (!d) {
      const names = u.decls.filter((x) => x.kind === 'VAR_INPUT' || x.kind === 'VAR_OUTPUT').map((x) => x.name).join(', ');
      throw new CompileError(`Der Baustein ${fb} hat keinen Anschluss ${pin}`, pos, names ? `Anschlüsse: ${names}` : undefined);
    }
    if (d.kind !== 'VAR_INPUT' && d.kind !== 'VAR_OUTPUT') {
      throw new CompileError(`${pin} ist eine interne Variable von ${fb} und von außen nicht erreichbar`, pos, 'Mach daraus einen VAR_OUTPUT, wenn du den Wert außen brauchst.');
    }
    if (mode === 'write' && d.kind !== 'VAR_INPUT') throw new CompileError(`${pin} ist ein Ausgang von ${fb} und kann nicht beschrieben werden`, pos);
    if (!(ELEM_TYPES as string[]).includes(d.typeName)) throw new CompileError(`${pin} ist kein einfacher Wert`, pos);
    return d.typeName as ElemType;
  }

  bin(e: Extract<Expr, { k: 'bin' }>): TypeT {
    const l = this.expr(e.left);
    const r = this.expr(e.right);
    const op = e.op;
    if (op === 'AND' || op === 'OR' || op === 'XOR') {
      if (l === 'BOOL' && r === 'BOOL') return 'BOOL';
      if ((l === 'WORD' || l === 'BYTE') && (r === l || r === 'INTLIT')) return l;
      const bad = l !== 'BOOL' ? e.left : e.right;
      const bt = l !== 'BOOL' ? l : r;
      throw new CompileError(
        `${op} verknüpft nur BOOL-Werte – hier steht ${show(bt)}`,
        bad.pos,
        bt === 'INTLIT' ? 'Statt 1 und 0 schreibt man TRUE und FALSE.' : 'Brauchst du vielleicht einen Vergleich, z. B. (Zaehler > 5)?',
      );
    }
    if (op === '=' || op === '<>' || op === '<' || op === '>' || op === '<=' || op === '>=') {
      if (l === 'BOOL' || r === 'BOOL') {
        if (l === 'BOOL' && r === 'BOOL' && (op === '=' || op === '<>')) return 'BOOL';
        throw new CompileError(`BOOL kann man nicht mit ${op === '=' || op === '<>' ? show(l === 'BOOL' ? r : l) : op} vergleichen`, e.pos);
      }
      this.common(l, r, e.pos, op);
      return 'BOOL';
    }
    // Arithmetik
    if (op === 'MOD' && !(isIntT(l) && isIntT(r))) throw new CompileError('MOD geht nur mit ganzen Zahlen', e.pos);
    if (l === 'BOOL' || r === 'BOOL') throw new CompileError(`Mit BOOL kann man nicht rechnen (${op})`, e.pos, 'Für Logik nimmt man AND, OR, NOT.');
    if (l === 'TIME' || r === 'TIME') {
      if ((op === '+' || op === '-') && l === 'TIME' && r === 'TIME') return 'TIME';
      throw new CompileError(`Mit TIME geht hier nur + und - zwischen zwei Zeiten`, e.pos);
    }
    return this.common(l, r, e.pos, op);
  }

  /** gemeinsamer Zahlentyp zweier Operanden */
  common(l: TypeT, r: TypeT, pos: Pos, op: string): TypeT {
    if (l === r) return l;
    if (l === 'INTLIT' && (isIntT(r) || isRealT(r))) return r;
    if (r === 'INTLIT' && (isIntT(l) || isRealT(l))) return l;
    if (l === 'REALLIT' && isRealT(r)) return r;
    if (r === 'REALLIT' && isRealT(l)) return l;
    if (l === 'TIME' || r === 'TIME') {
      throw new CompileError(`${show(l)} und ${show(r)} passen bei ${op} nicht zusammen`, pos, 'Zeiten schreibt man als T#…, z. B. T#2s.');
    }
    const hint =
      (isIntT(l) && isRealT(r)) || (isRealT(l) && isIntT(r))
        ? 'PC WORX rechnet nicht automatisch um. Nutze z. B. INT_TO_REAL(…) oder REAL_TO_INT(…).'
        : `Wandle einen der Werte um, z. B. mit ${l}_TO_${r}(…).`;
    throw new CompileError(`${show(l)} und ${show(r)} passen bei ${op} nicht zusammen`, pos, hint);
  }

  assignable(target: ElemType, t: TypeT, pos: Pos, name: string) {
    if (target === t) return;
    if (t === 'INTLIT' && INT_TYPES.includes(target)) return;
    if (t === 'INTLIT' && REAL_TYPES.includes(target)) {
      this.diag('warning', `${name} ist REAL – schreibe Kommazahlen mit Punkt, z. B. 5.0 statt 5`, pos);
      return;
    }
    if (t === 'REALLIT' && REAL_TYPES.includes(target)) return;
    if (target === 'BOOL' && t === 'INTLIT') {
      throw new CompileError(`${name} ist BOOL – dafür schreibt man TRUE oder FALSE, nicht 1 oder 0`, pos);
    }
    if (target === 'TIME' && (t === 'INTLIT' || t === 'REALLIT')) {
      throw new CompileError(`${name} ist eine Zeit (TIME) – schreibe z. B. T#2s oder T#500ms`, pos);
    }
    let hint: string | undefined;
    if (t !== 'INTLIT' && t !== 'REALLIT' && t !== 'BOOL' && target !== 'BOOL') hint = `Umwandeln mit ${t}_TO_${target}(…)`;
    if (target === 'BOOL') hint = 'Brauchst du einen Vergleich? z. B.  Lampe := (Zaehler >= 5);';
    if (t === 'BOOL') hint = 'Ein BOOL-Wert (TRUE/FALSE) passt nicht in eine Zahl.';
    throw new CompileError(`Typen passen nicht: ${name} ist ${target}, der Wert ist aber ${show(t)}`, pos, hint);
  }

  stmts(list: Stmt[], ctx: { inCase: boolean; inLoop: boolean; depth: number }) {
    for (const s of list) {
      try {
        this.stmt(s, ctx);
      } catch (e) {
        if (e instanceof CompileError) this.diag('error', e.message, e.pos, e.hint);
        else throw e;
      }
    }
  }

  stmt(s: Stmt, ctx: { inCase: boolean; inLoop: boolean; depth: number }) {
    switch (s.k) {
      case 'assign': {
        const sym = this.lookup(s.target, s.targetUpper, s.pos);
        if (s.member) {
          if (!sym.fb) throw new CompileError(`${s.target} ist kein Baustein`, s.pos);
          const pt = this.pinType(sym.fb, s.memberUpper!, s.member, s.pos, 'write');
          this.assignable(pt, this.expr(s.expr), s.expr.pos, `${s.target}.${s.member}`);
          return;
        }
        if (sym.fb) {
          throw new CompileError(`${s.target} ist ein Baustein und kann nicht zugewiesen werden`, s.pos, `Aufruf so:  ${s.target}(…);`);
        }
        if (sym.decl.constant) throw new CompileError(`${s.target} ist eine Konstante und kann nicht verändert werden`, s.pos);
        if (sym.decl.kind === 'VAR_INPUT') {
          this.diag('warning', `${s.target} ist ein Eingang (VAR_INPUT) – den sollte man nicht beschreiben`, s.pos);
        }
        if (sym.scope === 'global') {
          const g = this.globals.get(s.targetUpper);
          if (g?.address?.startsWith('%I')) {
            this.diag('warning', `${s.target} ist ein Eingang (${g.address}) – er wird im nächsten Zyklus wieder überschrieben`, s.pos);
          }
        }
        this.assignable(sym.elem!, this.expr(s.expr), s.expr.pos, s.target);
        return;
      }
      case 'fbcall': {
        const sym = this.lookup(s.inst, s.instUpper, s.pos);
        if (!sym.fb) {
          const f = STD_FUNCS[s.instUpper];
          if (f) throw new CompileError(`${s.inst}(…) ist eine Funktion – ihr Ergebnis muss zugewiesen werden`, s.pos, `z. B.  Wert := ${s.inst}(…);`);
          throw new CompileError(`${s.inst} ist kein Baustein und kann nicht aufgerufen werden`, s.pos);
        }
        this.calls.set(s.instUpper, (this.calls.get(s.instUpper) ?? 0) + 1);
        const seen = new Set<string>();
        for (const a of s.args) {
          if (seen.has(a.upper)) throw new CompileError(`${a.name} ist doppelt angegeben`, a.pos);
          seen.add(a.upper);
          if (a.dir === 'in') {
            const pt = this.pinType(sym.fb, a.upper, a.name, a.pos, 'write');
            this.assignable(pt, this.expr(a.expr!), a.expr!.pos, `${s.inst}.${a.name}`);
          } else {
            const pt = this.pinType(sym.fb, a.upper, a.name, a.pos, 'read');
            const tgt = this.lookup(a.target!, a.target!, a.pos);
            if (!tgt.elem) throw new CompileError(`${a.target} ist kein einfacher Wert`, a.pos);
            this.assignable(tgt.elem, pt, a.pos, a.target!);
          }
        }
        if (ctx.inCase && ['TON', 'TOF', 'TP', 'R_TRIG', 'F_TRIG'].includes(sym.fb)) {
          this.diag(
            'warning',
            `${s.inst} wird innerhalb eines CASE-Schritts aufgerufen`,
            s.pos,
            'Timer und Flanken am besten außerhalb von CASE/IF in jedem Zyklus aufrufen, z. B.  T1(IN := (Schritt = 20), PT := T#2s);  Sonst „friert“ der Baustein ein, wenn der Schritt verlassen wird.',
          );
        }
        return;
      }
      case 'if':
        for (const b of s.branches) {
          this.cond(b.cond, 'IF');
          this.stmts(b.body, { ...ctx, depth: ctx.depth + 1 });
        }
        if (s.elseBody) this.stmts(s.elseBody, { ...ctx, depth: ctx.depth + 1 });
        return;
      case 'case': {
        const t = this.expr(s.sel);
        if (!isIntT(t)) throw new CompileError(`CASE braucht eine ganze Zahl (z. B. INT), hier steht ${show(t)}`, s.sel.pos);
        const seen = new Set<number>();
        for (const c of s.cases) {
          for (const l of c.labels) {
            for (let v = l.from; v <= l.to && v - l.from < 1000; v++) {
              if (seen.has(v)) this.diag('error', `Schritt ${v} kommt im CASE doppelt vor`, c.pos);
              seen.add(v);
            }
          }
          this.stmts(c.body, { ...ctx, inCase: true, depth: ctx.depth + 1 });
        }
        if (s.elseBody) this.stmts(s.elseBody, { ...ctx, inCase: true, depth: ctx.depth + 1 });
        return;
      }
      case 'for': {
        const v = this.lookup(s.v, s.vUpper, s.pos);
        if (!v.elem || !isIntT(v.elem)) throw new CompileError('Die Zählvariable einer FOR-Schleife muss eine ganze Zahl sein', s.pos);
        this.assignable(v.elem, this.expr(s.from), s.from.pos, s.v);
        this.assignable(v.elem, this.expr(s.to), s.to.pos, s.v);
        if (s.by) this.assignable(v.elem, this.expr(s.by), s.by.pos, s.v);
        this.stmts(s.body, { ...ctx, inLoop: true, depth: ctx.depth + 1 });
        return;
      }
      case 'while':
      case 'repeat':
        this.cond(s.cond, s.k === 'while' ? 'WHILE' : 'UNTIL');
        this.stmts(s.body, { ...ctx, inLoop: true, depth: ctx.depth + 1 });
        return;
      case 'exit':
        if (!ctx.inLoop) throw new CompileError('EXIT ist nur in einer Schleife erlaubt', s.pos);
        return;
      case 'return':
      case 'empty':
        return;
    }
  }

  cond(e: Expr, kw: string) {
    const t = this.expr(e);
    if (t !== 'BOOL') {
      throw new CompileError(
        `Die Bedingung nach ${kw} muss TRUE oder FALSE ergeben, hier ist sie aber ${show(t)}`,
        e.pos,
        'Vergleiche z. B. so:  IF Zaehler >= 5 THEN',
      );
    }
  }

  /** Hinweise, die keine Fehler sind, aber typische Anfängerprobleme */
  lint(body: Stmt[]) {
    // Gleiche Variable mehrfach direkt (ohne IF) zugewiesen → letzte gewinnt
    const top = new Map<string, Pos[]>();
    for (const s of body) {
      if (s.k === 'assign' && !s.member) {
        const arr = top.get(s.targetUpper) ?? [];
        arr.push(s.pos);
        top.set(s.targetUpper, arr);
      }
    }
    for (const [name, list] of top) {
      if (list.length > 1) {
        const sym = this.syms.get(name);
        const p = list[list.length - 1]!;
        this.diag(
          'warning',
          `${sym?.decl.name ?? name} wird ${list.length}-mal zugewiesen (Zeilen ${list.map((x) => x.line).join(', ')}) – nur die letzte Zuweisung zählt`,
          p,
          'Fasse die Bedingungen mit OR in einer Zuweisung zusammen.',
        );
      }
    }
    for (const [u, s] of this.syms) {
      if (s.fb && !this.calls.has(u)) {
        this.diag('warning', `Der Baustein ${s.decl.name} wird nie aufgerufen`, s.decl.pos, `Ohne Aufruf  ${s.decl.name}(…);  arbeitet er nicht.`, 'vars');
      }
      if ((this.calls.get(u) ?? 0) > 1 && s.fb && STD_FBS[s.fb]) {
        this.diag('warning', `${s.decl.name} wird mehrmals aufgerufen`, s.decl.pos, 'Jede Instanz (z. B. jeder Timer) sollte nur an einer Stelle aufgerufen werden. Lege für jede Aufgabe eine eigene Instanz an.', 'vars');
      }
    }
  }
}

export function parseGlobals(text: string): { decls: VarDecl[]; error?: CompileError } {
  try {
    return { decls: parseVars(text) };
  } catch (e) {
    if (e instanceof CompileError) return { decls: [], error: e };
    throw e;
  }
}

export function compileProject(sources: PouSource[], globalsText: string, mainName = 'Main'): CompileResult {
  const diagnostics: Diagnostic[] = [];
  const g = parseGlobals(globalsText);
  if (g.error) {
    diagnostics.push({ severity: 'error', message: 'Globale Variablen: ' + g.error.message, line: g.error.pos.line, col: g.error.pos.col, pou: 'Globale Variablen', part: 'vars' });
  }
  const globalSyms = new Map<string, VarDecl>();
  for (const d of g.decls) globalSyms.set(d.upper, d);

  // 1. Alle Bausteine parsen
  const parsed: { src: PouSource; decls: VarDecl[]; body: Stmt[] }[] = [];
  for (const src of sources) {
    let decls: VarDecl[] = [];
    let body: Stmt[] = [];
    try {
      decls = parseVars(src.vars);
    } catch (e) {
      if (!(e instanceof CompileError)) throw e;
      diagnostics.push({ severity: 'error', message: e.message, hint: e.hint, line: e.pos.line, col: e.pos.col, pou: src.name, part: 'vars' });
    }
    try {
      body = parseCode(src.code);
    } catch (e) {
      if (!(e instanceof CompileError)) throw e;
      diagnostics.push({ severity: 'error', message: e.message, hint: e.hint, line: e.pos.line, col: e.pos.col, pou: src.name, part: 'code' });
    }
    parsed.push({ src, decls, body });
  }
  const fbTypes = new Map<string, { decls: VarDecl[] }>();
  for (const p of parsed) {
    if (p.src.kind === 'FUNCTION_BLOCK') fbTypes.set(p.src.name.toUpperCase(), { decls: p.decls });
  }

  // 2. Prüfen
  const pous = new Map<string, CompiledPou>();
  for (const p of parsed) {
    const ch = new PouChecker(p.src, p.decls, globalSyms, fbTypes);
    ch.buildSymbols();
    ch.stmts(p.body, { inCase: false, inLoop: false, depth: 0 });
    if (!ch.diags.some((d) => d.severity === 'error')) ch.lint(p.body);
    diagnostics.push(...ch.diags);
    pous.set(p.src.name.toUpperCase(), {
      name: p.src.name,
      upper: p.src.name.toUpperCase(),
      kind: p.src.kind,
      decls: p.decls,
      syms: ch.syms,
      body: p.body,
    });
  }

  // 3. Rekursion zwischen Bausteinen verhindern
  const visiting = new Set<string>();
  const cyc = (name: string): boolean => {
    if (visiting.has(name)) return true;
    visiting.add(name);
    const pou = pous.get(name);
    for (const s of pou?.syms.values() ?? []) {
      if (s.fb && pous.has(s.fb) && cyc(s.fb)) return true;
    }
    visiting.delete(name);
    return false;
  };
  for (const name of pous.keys()) {
    if (cyc(name)) {
      diagnostics.push({ severity: 'error', message: `Der Baustein ${pous.get(name)!.name} enthält sich (über Umwege) selbst`, line: 1, col: 1, pou: pous.get(name)!.name, part: 'vars' });
      break;
    }
  }

  const main = pous.get(mainName.toUpperCase());
  if (!main) {
    diagnostics.push({ severity: 'error', message: `Das Programm ${mainName} fehlt`, line: 1, col: 1 });
  }
  const ok = !diagnostics.some((d) => d.severity === 'error');
  return {
    ok,
    diagnostics,
    project: ok && main ? { pous, main, globals: g.decls, globalSyms } : undefined,
  };
}
