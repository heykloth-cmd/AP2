import type { ReactNode } from 'react';

const KW = new Set([
  'IF', 'THEN', 'ELSIF', 'ELSE', 'END_IF', 'CASE', 'OF', 'END_CASE', 'FOR', 'TO', 'BY', 'DO', 'END_FOR',
  'WHILE', 'END_WHILE', 'REPEAT', 'UNTIL', 'END_REPEAT', 'EXIT', 'RETURN',
  'VAR', 'VAR_INPUT', 'VAR_OUTPUT', 'VAR_IN_OUT', 'VAR_EXTERNAL', 'VAR_GLOBAL', 'END_VAR', 'CONSTANT', 'RETAIN', 'AT',
  'PROGRAM', 'END_PROGRAM', 'FUNCTION_BLOCK', 'END_FUNCTION_BLOCK',
]);
const OPS = new Set(['AND', 'OR', 'XOR', 'NOT', 'MOD']);
const TYPES = new Set(['BOOL', 'INT', 'DINT', 'UINT', 'WORD', 'BYTE', 'REAL', 'LREAL', 'TIME']);
const FBS = new Set(['TON', 'TOF', 'TP', 'R_TRIG', 'F_TRIG', 'CTU', 'CTD', 'CTUD', 'SR', 'RS']);

/** Zerlegt ST-Code in farbige Abschnitte (tolerant, auch bei unfertigem Code) */
export function highlight(src: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\(\*[\s\S]*?(?:\*\)|$))|((?:T|TIME|t|time)#[0-9A-Za-z_.]+)|(%[IQM][XBWD]?[\d.]+)|([A-Za-z_][A-Za-z0-9_]*)|(\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)|(:=|=>|<=|>=|<>)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(src.slice(last, m.index));
    const t = m[0];
    let cls = '';
    if (m[1]) cls = 'tk-com';
    else if (m[2]) cls = 'tk-num';
    else if (m[3]) cls = 'tk-addr';
    else if (m[4]) {
      const u = t.toUpperCase();
      if (KW.has(u)) cls = 'tk-kw';
      else if (OPS.has(u)) cls = 'tk-op';
      else if (u === 'TRUE' || u === 'FALSE') cls = 'tk-bool';
      else if (TYPES.has(u)) cls = 'tk-type';
      else if (FBS.has(u)) cls = 'tk-fb';
    } else if (m[5]) cls = 'tk-num';
    else if (m[6]) cls = 'tk-assign';
    out.push(cls ? <span key={k++} className={cls}>{t}</span> : t);
    last = m.index + t.length;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}
