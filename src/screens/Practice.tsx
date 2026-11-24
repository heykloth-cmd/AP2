import { useMemo, useState } from 'react';
import { ALL_V, G_AUTO_B } from '../content/exam/grafcets';
import { solutionSources } from '../content/exam/solution';
import { EXAM_MAP, EXAM_TASKS } from '../content/exam/tasks';
import { EXERCISE_MAP } from '../content/exercises';
import { LESSON_MAP } from '../content/lessons';
import { btn, lamp, motor, nc, panel, sw, ana, sens } from '../content/panels';
import { exerciseSetup, mainVars } from '../content/setup';
import type { Exercise, WorkbenchSetup } from '../content/types';
import { href } from '../router';
import { addXp, useProgress } from '../state/progress';
import { celebrate } from '../ui/Celebrate';
import { Grafcet } from '../ui/Grafcet';
import { Markdown } from '../ui/Markdown';
import { Workbench } from '../ui/Workbench';
import { NotFound } from './Learn';

function lessonOf(exId: string) {
  for (const { lesson, chapter } of LESSON_MAP.values()) {
    if (lesson.cards.some((c) => c.type === 'exercise' && c.id === exId)) return { lesson, chapter };
  }
  return undefined;
}

export function ExerciseScreen({ id }: { id: string }) {
  const ex = EXERCISE_MAP[id];
  const setup = useMemo(() => (ex ? exerciseSetup(ex) : null), [ex]);
  if (!ex || !setup) return <NotFound />;
  const from = lessonOf(id);
  return (
    <div className="page wide-page">
      <div className="crumbs">
        {from ? (
          <>
            <a href={href(`lektion/${from.lesson.id}`)}>‹ {from.lesson.title}</a>
          </>
        ) : (
          <a href={href('lernen')}>‹ Lernpfad</a>
        )}
      </div>
      <h1>{ex.title}</h1>
      <TaskWorkbench ex={ex} setup={setup} />
    </div>
  );
}

function TaskWorkbench({ ex, setup, extra }: { ex: Exercise; setup: WorkbenchSetup; extra?: React.ReactNode }) {
  const p = useProgress();
  const done = !!p.exercisesDone[ex.id];
  return (
    <Workbench
      key={ex.id}
      setup={setup}
      hints={ex.hints}
      taskPane={
        <div className="task">
          {done && <div className="chip good">✓ schon gelöst</div>}
          <Markdown text={ex.task} />
          {extra}
        </div>
      }
      onPassed={(first) => {
        if (first) {
          addXp(ex.xp ?? 20);
          celebrate(ex.xp ?? 20, 'Aufgabe gelöst!');
        } else celebrate(0, 'Wieder alles richtig!');
      }}
    />
  );
}

// ---------------- Prüfung ----------------

