/** Fehler- und Hinweismeldungen des ST-Compilers (alle Texte auf Deutsch). */

export interface Pos {
  line: number;
  col: number;
}

export type Severity = 'error' | 'warning';

export interface Diagnostic {
  severity: Severity;
  message: string;
  /** Zusätzliche Erklärung für Anfänger */
  hint?: string;
  line: number;
  col: number;
  /** In welchem Baustein (POE) bzw. welchem Teil (Code/Variablen) */
  pou?: string;
  part?: 'code' | 'vars';
}

export class CompileError extends Error {
  constructor(
    message: string,
    public pos: Pos,
    public hint?: string,
  ) {
    super(message);
  }
}

export class RuntimeError extends Error {
  constructor(
    message: string,
    public pos?: Pos,
    public hint?: string,
  ) {
    super(message);
  }
}

/** Levenshtein-Abstand für "Meintest du …?"-Vorschläge */
export function editDistance(a: string, b: string): number {
  a = a.toUpperCase();
  b = b.toUpperCase();
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length]!;
}

export function suggest(name: string, candidates: Iterable<string>): string | undefined {
  let best: string | undefined;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = editDistance(name, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  const limit = name.length <= 3 ? 1 : 2;
  return bestD <= limit ? best : undefined;
}
