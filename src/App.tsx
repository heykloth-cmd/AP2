import { useEffect } from 'react';
import { href, useRoute } from './router';
import { Home } from './screens/Home';
import { About, Cheatsheet, More, PcWorx, Settings } from './screens/Info';
import { LearnPath, LessonView, NotFound } from './screens/Learn';
import { ExamHub, ExamTaskScreen, ExerciseScreen, Simulator } from './screens/Practice';
import { markDay, useProgress } from './state/progress';
import { CelebrateHost } from './ui/Celebrate';

const NAV = [
  { path: '', label: 'Start', icon: '🏠', match: [''] },
  { path: 'lernen', label: 'Lernen', icon: '📚', match: ['lernen', 'lektion', 'uebung'] },
  { path: 'pruefung', label: 'Prüfung', icon: '🏭', match: ['pruefung'] },
  { path: 'pcworx', label: 'PC WORX', icon: '🖥️', match: ['pcworx'] },
  { path: 'mehr', label: 'Mehr', icon: '☰', match: ['mehr', 'simulator', 'spick', 'einstellungen', 'info'] },
];

export function App() {
  const route = useRoute();
  const p = useProgress();
  const [a = '', b] = route;

  useEffect(() => {
    const t = p.settings.theme;
    if (t === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  }, [p.settings.theme]);

  useEffect(() => {
    markDay();
  }, []);

  let page: React.ReactNode;
  switch (a) {
    case '':
      page = <Home />;
      break;
    case 'lernen':
      page = <LearnPath />;
      break;
    case 'lektion':
      page = <LessonView key={b} id={b ?? ''} />;
      break;
    case 'uebung':
      page = <ExerciseScreen key={b} id={b ?? ''} />;
      break;
    case 'pruefung':
      page = b ? <ExamTaskScreen key={b} id={b} /> : <ExamHub />;
      break;
    case 'simulator':
      page = <Simulator />;
      break;
    case 'pcworx':
      page = <PcWorx key={b} id={b} />;
      break;
    case 'spick':
      page = <Cheatsheet />;
      break;
    case 'mehr':
      page = <More />;
      break;
    case 'einstellungen':
      page = <Settings />;
      break;
    case 'info':
      page = <About />;
      break;
    default:
      page = <NotFound />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href={href('')}>
          <span className="brand-logo" aria-hidden>
            <svg viewBox="0 0 32 32" width="26" height="26">
              <rect x="3" y="5" width="26" height="22" rx="4" fill="currentColor" opacity="0.15" />
              <rect x="7" y="9" width="4" height="14" rx="1.5" fill="currentColor" />
              <rect x="14" y="9" width="4" height="14" rx="1.5" fill="currentColor" opacity="0.7" />
              <circle cx="24" cy="12" r="2.2" fill="#22c55e" />
              <circle cx="24" cy="19" r="2.2" fill="#f59e0b" />
            </svg>
          </span>
          <span className="brand-name">SPS-Trainer</span>
        </a>
        <nav className="topnav" aria-label="Hauptnavigation">
          {NAV.map((n) => (
            <a key={n.path} href={href(n.path)} className={n.match.includes(a) ? 'active' : ''}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="xp-pill" title="Erfahrungspunkte">
          ⚡ {p.xp} XP
        </div>
      </header>
      <main>{page}</main>
      <nav className="bottomnav" aria-label="Hauptnavigation">
        {NAV.map((n) => (
          <a key={n.path} href={href(n.path)} className={n.match.includes(a) ? 'active' : ''}>
            <span className="bn-icon" aria-hidden>
              {n.icon}
            </span>
            <span className="bn-label">{n.label}</span>
          </a>
        ))}
      </nav>
      <CelebrateHost />
    </div>
  );
}
