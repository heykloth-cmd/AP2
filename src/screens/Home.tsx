import { EXAM_TASKS } from '../content/exam/tasks';
import { EXERCISES } from '../content/exercises';
import { ALL_LESSONS, CHAPTERS, LESSON_MAP } from '../content/lessons';
import { href } from '../router';
import { level, streak, useProgress } from '../state/progress';

export function daysUntil(date?: string): number | null {
  if (!date) return null;
  const d = new Date(date + 'T08:00:00');
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export function Home() {
  const p = useProgress();
  const lv = level(p.xp);
  const st = streak(p.days);
  const lessonsDone = ALL_LESSONS.filter((l) => p.lessonsDone[l.id]).length;
  const exDone = EXERCISES.filter((e) => p.exercisesDone[e.id]).length;
  const examDone = EXAM_TASKS.filter((e) => p.exercisesDone[e.id]).length;
  const next = ALL_LESSONS.find((l) => !p.lessonsDone[l.id]);
  const nextExam = EXAM_TASKS.find((t) => !p.exercisesDone[t.id] && !t.bonus);
  const days = daysUntil(p.settings.examDate);
  const nextInfo = next ? LESSON_MAP.get(next.id) : undefined;

  return (
    <div className="page home">
      <section className="hero">
        <div className="hero-text">
          <h1>SPS-Trainer AP2</h1>
          <p>Structured Text lernen – Schritt für Schritt bis zu deinem Prüfungsprogramm am Achsenmodell.</p>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <div className="stat-n">{st}</div>
            <div className="stat-l">{st === 1 ? 'Tag' : 'Tage'} in Folge 🔥</div>
          </div>
          <div className="stat">
            <div className="stat-n">{p.xp}</div>
            <div className="stat-l">XP</div>
          </div>
          {days !== null && days >= 0 && (
            <div className="stat">
              <div className="stat-n">{days}</div>
              <div className="stat-l">Tage bis zur Prüfung</div>
            </div>
          )}
        </div>
        <div className="level">
          <div className="level-row">
            <span>
              Level {lv.index}: <b>{lv.name}</b>
            </span>
            {lv.to && <span className="muted">{lv.to - p.xp} XP bis zum nächsten Level</span>}
          </div>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${Math.round(lv.progress * 100)}%` }} />
          </div>
        </div>
      </section>

      <section className="cards-2">
        {next && nextInfo ? (
          <a className="card action" href={href(`lektion/${next.id}`)}>
            <div className="card-kicker">Weiter lernen</div>
            <div className="card-title">
              {nextInfo.chapter.icon} {next.title}
            </div>
            <div className="muted">
              {nextInfo.chapter.title} · ca. {next.minutes} min
            </div>
          </a>
        ) : (
          <a className="card action" href={href('lernen')}>
            <div className="card-kicker">Lernpfad</div>
            <div className="card-title">🎓 Alle Lektionen gelesen!</div>
            <div className="muted">Wiederholen oder ab ins Prüfungstraining.</div>
          </a>
        )}
        <a className="card action exam" href={href(nextExam ? `pruefung/${nextExam.id}` : 'pruefung')}>
          <div className="card-kicker">Prüfungstraining</div>
          <div className="card-title">🏭 {nextExam ? nextExam.title : 'Alle Pflichtaufgaben geschafft'}</div>
          <div className="muted">Achsenmodell AP2 Winter 2026/27</div>
        </a>
      </section>

      <section className="card">
        <h2>Dein Fortschritt</h2>
        <Bar label="Lektionen" n={lessonsDone} of={ALL_LESSONS.length} />
        <Bar label="Übungen" n={exDone} of={EXERCISES.length} />
        <Bar label="Prüfungsaufgaben" n={examDone} of={EXAM_TASKS.length} />
        <div className="chapter-dots" aria-label="Kapitel">
          {CHAPTERS.map((ch) => {
            const done = ch.lessons.filter((l) => p.lessonsDone[l.id]).length;
            return (
              <a key={ch.id} href={href('lernen')} className={`chdot ${done === ch.lessons.length ? 'full' : done ? 'part' : ''}`} title={`${ch.title}: ${done}/${ch.lessons.length}`}>
                {ch.icon}
              </a>
            );
          })}
        </div>
      </section>

      <section className="cards-3">
        <a className="card tile" href={href('simulator')}>
          <div className="tile-icon">🕹️</div>
          <div className="card-title">Simulator</div>
          <div className="muted small">Frei ausprobieren</div>
        </a>
        <a className="card tile" href={href('pcworx')}>
          <div className="tile-icon">🖥️</div>
          <div className="card-title">PC WORX</div>
          <div className="muted small">So geht’s an der echten SPS</div>
        </a>
        <a className="card tile" href={href('spick')}>
          <div className="tile-icon">📄</div>
          <div className="card-title">Spickzettel</div>
          <div className="muted small">Alles auf einer Seite</div>
        </a>
      </section>

      {!p.settings.examDate && (
        <p className="muted small center">
          Tipp: Trag in den <a href={href('einstellungen')}>Einstellungen</a> dein Prüfungsdatum ein – dann siehst du hier einen Countdown.
        </p>
      )}
    </div>
  );
}

function Bar({ label, n, of }: { label: string; n: number; of: number }) {
  return (
    <div className="pbar">
      <div className="pbar-row">
        <span>{label}</span>
        <span className="muted">
          {n} / {of}
        </span>
      </div>
      <div className="progress">
        <div className="progress-fill" style={{ width: `${of ? (n / of) * 100 : 0}%` }} />
      </div>
    </div>
  );
}
