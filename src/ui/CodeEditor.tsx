import { useEffect, useMemo, useRef } from 'react';
import type { Diagnostic } from '../plc/errors';
import { highlight } from './highlight';

interface Props {
  value: string;
  onChange: (v: string) => void;
  diagnostics?: Diagnostic[];
  readOnly?: boolean;
  /** Schnelltasten für Handy anzeigen */
  keybar?: 'code' | 'vars' | false;
  minLines?: number;
  label: string;
  /** Zeile, die hervorgehoben werden soll (z. B. bei Klick auf Fehler) */
  focusLine?: { line: number; n: number };
}

const CODE_KEYS: { label: string; text: string; caret?: number }[] = [
  { label: ':=', text: ' := ' },
  { label: ';', text: ';' },
  { label: '( )', text: '()', caret: 1 },
  { label: 'AND', text: ' AND ' },
  { label: 'OR', text: ' OR ' },
  { label: 'NOT', text: 'NOT ' },
  { label: 'TRUE', text: 'TRUE' },
  { label: 'FALSE', text: 'FALSE' },
  { label: 'IF', text: 'IF  THEN\n  \nEND_IF;', caret: 3 },
  { label: 'ELSE', text: 'ELSE\n  ' },
  { label: 'CASE', text: 'CASE  OF\n  0: \nEND_CASE;', caret: 5 },
  { label: '=', text: ' = ' },
  { label: '<>', text: ' <> ' },
  { label: '>=', text: ' >= ' },
  { label: 'T#', text: 'T#' },
  { label: '⇥', text: '  ' },
];

const VAR_KEYS: { label: string; text: string; caret?: number }[] = [
  { label: 'VAR', text: 'VAR\n  \nEND_VAR', caret: 6 },
  { label: ': BOOL;', text: ' : BOOL;' },
  { label: ': INT;', text: ' : INT;' },
  { label: ': TIME;', text: ' : TIME;' },
  { label: ': TON;', text: ' : TON;' },
  { label: ': R_TRIG;', text: ' : R_TRIG;' },
  { label: ': F_TRIG;', text: ' : F_TRIG;' },
  { label: ': CTU;', text: ' : CTU;' },
  { label: ':=', text: ' := ' },
  { label: '⇥', text: '  ' },
];

function insertText(ta: HTMLTextAreaElement, text: string, caretBack?: number) {
  ta.focus();
  const ok = document.execCommand?.('insertText', false, text);
  if (!ok) {
    const s = ta.selectionStart;
    ta.setRangeText(text, s, ta.selectionEnd, 'end');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (caretBack !== undefined) {
    const pos = ta.selectionStart - text.length + caretBack;
    ta.setSelectionRange(pos, pos);
  }
}

export function CodeEditor({ value, onChange, diagnostics = [], readOnly, keybar = 'code', minLines = 8, label, focusLine }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const lines = value.split('\n');
  const lineCount = Math.max(lines.length, minLines);

  const marks = useMemo(() => {
    const m = new Map<number, 'error' | 'warning'>();
    for (const d of diagnostics) {
      if (m.get(d.line) !== 'error') m.set(d.line, d.severity);
    }
    return m;
  }, [diagnostics]);

  useEffect(() => {
    if (!focusLine || !taRef.current) return;
    const ta = taRef.current;
    let pos = 0;
    for (let i = 1; i < focusLine.line; i++) pos += (lines[i - 1]?.length ?? 0) + 1;
    ta.focus();
    ta.setSelectionRange(pos, pos + (lines[focusLine.line - 1]?.length ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusLine]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      insertText(ta, '  ');
      return;
    }
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      const before = ta.value.slice(0, ta.selectionStart);
      const curLine = before.slice(before.lastIndexOf('\n') + 1);
      const indent = /^\s*/.exec(curLine)![0];
      const extra = /\b(THEN|ELSE|OF|DO|REPEAT|VAR|VAR_INPUT|VAR_OUTPUT|VAR_EXTERNAL)\s*$/i.test(curLine) || /^\s*-?\d+(\s*,\s*-?\d+)*\s*:\s*$/.test(curLine) ? '  ' : '';
      e.preventDefault();
      insertText(ta, '\n' + indent + extra);
    }
  };

  const keys = keybar === 'vars' ? VAR_KEYS : CODE_KEYS;

  return (
    <div className={`editor ${readOnly ? 'readonly' : ''}`}>
      <div className="editor-scroll">
        <div className="editor-gutter" aria-hidden>
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className={`ln ${marks.get(i + 1) ?? ''}`}>
              {i + 1}
            </div>
          ))}
        </div>
        <div className="editor-main">
          <pre className="editor-hl" aria-hidden>
            {lines.map((l, i) => (
              <div key={i} className={`hl-line ${marks.get(i + 1) ?? ''}`}>
                {highlight(l)}
                {'\n'}
              </div>
            ))}
          </pre>
          <textarea
            ref={taRef}
            className="editor-ta"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onScroll={(e) => {
              // Der äußere Bereich scrollt – die Textebene muss deckungsgleich mit der Farbebene bleiben
              e.currentTarget.scrollLeft = 0;
              e.currentTarget.scrollTop = 0;
            }}
            readOnly={readOnly}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            aria-label={label}
            rows={lineCount}
            wrap="off"
          />
        </div>
      </div>
      {keybar && !readOnly && (
        <div className="keybar" role="toolbar" aria-label="Schnelleingabe">
          {keys.map((k) => (
            <button
              key={k.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => taRef.current && insertText(taRef.current, k.text, k.caret)}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
