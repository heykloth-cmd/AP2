/**
 * Lernstand – wird nur im Browser gespeichert (localStorage).
 */
import { useSyncExternalStore } from 'react';
import type { PouSource } from '../plc/compiler';

export interface Progress {
  version: 1;
  /** gelesene Lektionen (id → Zeitstempel) */
  lessonsDone: Record<string, number>;
  /** Position in einer Lektion (letzte Karte) */
  lessonPos: Record<string, number>;
  /** gelöste Quizfragen (lessonId:cardIndex) */
  quizDone: Record<string, boolean>;
  /** gelöste Übungen */
  exercisesDone: Record<string, number>;
  /** Fehlversuche je Übung */
  attempts: Record<string, number>;
  /** gespeicherter Code je Übung/Arbeitsplatz */
  code: Record<string, PouSource[]>;
  xp: number;
  /** Lerntage (YYYY-MM-DD) */
  days: string[];
  settings: { theme: 'auto' | 'light' | 'dark'; sound: boolean; examDate?: string; name?: string };
  lastVisited?: string;
}

const KEY = 'sps-trainer.v1';

const empty = (): Progress => ({
  version: 1,
  lessonsDone: {},
  lessonPos: {},
  quizDone: {},
  exercisesDone: {},
  attempts: {},
  code: {},
  xp: 0,
  days: [],
  settings: { theme: 'auto', sound: true },
});

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Partial<Progress>;
    return { ...empty(), ...p, settings: { ...empty().settings, ...(p.settings ?? {}) } };
  } catch {
    return empty();
  }
}

let state: Progress = typeof localStorage !== 'undefined' ? load() : empty();
const listeners = new Set<() => void>();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* privater Modus o. ä. – App läuft trotzdem */
  }
}

export function update(fn: (p: Progress) => Progress | void) {
  const draft = structuredClone(state);
  const r = fn(draft);
  state = r ?? draft;
  save();
  listeners.forEach((l) => l());
}

export function getProgress() {
  return state;
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** XP gutschreiben und Lerntag merken */
export function addXp(n: number) {
  update((p) => {
    p.xp += n;
    const t = today();
    if (!p.days.includes(t)) p.days.push(t);
  });
}

export function markDay() {
  update((p) => {
    const t = today();
    if (!p.days.includes(t)) p.days.push(t);
  });
}

/** Tage in Folge (inkl. heute oder gestern) */
export function streak(days: string[]): number {
  const set = new Set(days);
  const d = new Date();
  let n = 0;
  const fmt = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  if (!set.has(fmt(d))) d.setDate(d.getDate() - 1);
  while (set.has(fmt(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export const LEVELS = [
  { xp: 0, name: 'Einsteigerin' },
  { xp: 60, name: 'Bit-Schubserin' },
  { xp: 160, name: 'Verknüpfungs-Profi' },
  { xp: 320, name: 'Timer-Meisterin' },
  { xp: 520, name: 'Schrittketten-Könnerin' },
  { xp: 800, name: 'GRAFCET-Übersetzerin' },
  { xp: 1150, name: 'Prüfungsreif' },
  { xp: 1600, name: 'SPS-Legende' },
];

export function level(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1]!.xp) i++;
  const cur = LEVELS[i]!;
  const next = LEVELS[i + 1];
  return { index: i + 1, name: cur.name, from: cur.xp, to: next?.xp, progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1 };
}

export function exportProgress(): string {
  return JSON.stringify(state);
}

export function importProgress(json: string): boolean {
  try {
    const p = JSON.parse(json) as Progress;
    if (p.version !== 1) return false;
    update(() => ({ ...empty(), ...p }));
    return true;
  } catch {
    return false;
  }
}

export function resetProgress() {
  update(() => empty());
}
