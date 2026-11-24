import type { Pos } from './errors';

export type ElemType = 'BOOL' | 'INT' | 'DINT' | 'UINT' | 'WORD' | 'BYTE' | 'REAL' | 'LREAL' | 'TIME';

export const ELEM_TYPES: ElemType[] = ['BOOL', 'INT', 'DINT', 'UINT', 'WORD', 'BYTE', 'REAL', 'LREAL', 'TIME'];

export type VarKind = 'VAR' | 'VAR_INPUT' | 'VAR_OUTPUT' | 'VAR_IN_OUT' | 'VAR_EXTERNAL' | 'VAR_GLOBAL';

export interface VarDecl {
  name: string;
  upper: string;
  /** Elementarer Datentyp oder Name eines Funktionsbausteins (z. B. TON) */
  typeName: string;
  kind: VarKind;
  constant: boolean;
  address?: string;
  init?: Expr;
  pos: Pos;
}

export type Expr =
  | { k: 'lit'; type: 'BOOL' | 'INTLIT' | 'REALLIT' | 'TIME'; value: number | boolean; pos: Pos }
  | { k: 'var'; name: string; upper: string; pos: Pos }
  | { k: 'member'; obj: string; objUpper: string; member: string; memberUpper: string; pos: Pos }
  | { k: 'unary'; op: 'NOT' | '-'; arg: Expr; pos: Pos }
  | { k: 'bin'; op: string; left: Expr; right: Expr; pos: Pos }
  | { k: 'call'; name: string; upper: string; args: Expr[]; pos: Pos };

export interface CallArg {
  name: string;
  upper: string;
  /** := Eingang, => Ausgang */
  dir: 'in' | 'out';
  expr?: Expr;
  target?: string;
  pos: Pos;
}

export type CaseLabel = { from: number; to: number };

export type Stmt =
  | { k: 'assign'; target: string; targetUpper: string; member?: string; memberUpper?: string; expr: Expr; pos: Pos }
  | { k: 'fbcall'; inst: string; instUpper: string; args: CallArg[]; pos: Pos }
  | { k: 'if'; branches: { cond: Expr; body: Stmt[] }[]; elseBody?: Stmt[]; pos: Pos }
  | { k: 'case'; sel: Expr; cases: { labels: CaseLabel[]; body: Stmt[]; pos: Pos }[]; elseBody?: Stmt[]; pos: Pos }
  | { k: 'for'; v: string; vUpper: string; from: Expr; to: Expr; by?: Expr; body: Stmt[]; pos: Pos }
  | { k: 'while'; cond: Expr; body: Stmt[]; pos: Pos }
  | { k: 'repeat'; cond: Expr; body: Stmt[]; pos: Pos }
  | { k: 'exit'; pos: Pos }
  | { k: 'return'; pos: Pos }
  | { k: 'empty'; pos: Pos };
