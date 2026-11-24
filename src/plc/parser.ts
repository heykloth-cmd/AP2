import type { CallArg, CaseLabel, Expr, Stmt, VarDecl, VarKind } from './ast';
import { CompileError, type Pos } from './errors';
import { KEYWORDS, lex, type Token } from './lexer';

const END_OF: Record<string, string> = {
  END_IF: 'IF',
  END_CASE: 'CASE',
  END_FOR: 'FOR',
  END_WHILE: 'WHILE',
  END_REPEAT: 'REPEAT',
  END_VAR: 'VAR',
};

class Parser {
  i = 0;
  constructor(public t: Token[]) {}

  get cur(): Token {
    return this.t[this.i]!;
  }
  peek(n = 1): Token {
    return this.t[Math.min(this.i + n, this.t.length - 1)]!;
  }
  prev(): Token {
    return this.t[Math.max(0, this.i - 1)]!;
  }
  pos(tok: Token = this.cur): Pos {
    return { line: tok.line, col: tok.col };
  }
  isOp(op: string, tok: Token = this.cur) {
    return tok.kind === 'op' && tok.text === op;
  }
  isKw(kw: string, tok: Token = this.cur) {
    return tok.kind === 'ident' && tok.upper === kw;
  }
  next(): Token {
    const tok = this.cur;
    if (tok.kind !== 'eof') this.i++;
    return tok;
  }
  fail(msg: string, tok: Token = this.cur, hint?: string): never {
    throw new CompileError(msg, this.pos(tok), hint);
  }
  describe(tok: Token): string {
    if (tok.kind === 'eof') return 'das Ende des Codes';
    return `"${tok.text}"`;
  }

  /** Semikolon am Ende einer Anweisung */
  semicolon(what: string) {
    if (this.isOp(';')) {
      this.next();
      return;
    }
    const p = this.prev();
    throw new CompileError(
      `Hier fehlt ein Semikolon ";" nach ${what}`,
      { line: p.endLine, col: p.endCol },
      'Jede Anweisung in ST endet mit einem Semikolon ;',
    );
  }

  expectOp(op: string, hint?: string) {
    if (this.isOp(op)) return this.next();
    this.fail(`Erwartet wird "${op}", gefunden wurde ${this.describe(this.cur)}`, this.cur, hint);
  }

  expectKw(kw: string, hint?: string) {
    if (this.isKw(kw)) return this.next();
    this.fail(`Erwartet wird ${kw}, gefunden wurde ${this.describe(this.cur)}`, this.cur, hint);
  }

  ident(what: string): Token {
    const tok = this.cur;
    if (tok.kind !== 'ident') this.fail(`Erwartet wird ${what}, gefunden wurde ${this.describe(tok)}`);
    if (KEYWORDS.has(tok.upper)) {
      this.fail(`"${tok.text}" ist ein reserviertes Wort und kann nicht als ${what} verwendet werden`);
    }
    return this.next();
  }

