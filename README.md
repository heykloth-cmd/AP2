# SPS-Trainer AP2

Lern-App für die **Abschlussprüfung Teil 2 Mechatroniker/-in (Winter 2026/27)**: SPS-Programmierung in **Structured Text (ST)** so, wie sie in **PC WORX 6.30** funktioniert – mit Simulator im Browser und Prüfungstraining am Achsenmodell.

## Funktionen

- **Lernpfad** in 10 Kapiteln: Grundlagen, Variablen, UND/ODER/NICHT, IF, Selbsthaltung & Verriegelung, Flanken (R_TRIG/F_TRIG), Timer (TON/TOF/TP), Zähler & Vergleicher, Analogwerte skalieren, GRAFCET & Schrittketten mit CASE, Funktionsbausteine
- **Simulator**: ST-Editor links, Anlage rechts (Taster, Schalter, Sensoren, Lampen, Motoren). Die simulierte SPS arbeitet zyklisch (10 ms) wie eine echte SPS: Eingänge lesen → Programm → Ausgänge schreiben
- **Übungen mit automatischer Prüfung** und gestuften Tipps
- **Prüfungstraining am Achsenmodell** (Schlitten, Impulsgeber BG12, Zylinder MM20, Magnet, Magazin, Ablagen) – jeder Teil-GRAFCET als eigener Funktionsbaustein, GRAFCET mit Live-Anzeige des aktiven Schritts
- **Kapitel „So geht’s in PC WORX“** (AXC 1050, globale Variablen mit AT-Adressen, Bearbeitungsassistent, Übersetzen, Laden, Debug)
- **Spickzettel** zum Ausdrucken
- Lernstand, XP und Code bleiben im Browser gespeichert (Export/Import für Handy ↔ PC)

Der ST-Interpreter ist so streng wie PC WORX: keine automatische Typumwandlung, globale Variablen nur über `VAR_EXTERNAL`, Kommentare nur `(* … *)`, Fehlermeldungen auf Deutsch.

> Die Prüfungsunterlagen (PDF) und die PC-WORX-Projekte (.zwt) liegen **nicht** im Repository (`.gitignore`). Die Inhalte sind in eigenen Worten nachgebaut.

## Befehle

```bash
npm install        # Abhängigkeiten installieren
npm run dev        # Entwicklungsserver
npm test           # Tests (Interpreter, alle Übungen, Prüfungsaufgaben)
npm run build      # Typprüfung + Produktions-Build nach dist/
npm run check      # alles zusammen
```

## Aufbau

```
src/
  plc/         ST-Lexer, Parser, Typprüfung (Compiler), Laufzeit, Standardbausteine
  sim/         Scan-Zyklus (Engine), Bedienpult, Achsenmodell, automatische Prüfungen
  content/     Lektionen, Übungen, Prüfungsaufgaben (exam/), PC-WORX-Kapitel, Spickzettel
  ui/          Editor, Anlagenansichten, GRAFCET, Arbeitsplatz (Workbench)
  screens/     Seiten
  state/       Lernstand (localStorage)
```

Neue Übung: Eintrag in `src/content/exercises.ts` mit Musterlösung und Prüfungen, dann in einer Lektion in `src/content/lessons.ts` als `{ type: 'exercise', id: '…' }` einbinden. `npm test` prüft automatisch, dass die Musterlösung besteht und der Startcode nicht.

## Veröffentlichung auf Cloudflare

Cloudflare baut die Seite automatisch bei jedem Push auf `main`.

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy` (Workers) – `wrangler.jsonc` liefert `dist/` aus
- Alternative Cloudflare Pages: Build command `npm run build`, Output `dist`
- `name` in `wrangler.jsonc` (`sps-trainer`) muss dem Projektnamen im Dashboard entsprechen
