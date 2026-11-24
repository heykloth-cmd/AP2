import type { PouSource } from '../plc/compiler';
import type { Check } from '../sim/checks';
import type { PanelConfig } from '../sim/types';
import type { GrafcetDef } from '../ui/Grafcet';

export type Scenario = { kind: 'panel'; panel: PanelConfig } | { kind: 'achse'; variante: 'vorbereitung' | 'bereitstellung' };

/** Alles, was ein Arbeitsplatz (Editor + Anlage) braucht */
export interface WorkbenchSetup {
  /** Speicherschlüssel für den Code */
  id: string;
  scenario: Scenario;
  /** Bausteine – der erste editierbare wird zuerst gezeigt */
  pous: PouSource[];
  focusPou?: string;
  checks?: Check[];
  solution?: PouSource[];
  grafcets?: GrafcetDef[];
}

export interface Exercise {
  id: string;
  title: string;
  /** Aufgabentext (Markdown) */
  task: string;
  scenario: Scenario;
  /** Startcode für Main: eigene Variablen (VAR … END_VAR) */
  vars?: string;
  code?: string;
  /** Musterlösung */
  solVars?: string;
  solCode: string;
  hints: string[];
  checks: Check[];
  xp?: number;
  /** Mehrere Bausteine (Prüfungsaufgaben) – überschreibt vars/code */
  pous?: PouSource[];
  solPous?: PouSource[];
  focusPou?: string;
  grafcets?: GrafcetDef[];
}

export type Card =
  | { type: 'text'; title?: string; body: string }
  | { type: 'quiz'; question: string; options: string[]; correct: number; explain: string }
  | { type: 'exercise'; id: string }
  | { type: 'grafcet'; title?: string; body?: string; grafcet: GrafcetDef };

export interface Lesson {
  id: string;
  title: string;
  /** Kurzbeschreibung */
  goal: string;
  minutes: number;
  cards: Card[];
}

export interface Chapter {
  id: string;
  title: string;
  icon: string;
  lessons: Lesson[];
}
