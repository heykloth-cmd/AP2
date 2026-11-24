import { useState } from 'react';
import { EXERCISE_MAP } from '../content/exercises';
import { CHAPTERS, LESSON_MAP } from '../content/lessons';
import type { Card } from '../content/types';
import { go, href } from '../router';
import { addXp, update, useProgress } from '../state/progress';
import { celebrate } from '../ui/Celebrate';
import { Grafcet } from '../ui/Grafcet';
import { Markdown } from '../ui/Markdown';

export function LearnPath() {
  const p = useProgress();
  return (
    <div className="page">
      <h1>Lernpfad</h1>
      <p className="muted">Von null bis zur Schrittkette. Jede Lektion dauert nur ein paar Minuten – perfekt fürs Handy zwischendurch.</p>
      <ol className="chapters">
        {CHAPTERS.map((ch, ci) => {
          const done = ch.lessons.filter((l) => p.lessonsDone[l.id]).length;
          return (
            <li key={ch.id} className="chapter card">
              <div className="chapter-head">
                <span className="chapter-icon">{ch.icon}</span>
                <div>
                  <div className="muted small">Kapitel {ci + 1}</div>
                  <h2>{ch.title}</h2>
                </div>
                <span className={`chip ${done === ch.lessons.length ? 'good' : ''}`}>
                  {done}/{ch.lessons.length}
                </span>
              </div>
              <ul className="lesson-list">
                {ch.lessons.map((l) => {
                  const exIds = l.cards.filter((c): c is Extract<Card, { type: 'exercise' }> => c.type === 'exercise').map((c) => c.id);
                  const exDone = exIds.filter((id) => p.exercisesDone[id]).length;
                  return (
                    <li key={l.id}>
                      <a href={href(`lektion/${l.id}`)} className={`lesson-link ${p.lessonsDone[l.id] ? 'done' : ''}`}>
                        <span className="check">{p.lessonsDone[l.id] ? '✓' : ''}</span>
                        <span className="lesson-text">
                          <span className="lesson-title">{l.title}</span>
                          <span className="muted small">
                            {l.goal} · {l.minutes} min
                            {exIds.length > 0 && ` · Übungen ${exDone}/${exIds.length}`}
                          </span>
                        </span>
                        <span className="chev">›</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function LessonView({ id }: { id: string }) {
  const p = useProgress();
  const info = LESSON_MAP.get(id);
  const [idx, setIdx] = useState(() => Math.min(p.lessonPos[id] ?? 0, (info?.lesson.cards.length ?? 1) - 1));
  if (!info) return <NotFound />;
  const { lesson, chapter } = info;
  const card = lesson.cards[idx]!;
  const last = idx === lesson.cards.length - 1;
  const all = [...LESSON_MAP.values()];
  const pos = all.findIndex((x) => x.lesson.id === id);
  const nextLesson = all[pos + 1]?.lesson;

  const goto = (i: number) => {
    setIdx(i);
    update((pp) => {
      pp.lessonPos[id] = i;
    });
    window.scrollTo({ top: 0 });
  };

  const finish = () => {
    if (!p.lessonsDone[id]) {
      update((pp) => {
        pp.lessonsDone[id] = Date.now();
      });
      addXp(10);
      celebrate(10, 'Lektion abgeschlossen');
    }
    go(nextLesson ? `lektion/${nextLesson.id}` : 'lernen');
    setIdx(0);
  };

  return (
    <div className="page lesson">
      <div className="crumbs">
        <a href={href('lernen')}>Lernpfad</a> › {chapter.title}
      </div>
      <h1>{lesson.title}</h1>
      <div className="dots" role="tablist" aria-label="Karten">
        {lesson.cards.map((c, i) => (
          <button key={i} className={`dot ${i === idx ? 'active' : ''} ${i < idx ? 'seen' : ''} ${c.type}`} onClick={() => goto(i)} aria-label={`Karte ${i + 1}`} />
        ))}
      </div>
      <div className="card lesson-card" key={idx}>
        <CardView card={card} cardKey={`${id}:${idx}`} />
      </div>
      <div className="lesson-nav">
        <button className="btn ghost" onClick={() => goto(idx - 1)} disabled={idx === 0}>
          ‹ Zurück
        </button>
        <span className="muted small">
          {idx + 1} / {lesson.cards.length}
        </span>
        {!last ? (
          <button className="btn primary" onClick={() => goto(idx + 1)}>
            Weiter ›
          </button>
        ) : (
          <button className="btn primary" onClick={finish}>
            {p.lessonsDone[id] ? (nextLesson ? 'Nächste Lektion ›' : 'Zum Lernpfad') : 'Abschließen ✓'}
          </button>
        )}
      </div>
    </div>
  );
}

function CardView({ card, cardKey }: { card: Card; cardKey: string }) {
  switch (card.type) {
    case 'text':
      return (
        <>
          {card.title && <h2>{card.title}</h2>}
          <Markdown text={card.body} />
        </>
      );
    case 'quiz':
      return <Quiz card={card} cardKey={cardKey} />;
    case 'grafcet':
      return (
        <>
          {card.title && <h2>{card.title}</h2>}
          {card.body && <Markdown text={card.body} />}
          <div className="gc-wrap">
            <Grafcet def={card.grafcet} />
          </div>
        </>
      );
    case 'exercise':
      return <ExerciseCard id={card.id} />;
  }
}

function Quiz({ card, cardKey }: { card: Extract<Card, { type: 'quiz' }>; cardKey: string }) {
  const p = useProgress();
  const [picked, setPicked] = useState<number | null>(null);
  const solved = picked === card.correct;
  const pick = (i: number) => {
    if (solved) return;
    setPicked(i);
    if (i === card.correct && !p.quizDone[cardKey]) {
      update((pp) => {
        pp.quizDone[cardKey] = true;
      });
      addXp(5);
      celebrate(5, 'Richtig!');
    }
  };
  return (
    <div className="quiz">
      <div className="card-kicker">Kurze Frage</div>
      <h2>{card.question}</h2>
      <div className="options">
        {card.options.map((o, i) => (
          <button
            key={i}
            className={`option ${picked === i ? (i === card.correct ? 'right' : 'wrong') : ''} ${solved && i === card.correct ? 'right' : ''}`}
            onClick={() => pick(i)}
            aria-pressed={picked === i}
          >
            <span className="opt-letter">{String.fromCharCode(65 + i)}</span>
            <span className="opt-text">{o}</span>
          </button>
        ))}
      </div>
      {picked !== null && (
        <div className={`callout ${solved ? 'tip' : 'warn'}`}>
          <div className="callout-title">{solved ? 'Richtig!' : 'Noch nicht – versuch es nochmal.'}</div>
          {solved && <Markdown text={card.explain} />}
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ id }: { id: string }) {
  const p = useProgress();
  const ex = EXERCISE_MAP[id];
  if (!ex) return null;
  const done = !!p.exercisesDone[id];
  return (
    <div className="exercise-card">
      <div className="card-kicker">Übung {done && <span className="chip good">✓ gelöst</span>}</div>
      <h2>{ex.title}</h2>
      <Markdown text={ex.task} />
      <a className="btn primary wide" href={href(`uebung/${id}`)}>
        {done ? 'Nochmal öffnen' : '▶ Aufgabe im Simulator lösen'}
      </a>
      <p className="muted small">Dein Code wird automatisch gespeichert.</p>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="page">
      <h1>Nicht gefunden</h1>
      <p>
        Diese Seite gibt es nicht. <a href={href('')}>Zur Startseite</a>
      </p>
    </div>
  );
}
