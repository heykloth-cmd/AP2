/**
 * Mini-Markdown für Lerntexte:
 * **fett**, *kursiv*, `code`, Absätze, Listen (- / 1.), ```st Codeblöcke```,
 * > Tipp: / > Achtung: / > Merke: / > PC WORX: als farbige Kästen, | Tabellen |
 */
import { Fragment, type ReactNode } from 'react';
import { CodeBlock } from './CodeBlock';

function inline(text: string, key = 0): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|~~[^~]+~~|\[\[[^\]]+\]\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${key}-${i++}`;
    if (t.startsWith('**')) out.push(<strong key={k}>{inline(t.slice(2, -2), i)}</strong>);
    else if (t.startsWith('`')) out.push(<code key={k} className="ic">{t.slice(1, -1)}</code>);
    else if (t.startsWith('~~')) out.push(<span key={k} className="ovl">{t.slice(2, -2)}</span>);
    else if (t.startsWith('[[')) out.push(<kbd key={k}>{t.slice(2, -2)}</kbd>);
    else out.push(<em key={k}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const CALLOUTS: Record<string, string> = {
  'Tipp:': 'tip',
  'Achtung:': 'warn',
  'Merke:': 'note',
  'PC WORX:': 'pcworx',
  'Prüfung:': 'exam',
  'Beispiel:': 'example',
};

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim() === '') {
      i++;
      continue;
    }
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith('```')) buf.push(lines[i++]!);
      i++;
      blocks.push(<CodeBlock key={key++} code={buf.join('\n')} plain={lang === 'text'} />);
      continue;
    }
    if (line.startsWith('> ')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('>')) buf.push(lines[i++]!.replace(/^>\s?/, ''));
      const first = buf[0] ?? '';
      const label = Object.keys(CALLOUTS).find((l) => first.startsWith(l));
      const body = label ? [first.slice(label.length).trim(), ...buf.slice(1)].join('\n') : buf.join('\n');
      blocks.push(
        <div key={key++} className={`callout ${label ? CALLOUTS[label] : ''}`}>
          {label && <div className="callout-title">{label.replace(':', '')}</div>}
          <Markdown text={body} />
        </div>,
      );
      continue;
    }
    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.startsWith('|')) {
        const r = lines[i++]!.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        if (!r.every((c) => /^:?-+:?$/.test(c))) rows.push(r);
      }
      const [head, ...body] = rows;
      blocks.push(
        <div className="table-wrap" key={key++}>
          <table>
            <thead>
              <tr>{head!.map((c, j) => <th key={j}>{inline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, j) => (
                <tr key={j}>{r.map((c, k) => <td key={k}>{inline(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^(-|\d+\.) /.test(line)) {
      const ordered = /^\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^(-|\d+\.) /.test(lines[i]!)) {
        let item = lines[i++]!.replace(/^(-|\d+\.) /, '');
        while (i < lines.length && /^ {2,}\S/.test(lines[i]!)) item += ' ' + lines[i++]!.trim();
        items.push(item);
      }
      const L = ordered ? 'ol' : 'ul';
      blocks.push(
        <L key={key++}>
          {items.map((it, j) => (
            <li key={j}>{inline(it)}</li>
          ))}
        </L>,
      );
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push(<h4 key={key++}>{inline(line.slice(4))}</h4>);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(<h3 key={key++}>{inline(line.slice(3))}</h3>);
      i++;
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== '' && !/^(```|> |\||- |\d+\. |##)/.test(lines[i]!)) buf.push(lines[i++]!);
    blocks.push(
      <p key={key++}>
        {buf.map((b, j) => (
          <Fragment key={j}>
            {j > 0 && ' '}
            {inline(b, j)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return <div className="md">{blocks}</div>;
}