export function ExamHub() {
  const p = useProgress();
  const [gc, setGc] = useState(0);
  const all = [...ALL_V, G_AUTO_B];
  return (
    <div className="page">
      <h1>Prüfungstraining</h1>
      <p className="lead">
        Euer <b>Achsenmodell</b> aus der AP2 Winter 2026/27 – als Simulation. Du programmierst jeden Teil-GRAFCET als Funktionsbaustein in ST, genau wie im Projekt eures Ausbilders.
      </p>

      <section className="card">
        <h2>Die Anlage</h2>
        <Markdown
          text={`- **Schlitten** auf einer Spindel, Getriebemotor **QA5** (links) / **QA6** (rechts)
- **BG13** Grundposition rechts, **BG11** Endlage links, **BG12** Impulse zur Positionserfassung
- **Zylinder MM20** (MB22 ausfahren, MB21 einfahren; BG21 oben, BG22 unten) mit **Magnet MB60** – QA60 schaltet ihn **ab**
- **Magazin** mit Sensor **BG54** (Vorbereitung: Pos. 4), Ablagen **Pos. 1** (BG52 induktiv) und **Pos. 3** (BG53 kapazitiv)

> Prüfung: Laut Vorbereitungsauftrag musst du die Anlage **umgerüstet und programmiert mitbringen** (Vorbereitung 8 h). Am Prüfungstag (6 h) kommt eine weitere Änderung. Im Heft steht schon: „In einer späteren Erweiterung werden dann die Kunststoffwürfel auf die Position 3 sortiert.“`}
        />
      </section>

      <section className="card">
        <h2>Aufgaben</h2>
        <ol className="exam-list">
          {EXAM_TASKS.map((t) => (
            <li key={t.id}>
              <a href={href(`pruefung/${t.id}`)} className={`exam-link ${p.exercisesDone[t.id] ? 'done' : ''}`}>
                <span className="exam-n">{p.exercisesDone[t.id] ? '✓' : t.n}</span>
                <span className="lesson-text">
                  <span className="lesson-title">
                    {t.title} {t.bonus && <span className="chip">Bonus</span>}
                  </span>
                  <span className="muted small">{t.short}</span>
                </span>
                <span className="chev">›</span>
              </a>
            </li>
          ))}
        </ol>
        <p className="muted small">Tipp: Vorher die Lektionen zu Flanken, Timern und Schrittketten machen – dann geht es viel leichter.</p>
      </section>

      <section className="card">
        <h2>Die GRAFCETs</h2>
        <div className="seg scroll">
          {all.map((g, i) => (
            <button key={g.name} className={i === gc ? 'active' : ''} onClick={() => setGc(i)}>
              {g.name}
            </button>
          ))}
        </div>
        <div className="gc-wrap">
          <Grafcet def={all[gc]!} />
        </div>
        <p className="muted small">Nachgezeichnet nach euren Unterlagen. Strich über einem Namen = negiert, * = UND, + = ODER.</p>
      </section>

      <section className="card">
        <h2>Was mir am Prototyp eures Ausbilders aufgefallen ist</h2>
        <Markdown
          text={`Die beiden Projekte („AP2“ und „Winter26“) sind laut deiner Aussage ein ungetesteter Prototyp. Diese Punkte solltest du mit deinem Ausbilder besprechen:

1. **Winter26, G_Auto:** \`iC1 := iC1 + 1;\` ohne Flanke zählt jeden Zyklus statt jedes BG12-Impulses.
2. **Winter26, G_Auto:** \`xOUT_MB22\` wird zweimal zugewiesen. Die zweite Zeile überschreibt die erste, deshalb fährt der Greifer in Schritt 503 nie aus.
3. **Winter26, G_Auto:** \`xOUT_QA6\` wird nie gesetzt. Schritt 509 (Rechtsfahrt) fährt nicht.
4. **Winter26, G_Auto:** In Schritt 508 fehlt die Wartezeit \`1s/X508\` vor MB21.
5. **Winter26, G_Einricht:** Ausgänge werden nur in Schritt 301 geschrieben und bleiben beim Umschalten stehen. Der Motor läuft dann weiter.
6. **QA60 (G_Einricht):** Der Strich geht über \`5s/SJ12\`. Beide Projekte setzen das unterschiedlich um, keins genau wörtlich. Was ist gemeint?
7. **AP2:** setzt den **Bereitstellungsstand** sauber um, der Umbau auf die Vorbereitung (Pos. 4, BG54) fehlt noch. BG54 fehlt in den globalen Variablen.`}
        />
      </section>
    </div>
  );
}

