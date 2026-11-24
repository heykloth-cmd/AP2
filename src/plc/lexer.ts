import { CompileError } from './errors';

export type TokKind =
  | 'ident'
  | 'int'
  | 'real'
  | 'time'
  | 'bool'
  | 'address'
  | 'op'
  | 'eof';

export interface Token {
  kind: TokKind;
  /** Originaltext */
  text: string;
  /** Großgeschriebener Text (ST unterscheidet nicht zwischen Groß/Klein) */
  upper: string;
  value?: number | boolean;
  line: number;
  col: number;
  /** Zeile, in der das Token endet (für "fehlendes Semikolon") */
  endLine: number;
  endCol: number;
}

export const KEYWORDS = new Set([
  'IF', 'THEN', 'ELSIF', 'ELSE', 'END_IF',
  'CASE', 'OF', 'END_CASE',
  'FOR', 'TO', 'BY', 'DO', 'END_FOR',
  'WHILE', 'END_WHILE', 'REPEAT', 'UNTIL', 'END_REPEAT',
  'EXIT', 'RETURN',
  'AND', 'OR', 'XOR', 'NOT', 'MOD',
  'VAR', 'VAR_INPUT', 'VAR_OUTPUT', 'VAR_IN_OUT', 'VAR_EXTERNAL', 'VAR_GLOBAL', 'END_VAR',
  'CONSTANT', 'RETAIN', 'AT',
  'TRUE', 'FALSE',
]);

const OPS = [':=', '=>', '<=', '>=', '<>', '..', '**', '+', '-', '*', '/', '(', ')', ',', ';', ':', '.', '=', '<', '>', '&', '[', ']'];

/** Zeit-Literal wie T#1s500ms, T#0.5s, TIME#2m → Millisekunden */
function parseTime(body: string, line: number, col: number): number {
  const s = body.replace(/_/g, '').toLowerCase();
  if (s.length === 0) throw new CompileError('Leeres Zeit-Literal', { line, col }, 'Beispiel: T#500ms oder T#2s');
  const re = /(\d+(?:\.\d+)?)(ms|d|h|m|s)/gy;
  let total = 0;
  let idx = 0;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while (idx < s.length) {
    re.lastIndex = idx;
    m = re.exec(s);
    if (!m) {
      throw new CompileError(
        `Ungültiges Zeit-Literal "T#${body}"`,
        { line, col },
        'Erlaubt sind Einheiten d, h, m, s, ms – z. B. T#1s, T#500ms, T#1m30s.',
      );
    }
    const n = parseFloat(m[1]!);
    const unit = m[2]!;
    const f = unit === 'ms' ? 1 : unit === 's' ? 1000 : unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000;
    total += n * f;
    idx = re.lastIndex;
  }
  return Math.round(total);
}