  // ---------- Variablendeklaration ----------
  varBlocks(): VarDecl[] {
    const out: VarDecl[] = [];
    while (this.cur.kind !== 'eof') {
      const tok = this.cur;
      if (!(tok.kind === 'ident' && tok.upper.startsWith('VAR') && tok.upper !== 'VAR_')) {
        this.fail(
          `Erwartet wird VAR, VAR_INPUT, VAR_OUTPUT oder VAR_EXTERNAL, gefunden wurde ${this.describe(tok)}`,
          tok,
          'Variablen stehen immer in einem Block: VAR … END_VAR',
        );
      }
      const kind = tok.upper as VarKind;
      if (!['VAR', 'VAR_INPUT', 'VAR_OUTPUT', 'VAR_IN_OUT', 'VAR_EXTERNAL', 'VAR_GLOBAL'].includes(kind)) {
        this.fail(`Unbekannter Variablenblock "${tok.text}"`);
      }
      this.next();
      let constant = false;
      while (this.isKw('CONSTANT') || this.isKw('RETAIN')) {
        if (this.cur.upper === 'CONSTANT') constant = true;
        this.next();
      }
      while (!this.isKw('END_VAR')) {
        if (this.peek(0).kind === 'eof') {
          this.fail(`Zu ${kind} (Zeile ${tok.line}) fehlt END_VAR`, tok);
        }
        if (this.cur.kind === 'ident' && this.cur.upper.startsWith('VAR')) {
          this.fail(`Vor dem neuen Block ${this.cur.text} fehlt END_VAR`, this.cur);
        }
        const names: Token[] = [this.ident('Variablenname')];
        while (this.isOp(',')) {
          this.next();
          names.push(this.ident('Variablenname'));
        }
        let address: string | undefined;
        if (this.isKw('AT')) {
          this.next();
          if (this.cur.kind !== 'address') this.fail('Nach AT muss eine Adresse folgen, z. B. %IX0.0');
          address = this.next().text.toUpperCase();
        }
        if (this.isOp(':=')) {
          this.fail('Vor dem Startwert fehlt der Datentyp', this.cur, 'Beispiel: Zaehler : INT := 0;');
        }
        this.expectOp(':', 'Nach dem Namen kommt ein Doppelpunkt und der Datentyp, z. B.  Lampe : BOOL;');
        const typeTok = this.cur;
        if (typeTok.kind !== 'ident') this.fail('Hier fehlt der Datentyp (z. B. BOOL, INT, TIME oder TON)');
        if (typeTok.upper === 'ARRAY' || typeTok.upper === 'STRING') {
          this.fail(`Der Datentyp ${typeTok.text} wird in diesem Trainer nicht unterstützt`);
        }
        this.next();
        let init: Expr | undefined;
        if (this.isOp(':=')) {
          this.next();
          init = this.expr();
        }
        this.semicolon(`der Deklaration von ${names[names.length - 1]!.text}`);
        for (const n of names) {
          out.push({
            name: n.text,
            upper: n.upper,
            typeName: typeTok.upper,
            kind,
            constant,
            address,
            init,
            pos: this.pos(n),
          });
        }
      }
      this.next(); // END_VAR
      if (this.isOp(';')) this.next();
    }
    return out;
  }

  // ---------- Anweisungen ----------
  stmtList(terminators: string[], opener?: { kw: string; tok: Token }): Stmt[] {
    const list: Stmt[] = [];
    for (;;) {
      const tok = this.cur;
      if (tok.kind === 'eof') {
        if (opener) {
          const end = opener.kw === 'IF' ? 'END_IF' : opener.kw === 'CASE' ? 'END_CASE' : `END_${opener.kw}`;
          this.fail(
            `Zu diesem ${opener.kw} (Zeile ${opener.tok.line}) fehlt ${end};`,
            opener.tok,
            `Jedes ${opener.kw} muss mit ${end}; abgeschlossen werden.`,
          );
        }
        return list;
      }
      if (tok.kind === 'ident' && terminators.includes(tok.upper)) return list;
      if (opener?.kw === 'CASE' && this.atCaseLabel()) return list;
      if (opener && opener.kw !== 'CASE' && this.atCaseLabel()) {
        const end = opener.kw === 'IF' ? 'END_IF' : `END_${opener.kw}`;
        this.fail(
          `Zu diesem ${opener.kw} (Zeile ${opener.tok.line}) fehlt ${end}; – hier beginnt schon der nächste Schritt`,
          opener.tok,
          `Schließe das ${opener.kw} mit ${end}; ab, bevor der nächste Schritt (${this.cur.text}:) kommt.`,
        );
      }
      list.push(this.stmt());
    }
  }

  atCaseLabel(): boolean {
    let j = this.i;
    if (this.t[j]?.kind === 'op' && this.t[j]!.text === '-') j++;
    const t = this.t[j];
    if (!t || t.kind !== 'int') return false;
    const n = this.t[j + 1];
    return !!n && n.kind === 'op' && (n.text === ':' || n.text === ',' || n.text === '..');
  }

