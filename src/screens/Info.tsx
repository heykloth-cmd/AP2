import { useRef, useState } from 'react';
import { CHEATSHEET } from '../content/cheatsheet';
import { PCWORX_INTRO, PCWORX_PAGES } from '../content/pcworx';
import { href } from '../router';
import { exportProgress, importProgress, resetProgress, update, useProgress } from '../state/progress';
import { Markdown } from '../ui/Markdown';
import { NotFound } from './Learn';

export function PcWorx({ id }: { id?: string }) {
  if (id) {
    const i = PCWORX_PAGES.findIndex((x) => x.id === id);
    const page = PCWORX_PAGES[i];
    if (!page) return <NotFound />;
    const prev = PCWORX_PAGES[i - 1];
    const next = PCWORX_PAGES[i + 1];
    return (
      <div className="page">
        <div className="crumbs">
          <a href={href('pcworx')}>‹ So geht’s in PC WORX</a>
        </div>
        <h1>
          {page.icon} {page.title}
        </h1>
        <div className="card">
          <Markdown text={page.body} />
        </div>
        <div className="lesson-nav">
          {prev ? (
            <a className="btn ghost" href={href(`pcworx/${prev.id}`)}>
              ‹ {prev.title}
            </a>
          ) : (
            <span />
          )}
          {next ? (
            <a className="btn primary" href={href(`pcworx/${next.id}`)}>
              {next.title} ›
            </a>
          ) : (
            <a className="btn primary" href={href('pcworx')}>
              Übersicht
            </a>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="page">
      <h1>So geht’s in PC WORX</h1>
      <div className="card">
        <Markdown text={PCWORX_INTRO} />
      </div>
      <ol className="pw-list">
        {PCWORX_PAGES.map((pg, i) => (
          <li key={pg.id}>
            <a className="card pw-link" href={href(`pcworx/${pg.id}`)}>
              <span className="pw-icon">{pg.icon}</span>
              <span>
                <span className="muted small">Schritt {i + 1}</span>
                <span className="lesson-title">{pg.title}</span>
              </span>
              <span className="chev">›</span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Cheatsheet() {
  return (
    <div className="page cheatsheet">
      <div className="row-between">
        <h1>Spickzettel ST</h1>
        <button className="btn no-print" onClick={() => window.print()}>
          🖨 Drucken
        </button>
      </div>
      <p className="muted no-print">Zum Nachschlagen – und ausgedruckt für deinen Schnellhefter.</p>
      <div className="card">
        <Markdown text={CHEATSHEET} />
      </div>
    </div>
  );
}

export function More() {
  return (
    <div className="page">
      <h1>Mehr</h1>
      <div className="more-list">
        <a className="card pw-link" href={href('simulator')}>
          <span className="pw-icon">🕹️</span>
          <span className="lesson-title">Simulator</span>
          <span className="chev">›</span>
        </a>
        <a className="card pw-link" href={href('spick')}>
          <span className="pw-icon">📄</span>
          <span className="lesson-title">Spickzettel</span>
          <span className="chev">›</span>
        </a>
        <a className="card pw-link" href={href('einstellungen')}>
          <span className="pw-icon">⚙️</span>
          <span className="lesson-title">Einstellungen & Lernstand</span>
          <span className="chev">›</span>
        </a>
        <a className="card pw-link" href={href('info')}>
          <span className="pw-icon">ℹ️</span>
          <span className="lesson-title">Über diese App</span>
          <span className="chev">›</span>
        </a>
      </div>
    </div>
  );
}

export function Settings() {
  const p = useProgress();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const download = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sps-trainer-lernstand-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const upload = async (f: File) => {
    const ok = importProgress(await f.text());
    setMsg(ok ? 'Lernstand übernommen ✓' : 'Diese Datei konnte nicht gelesen werden.');
  };
  return (
    <div className="page">
      <h1>Einstellungen</h1>
      <div className="card form">
        <label>
          <span>Darstellung</span>
          <select value={p.settings.theme} onChange={(e) => update((x) => void (x.settings.theme = e.target.value as 'auto'))}>
            <option value="auto">wie System</option>
            <option value="light">hell</option>
            <option value="dark">dunkel</option>
          </select>
        </label>
        <label>
          <span>Prüfungsdatum (Durchführung)</span>
          <input type="date" value={p.settings.examDate ?? ''} onChange={(e) => update((x) => void (x.settings.examDate = e.target.value || undefined))} />
        </label>
      </div>
      <div className="card">
        <h2>Lernstand</h2>
        <p className="muted">
          Dein Fortschritt und dein Code werden nur hier im Browser gespeichert. Willst du zwischen Handy und PC wechseln, lade die Datei auf einem Gerät herunter und auf dem anderen wieder hoch.
        </p>
        <div className="btn-row">
          <button className="btn" onClick={download}>
            ⬇ Lernstand sichern
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            ⬆ Lernstand laden
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
        {msg && <p>{msg}</p>}
        <hr />
        <button
          className="btn danger"
          onClick={() => {
            if (confirm('Wirklich alles löschen? Fortschritt, XP und dein gesamter Code gehen verloren.')) resetProgress();
          }}
        >
          Lernstand zurücksetzen
        </button>
      </div>
    </div>
  );
}

export function About() {
  return (
    <div className="page">
      <h1>Über diese App</h1>
      <div className="card">
        <Markdown
          text={`Lern-App für die **Abschlussprüfung Teil 2 Mechatroniker/-in** (Winter 2026/27): SPS-Programmierung in **Structured Text** nach IEC 61131-3, so wie in **PC WORX 6**.

- Der Simulator enthält einen eigenen ST-Interpreter mit den Regeln von PC WORX (strenge Typen, VAR_EXTERNAL, nur \`(* *)\`-Kommentare).
- Das Achsenmodell ist eine vereinfachte Simulation. Impulse, Zeiten und Positionen sind Beispielwerte. Die echten Werte ermittelst du an eurer Anlage.
- Prüfungsinhalte sind in eigenen Worten zusammengefasst und ersetzen nicht die Originalunterlagen. Im Zweifel gilt immer, was in deinen Unterlagen steht und was dein Ausbilder sagt.

Dein Lernstand bleibt in diesem Browser (localStorage). Es werden keine Daten an einen Server geschickt.`}
        />
      </div>
    </div>
  );
}