export function lex(src: string): Token[] {
  const toks: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const adv = (n: number) => {
    for (let k = 0; k < n; k++) {
      if (src[i] === '\n') {
        line++;
        col = 1;
      } else col++;
      i++;
    }
  };

  const push = (kind: TokKind, text: string, sl: number, sc: number, value?: number | boolean) => {
    toks.push({ kind, text, upper: text.toUpperCase(), value, line: sl, col: sc, endLine: line, endCol: col });
  };

  while (i < src.length) {
    const c = src[i]!;
    // Leerraum
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === ' ') {
      adv(1);
      continue;
    }
    // Kommentar (* ... *)
    if (c === '(' && src[i + 1] === '*') {
      const sl = line;
      const sc = col;
      adv(2);
      while (i < src.length && !(src[i] === '*' && src[i + 1] === ')')) adv(1);
      if (i >= src.length) {
        throw new CompileError(
          'Kommentar wird nicht geschlossen',
          { line: sl, col: sc },
          'Ein Kommentar beginnt mit (* und muss mit *) enden.',
        );
      }
      adv(2);
      continue;
    }
    // // Kommentar gibt es in PC WORX 6 nicht
    if (c === '/' && src[i + 1] === '/') {
      throw new CompileError(
        'Kommentare mit // kennt PC WORX nicht',
        { line, col },
        'Schreibe Kommentare so: (* mein Kommentar *)',
      );
    }
    if (c === '{') {
      throw new CompileError('Geschweifte Klammern { } gibt es in ST nicht', { line, col }, 'Kommentare schreibt man (* so *).');
    }
    const sl = line;
    const sc = col;
    // Direkte Adresse %IX0.0, %QX4.1, %IW2 ...
    if (c === '%') {
      const m = /^%[IQM][XBWD]?\d+(\.\d+)*/i.exec(src.slice(i));
      if (!m) throw new CompileError('Ungültige Adresse', { line, col }, 'Beispiel: %IX0.0 (Eingang) oder %QX4.0 (Ausgang)');
      adv(m[0].length);
      push('address', m[0], sl, sc);
      continue;
    }
    // Bezeichner, Schlüsselwörter, Zeit-Literale, typisierte Literale
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j]!)) j++;
      const word = src.slice(i, j);
      const up = word.toUpperCase();
      if (src[j] === '#') {
        // T#..., TIME#..., INT#5, BOOL#1 ...
        if (up === 'T' || up === 'TIME') {
          let k = j + 1;
          if (src[k] === '-') {
            throw new CompileError('Negative Zeiten sind nicht erlaubt', { line, col });
          }
          while (k < src.length && /[0-9A-Za-z_.]/.test(src[k]!)) k++;
          const body = src.slice(j + 1, k);
          const ms = parseTime(body, sl, sc);
          adv(k - i);
          push('time', src.slice(i, k), sl, sc, ms);
          continue;
        }
        if (['INT', 'DINT', 'UINT', 'SINT', 'WORD', 'BYTE', 'DWORD'].includes(up)) {
          adv(j - i + 1);
          continue; // Typpräfix ignorieren, Zahl folgt
        }
        throw new CompileError(`Unbekanntes Literal "${word}#"`, { line, col });
      }
      adv(j - i);
      if (up === 'TRUE' || up === 'FALSE') push('bool', word, sl, sc, up === 'TRUE');
      else push('ident', word, sl, sc);
      continue;
    }
    // Zahlen: 12, 1_000, 3.14, 1.0E3, 16#FF, 2#1010
    if (/[0-9]/.test(c)) {
      const based = /^(2|8|16)#([0-9A-Fa-f_]+)/.exec(src.slice(i));
      if (based) {
        const v = parseInt(based[2]!.replace(/_/g, ''), parseInt(based[1]!, 10));
        adv(based[0].length);
        push('int', based[0], sl, sc, v);
        continue;
      }
      const m = /^\d[\d_]*(\.\d[\d_]*)?([eE][+-]?\d+)?/.exec(src.slice(i))!;
      let text = m[0];
      // "1..5" ist ein Bereich, keine Kommazahl
      if (m[1] && src[i + text.indexOf('.') + 1] === '.') {
        text = text.slice(0, text.indexOf('.'));
      }
      const isReal = text.includes('.') || /[eE]/.test(text);
      adv(text.length);
      if (src[i] === ',' && /[0-9]/.test(src[i + 1] ?? '') && !isReal) {
        // 0,5 statt 0.5 – typischer Fehler
        throw new CompileError(
          'Kommazahlen schreibt man in ST mit Punkt',
          { line: sl, col: sc },
          'Beispiel: 0.5 statt 0,5',
        );
      }
      const v = parseFloat(text.replace(/_/g, ''));
      push(isReal ? 'real' : 'int', text, sl, sc, v);
      continue;
    }
    if (c === "'" || c === '"') {
      throw new CompileError('Texte (STRING) werden in diesem Trainer nicht benötigt', { line, col });
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (op) {
      adv(op.length);
      push('op', op, sl, sc);
      continue;
    }
    throw new CompileError(`Unerwartetes Zeichen "${c}"`, { line, col });
  }
  toks.push({ kind: 'eof', text: '', upper: '', line, col, endLine: line, endCol: col });
  return toks;
}