  stmt(): Stmt {
    const tok = this.cur;
    const pos = this.pos(tok);
    if (this.isOp(';')) {
      this.next();
      return { k: 'empty', pos };
    }
    if (tok.kind === 'ident') {
      const u = tok.upper;
      if (u === 'IF') return this.ifStmt();
      if (u === 'CASE') return this.caseStmt();
      if (u === 'FOR') return this.forStmt();
      if (u === 'WHILE') return this.whileStmt();
      if (u === 'REPEAT') return this.repeatStmt();
      if (u === 'EXIT') {
        this.next();
        this.semicolon('EXIT');
        return { k: 'exit', pos };
      }
      if (u === 'RETURN') {
        this.next();
        this.semicolon('RETURN');
        return { k: 'return', pos };
      }
      if (END_OF[u]) {
        this.fail(`${tok.text} ohne passendes ${END_OF[u]}`, tok, `Prüfe, ob ${END_OF[u]} weiter oben richtig geschrieben ist.`);
      }
      if (u === 'ELSE' || u === 'ELSIF' || u === 'THEN') {
        this.fail(`${tok.text} steht hier an der falschen Stelle`, tok, 'Vielleicht fehlt weiter oben ein IF … THEN, oder es steht ein END_IF zu früh.');
      }
      if (u.startsWith('VAR')) {
        this.fail(
          'Variablen werden nicht im Code deklariert',
          tok,
          'In PC WORX stehen Variablen im Variablen-Arbeitsblatt. Hier im Trainer: Reiter „Variablen“.',
        );
      }
      if (KEYWORDS.has(u)) this.fail(`"${tok.text}" kann hier nicht stehen`, tok);
      this.next();
      // Zuweisung an Variable
      if (this.isOp(':=')) {
        this.next();
        const expr = this.expr();
        this.semicolon('der Zuweisung');
        return { k: 'assign', target: tok.text, targetUpper: tok.upper, expr, pos };
      }
      // Bausteinaufruf
      if (this.isOp('(')) {
        return this.fbCall(tok);
      }
      // Zuweisung an Bausteineingang: T1.PT := T#2s;
      if (this.isOp('.')) {
        this.next();
        const m = this.ident('Name des Ein-/Ausgangs');
        if (!this.isOp(':=')) {
          this.fail(
            `Nach ${tok.text}.${m.text} wird := erwartet`,
            this.cur,
            `Ein Ausgang wie ${tok.text}.${m.text} wird abgefragt, z. B.  Lampe := ${tok.text}.${m.text};`,
          );
        }
        this.next();
        const expr = this.expr();
        this.semicolon('der Zuweisung');
        return { k: 'assign', target: tok.text, targetUpper: tok.upper, member: m.text, memberUpper: m.upper, expr, pos };
      }
      if (this.isOp('=')) {
        this.fail(
          'Für eine Zuweisung schreibt man := (Doppelpunkt und Gleich)',
          this.cur,
          `Richtig:  ${tok.text} := …;   Das einfache = ist in ST ein Vergleich.`,
        );
      }
      if (this.isOp(':') && this.isOp('=', this.peek())) {
        this.fail('Zwischen : und = darf kein Leerzeichen stehen', this.cur, 'Schreibe := zusammen.');
      }
      if (this.cur.kind === 'ident' && this.cur.upper === 'THEN') {
        this.fail('THEN ohne IF', this.cur);
      }
      const p = this.prev();
      throw new CompileError(
        `Nach "${tok.text}" wird := erwartet`,
        { line: p.endLine, col: p.endCol },
        `Eine Anweisung ist z. B. eine Zuweisung  ${tok.text} := TRUE;  oder ein Bausteinaufruf  ${tok.text}(…);`,
      );
    }
    if (tok.kind === 'int' || tok.kind === 'real') {
      this.fail(`Eine Anweisung kann nicht mit der Zahl ${tok.text} beginnen`, tok, 'Steht diese Zahl außerhalb eines CASE? Oder fehlt ein Semikolon in der Zeile davor?');
    }
    this.fail(`Unerwartetes ${this.describe(tok)}`, tok);
  }

  fbCall(nameTok: Token): Stmt {
    const pos = this.pos(nameTok);
    this.expectOp('(');
    const args: CallArg[] = [];
    if (!this.isOp(')')) {
      for (;;) {
        const pn = this.cur;
        if (pn.kind !== 'ident' || !(this.isOp(':=', this.peek()) || this.isOp('=>', this.peek()))) {
          this.fail(
            'Beim Bausteinaufruf werden die Eingänge mit Namen angegeben',
            pn,
            `Beispiel:  ${nameTok.text}(IN := Taster, PT := T#2s);`,
          );
        }
        this.next();
        const dirTok = this.next();
        if (dirTok.text === ':=') {
          args.push({ name: pn.text, upper: pn.upper, dir: 'in', expr: this.expr(), pos: this.pos(pn) });
        } else {
          const tgt = this.ident('Zielvariable');
          args.push({ name: pn.text, upper: pn.upper, dir: 'out', target: tgt.upper, pos: this.pos(pn) });
        }
        if (this.isOp(',')) {
          this.next();
          continue;
        }
        if (this.isOp(')')) break;
        if (this.cur.kind === 'ident' && this.isOp(':=', this.peek())) {
          this.fail('Hier fehlt ein Komma zwischen den Eingängen', this.cur);
        }
        this.fail(`Erwartet wird "," oder ")", gefunden wurde ${this.describe(this.cur)}`);
      }
    }
    this.expectOp(')');
    this.semicolon(`dem Aufruf von ${nameTok.text}`);
    return { k: 'fbcall', inst: nameTok.text, instUpper: nameTok.upper, args, pos };
  }