export function ExamTaskScreen({ id }: { id: string }) {
  const t = EXAM_MAP[id];
  const p = useProgress();
  const setup = useMemo(() => {
    if (!t) return null;
    const s = exerciseSetup(t);
    // Generalprobe: eigene Lösungen aus den Einzelaufgaben übernehmen, falls vorhanden
    if (t.id === 'p-gesamt') {
      const map: Record<string, string> = { G_Takt: 'p-takt', G_Anzeige: 'p-anzeige', G_Einricht: 'p-einricht', G_Main: 'p-main', G_Auto: 'p-auto' };
      s.pous = s.pous.map((pou) => {
        const from = map[pou.name];
        const saved = from && p.exercisesDone[from] ? p.code[from]?.find((x) => x.name === pou.name) : undefined;
        return saved && !pou.readonly ? { ...pou, vars: saved.vars, code: saved.code } : pou;
      });
    }
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);
  if (!t || !setup) return <NotFound />;
  const idx = EXAM_TASKS.indexOf(t);
  const next = EXAM_TASKS[idx + 1];
  return (
    <div className="page wide-page">
      <div className="crumbs">
        <a href={href('pruefung')}>‹ Prüfungstraining</a>
      </div>
      <h1>
        {t.n}. {t.title}
      </h1>
      <TaskWorkbench
        ex={t}
        setup={setup}
        extra={
          <>
            {t.grafcets?.map((g) => (
              <details key={g.name} className="gc-details" open={t.grafcets!.length === 1}>
                <summary>GRAFCET {g.name}</summary>
                <div className="gc-wrap">
                  <Grafcet def={g} />
                </div>
              </details>
            ))}
            {p.exercisesDone[t.id] && next && (
              <a className="btn primary" href={href(`pruefung/${next.id}`)}>
                Weiter: {next.title} ›
              </a>
            )}
          </>
        }
      />
    </div>
  );
}

// ---------------- Simulator ----------------

const FREE_PANEL = panel(
  [btn('S1', 'Taster 1'), btn('S2', 'Taster 2'), nc('S0', 'Stopp (Öffner)'), sw('S3', 'Schalter'), sens('B1', 'Sensor 1'), sens('B2', 'Sensor 2'), ana('AI1', 'Analogwert')],
  [lamp('H1', 'Lampe grün', 'green'), lamp('H2', 'Lampe gelb', 'yellow'), lamp('H3', 'Lampe rot', 'red'), motor('M1', 'Motor 1'), motor('M2', 'Motor 2')],
);

export function Simulator() {
  const [mode, setMode] = useState<'pult' | 'achse' | 'achse-b'>('pult');
  const setup: WorkbenchSetup = useMemo(() => {
    if (mode === 'pult') {
      return {
        id: 'sim-pult',
        scenario: FREE_PANEL,
        pous: [
          {
            name: 'Main',
            kind: 'PROGRAM',
            vars: mainVars(FREE_PANEL, 'VAR\n\tT1 : TON;\nEND_VAR'),
            code: '(* Spielwiese: probier hier alles aus! *)\nH1 := S1 AND S0;\n\nT1(IN := S3, PT := T#2s);\nH2 := T1.Q;\n',
          },
        ],
      };
    }
    const v = mode === 'achse' ? 'vorbereitung' : 'bereitstellung';
    return {
      id: mode === 'achse' ? 'sim-achse' : 'sim-achse-b',
      scenario: { kind: 'achse', variante: v },
      pous: solutionSources(v),
      grafcets: mode === 'achse' ? ALL_V : [G_AUTO_B],
    };
  }, [mode]);
  return (
    <div className="page wide-page">
      <h1>Simulator</h1>
      <div className="seg">
        <button className={mode === 'pult' ? 'active' : ''} onClick={() => setMode('pult')}>
          Freies Pult
        </button>
        <button className={mode === 'achse' ? 'active' : ''} onClick={() => setMode('achse')}>
          Achsenmodell (Musterlösung)
        </button>
        <button className={mode === 'achse-b' ? 'active' : ''} onClick={() => setMode('achse-b')}>
          Bereitstellung
        </button>
      </div>
      <p className="muted small">
        {mode === 'pult'
          ? 'Ein Pult mit Tastern, Sensoren, Lampen und Motoren. Schreib, was du willst.'
          : 'Die komplette Musterlösung läuft auf dem Achsenmodell. Starte sie, schalte SJ3 ein, SJ4 auf A und drücke SJ5 – und schau im GRAFCET zu, wie die Schritte wandern. Du kannst den Code auch ändern.'}
      </p>
      <Workbench key={setup.id} setup={setup} />
    </div>
  );
}
