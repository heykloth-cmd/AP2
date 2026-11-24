import { useState } from 'react';
import { highlight } from './highlight';

export function CodeBlock({ code, plain, title }: { code: string; plain?: boolean; title?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Zwischenablage nicht verfügbar */
    }
  };
  return (
    <div className="codeblock">
      {title && <div className="codeblock-title">{title}</div>}
      <pre>
        <code>{plain ? code : highlight(code)}</code>
      </pre>
      {!plain && (
        <button className="copy-btn" onClick={copy} aria-label="Code kopieren">
          {copied ? '✓ kopiert' : 'kopieren'}
        </button>
      )}
    </div>
  );
}