  ifStmt(): Stmt {
    const ifTok = this.next();
    const branches: { cond: Expr; body: Stmt[] }[] = [];
    const cond = this.expr();
    this.thenKw('IF');
    branches.push({ cond, body: this.stmtList(['ELSIF', 'ELSE', 'END_IF'], { kw: 'IF', tok: ifTok }) });
    let elseBody: Stmt[] | undefined;
    for (;;) {
      if (this.isKw('ELSIF')) {
        this.next();
        const c = this.expr();
        this.thenKw('ELSIF');
        branches.push({ cond: c, body: this.stmtList(['ELSIF', 'ELSE', 'END_IF'], { kw: 'IF', tok: ifTok }) });
        continue;
      }
      if (this.isKw('ELSE')) {
        this.next();
        if (this.isKw('IF')) {
          this.fail('In ST schreibt man ELSIF (zusammen, ohne E)', this.cur, 'Statt „ELSE IF“ schreibt man „ELSIF“.');
        }
        elseBody = this.stmtList(['END_IF'], { kw: 'IF', tok: ifTok });
        if (this.isKw('ELSE') || this.isKw('ELSIF')) this.fail('Nach ELSE darf kein weiteres ELSE/ELSIF kommen');
      }
      break;
    }
    if (this.isKw('ELSEIF')) this.fail('In ST schreibt man ELSIF (ohne E in der Mitte)');
    this.expectKw('END_IF');
    this.semicolon('END_IF');
    return { k: 'if', branches, elseBody, pos: this.pos(ifTok) };
  }

  thenKw(after: string) {
    if (this.isKw('THEN')) {
      this.next();
      return;
    }
    if (this.isOp(':=')) {
      this.fail(`In der Bedingung nach ${after} vergleicht man mit = (nicht :=)`, this.cur);
    }
    const p = this.prev();
    throw new CompileError(
      `Nach der Bedingung von ${after} fehlt THEN`,
      { line: p.endLine, col: p.endCol },
      `Aufbau:  ${after} Bedingung THEN … END_IF;`,
    );
  }

  caseStmt(): Stmt {
    const caseTok = this.next();
    const sel = this.expr();
    this.expectKw('OF', 'Aufbau:  CASE Schritt OF  1: …  2: …  END_CASE;');
    const cases: { labels: CaseLabel[]; body: Stmt[]; pos: Pos }[] = [];
    let elseBody: Stmt[] | undefined;
    for (;;) {
      if (this.isKw('END_CASE')) break;
      if (this.isKw('ELSE')) {
        this.next();
        elseBody = this.stmtList(['END_CASE'], { kw: 'CASE', tok: caseTok });
        break;
      }
      if (this.cur.kind === 'eof') {
        this.fail(`Zu diesem CASE (Zeile ${caseTok.line}) fehlt END_CASE;`, caseTok);
      }
      if (!this.atCaseLabel()) {
        this.fail(
          `Im CASE wird hier eine Schrittnummer mit Doppelpunkt erwartet, gefunden wurde ${this.describe(this.cur)}`,
          this.cur,
          'Aufbau:  10: Anweisungen;   20: Anweisungen;',
        );
      }
      const lpos = this.pos();
      const labels: CaseLabel[] = [];
      for (;;) {
        const a = this.caseNum();
        let b = a;
        if (this.isOp('..')) {
          this.next();
          b = this.caseNum();
        }
        labels.push({ from: a, to: b });
        if (this.isOp(',')) {
          this.next();
          continue;
        }
        break;
      }
      this.expectOp(':', 'Nach der Schrittnummer kommt ein Doppelpunkt, z. B.  10:');
      const body = this.stmtList(['ELSE', 'END_CASE'], { kw: 'CASE', tok: caseTok });
      cases.push({ labels, body, pos: lpos });
    }
    this.expectKw('END_CASE');
    this.semicolon('END_CASE');
    return { k: 'case', sel, cases, elseBody, pos: this.pos(caseTok) };
  }

  caseNum(): number {
    let neg = false;
    if (this.isOp('-')) {
      neg = true;
      this.next();
    }
    if (this.cur.kind !== 'int') this.fail('Hier wird eine ganze Zahl erwartet');
    const v = this.next().value as number;
    return neg ? -v : v;
  }

  forStmt(): Stmt {
    const t = this.next();
    const v = this.ident('Zählvariable');
    this.expectOp(':=');
    const from = this.expr();
    this.expectKw('TO');
    const to = this.expr();
    let by: Expr | undefined;
    if (this.isKw('BY')) {
      this.next();
      by = this.expr();
    }
    this.expectKw('DO');
    const body = this.stmtList(['END_FOR'], { kw: 'FOR', tok: t });
    this.expectKw('END_FOR');
    this.semicolon('END_FOR');
    return { k: 'for', v: v.text, vUpper: v.upper, from, to, by, body, pos: this.pos(t) };
  }

  whileStmt(): Stmt {
    const t = this.next();
    const cond = this.expr();
    this.expectKw('DO');
    const body = this.stmtList(['END_WHILE'], { kw: 'WHILE', tok: t });
    this.expectKw('END_WHILE');
    this.semicolon('END_WHILE');
    return { k: 'while', cond, body, pos: this.pos(t) };
  }

  repeatStmt(): Stmt {
    const t = this.next();
    const body = this.stmtList(['UNTIL'], { kw: 'REPEAT', tok: t });
    this.expectKw('UNTIL');
    const cond = this.expr();
    this.expectKw('END_REPEAT');
    this.semicolon('END_REPEAT');
    return { k: 'repeat', cond, body, pos: this.pos(t) };
  }

  // ---------- Ausdrücke ----------
  expr(): Expr {
    return this.orExpr();
  }
  orExpr(): Expr {
    let l = this.xorExpr();
    while (this.isKw('OR')) {
      const p = this.pos();
      this.next();
      l = { k: 'bin', op: 'OR', left: l, right: this.xorExpr(), pos: p };
    }
    return l;
  }
  xorExpr(): Expr {
    let l = this.andExpr();
    while (this.isKw('XOR')) {
      const p = this.pos();
      this.next();
      l = { k: 'bin', op: 'XOR', left: l, right: this.andExpr(), pos: p };
    }
    return l;
  }
  andExpr(): Expr {
    let l = this.eqExpr();
    while (this.isKw('AND') || this.isOp('&')) {
      const p = this.pos();
      this.next();
      l = { k: 'bin', op: 'AND', left: l, right: this.eqExpr(), pos: p };
    }
    return l;
  }
  eqExpr(): Expr {
    let l = this.relExpr();
    while (this.isOp('=') || this.isOp('<>')) {
      const p = this.pos();
      const op = this.next().text;
      l = { k: 'bin', op, left: l, right: this.relExpr(), pos: p };
    }
    if (this.isOp(':=')) {
      // z. B. IF a := 1 THEN
      this.fail('In einem Vergleich schreibt man = (nicht :=)', this.cur);
    }
    return l;
  }
  relExpr(): Expr {
    let l = this.addExpr();
    while (this.isOp('<') || this.isOp('>') || this.isOp('<=') || this.isOp('>=')) {
      const p = this.pos();
      const op = this.next().text;
      l = { k: 'bin', op, left: l, right: this.addExpr(), pos: p };
    }
    if (this.isOp('=>') ) {
      this.fail('"=>" gibt es nur beim Bausteinaufruf. Für „größer gleich“ schreibt man >=', this.cur);
    }
    return l;
  }
  addExpr(): Expr {
    let l = this.mulExpr();
    while (this.isOp('+') || this.isOp('-')) {
      const p = this.pos();
      const op = this.next().text;
      l = { k: 'bin', op, left: l, right: this.mulExpr(), pos: p };
    }
    return l;
  }
  mulExpr(): Expr {
    let l = this.unary();
    while (this.isOp('*') || this.isOp('/') || this.isKw('MOD')) {
      const p = this.pos();
      const op = this.next().upper;
      l = { k: 'bin', op, left: l, right: this.unary(), pos: p };
    }
    return l;
  }
  unary(): Expr {
    const p = this.pos();
    if (this.isKw('NOT')) {
      this.next();
      return { k: 'unary', op: 'NOT', arg: this.unary(), pos: p };
    }
    if (this.isOp('-')) {
      this.next();
      const arg = this.unary();
      if (arg.k === 'lit' && typeof arg.value === 'number') return { ...arg, value: -arg.value, pos: p };
      return { k: 'unary', op: '-', arg, pos: p };
    }
    if (this.isOp('+')) {
      this.next();
      return this.unary();
    }
    if (this.isOp('!')) this.fail('Für „nicht“ schreibt man in ST: NOT');
    return this.primary();
  }
  primary(): Expr {
    const tok = this.cur;
    const p = this.pos();
    switch (tok.kind) {
      case 'int':
        this.next();
        return { k: 'lit', type: 'INTLIT', value: tok.value as number, pos: p };
      case 'real':
        this.next();
        return { k: 'lit', type: 'REALLIT', value: tok.value as number, pos: p };
      case 'time':
        this.next();
        return { k: 'lit', type: 'TIME', value: tok.value as number, pos: p };
      case 'bool':
        this.next();
        return { k: 'lit', type: 'BOOL', value: tok.value as boolean, pos: p };
      case 'address':
        this.fail(
          'Direkte Adressen wie ' + tok.text + ' bitte nicht im Code verwenden',
          tok,
          'Gib dem Ein-/Ausgang in der Variablenliste einen Namen (AT ' + tok.text + ') und nutze diesen Namen.',
        );
        break;
      case 'op':
        if (tok.text === '(') {
          this.next();
          const e = this.expr();
          if (!this.isOp(')')) this.fail(`Hier fehlt eine schließende Klammer ")"`, this.cur);
          this.next();
          return e;
        }
        if (tok.text === ';') this.fail('Hier fehlt noch ein Wert oder eine Variable vor dem ;');
        this.fail(`Unerwartetes Zeichen ${this.describe(tok)} – hier wird ein Wert oder eine Variable erwartet`);
        break;
      case 'ident': {
        if (KEYWORDS.has(tok.upper) && !['TRUE', 'FALSE'].includes(tok.upper)) {
          if (tok.upper === 'THEN') this.fail('Vor THEN fehlt die Bedingung');
          this.fail(`"${tok.text}" kann hier nicht stehen – erwartet wird ein Wert oder eine Variable`);
        }
        this.next();
        if (this.isOp('(')) {
          // Funktionsaufruf
          this.next();
          const args: Expr[] = [];
          if (!this.isOp(')')) {
            for (;;) {
              if (this.cur.kind === 'ident' && (this.isOp(':=', this.peek()) || this.isOp('=>', this.peek()))) {
                this.fail(
                  `${tok.text}(…) mit benannten Eingängen ist ein Bausteinaufruf – der muss als eigene Anweisung stehen`,
                  tok,
                  `Erst aufrufen:  ${tok.text}(…);  danach den Ausgang abfragen, z. B.  ${tok.text}.Q`,
                );
              }
              args.push(this.expr());
              if (this.isOp(',')) {
                this.next();
                continue;
              }
              break;
            }
          }
          this.expectOp(')');
          return { k: 'call', name: tok.text, upper: tok.upper, args, pos: p };
        }
        if (this.isOp('.')) {
          this.next();
          const m = this.cur;
          if (m.kind !== 'ident') {
            if (m.kind === 'int') {
              this.fail('Bit-Zugriffe wie Variable.0 werden hier nicht unterstützt', m);
            }
            this.fail('Nach dem Punkt wird der Name eines Ausgangs erwartet (z. B. .Q)', m);
          }
          this.next();
          return { k: 'member', obj: tok.text, objUpper: tok.upper, member: m.text, memberUpper: m.upper, pos: p };
        }
        return { k: 'var', name: tok.text, upper: tok.upper, pos: p };
      }
      case 'eof':
        this.fail('Der Code endet mitten in einem Ausdruck');
    }
    this.fail(`Unerwartetes ${this.describe(tok)}`);
  }
}

export function parseVars(src: string): VarDecl[] {
  const p = new Parser(lex(src));
  return p.varBlocks();
}

export function parseCode(src: string): Stmt[] {
  const p = new Parser(lex(src));
  const list = p.stmtList([]);
  return list;
}
