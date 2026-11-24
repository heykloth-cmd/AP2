/**
 * Kapitel „So geht's in PC WORX“ – abgestimmt auf PC WORX 6.30 und AXC 1050
 * (abgelesen aus den Projektdateien des Ausbildungsbetriebs).
 */
export interface Page {
  id: string;
  title: string;
  icon: string;
  body: string;
}

export const PCWORX_INTRO = `**Euer Stand laut Projektdateien:** PC WORX **6.30** (Software Suite 188/189), Steuerung **AXC 1050**, Eingänge über **AXL F DI32/1 1F**, Ausgänge über zwei **AXL F DO16/1 1H**.

> Achtung: Menünamen und Symbole können sich je nach Version und Spracheinstellung leicht unterscheiden. Wenn etwas nicht genau so heißt, such nach dem ähnlichsten Begriff oder frag deinen Ausbilder. Am besten gehst du alles einmal an eurem PC durch und machst dir Notizen.`;

export const PCWORX_PAGES: Page[] = [
  {
    id: 'pw-ueberblick',
    title: 'Die Oberfläche',
    icon: '🖥️',
    body: `PC WORX ist in **Arbeitsbereiche** aufgeteilt. Umschalten kannst du über die Symbolleiste oder das Menü **Ansicht**:

| Arbeitsbereich | Wofür |
|---|---|
| **IEC-Programmierung** | Bausteine schreiben (ST, FUP …), Variablen |
| **Busaufbau** | Steuerung und Module (AXC 1050, Axioline-Karten), IP-Adresse |
| **Prozessdatenzuordnung** | Kanäle der Module mit Variablen verbinden |

Links siehst du den **Projektbaum**:
- **Bibliotheken** – Standardbausteine wie TON, R_TRIG, CTU
- **Logische POEs** – deine Bausteine (Main, G_Auto …). Jeder hat ein **Variablen-Arbeitsblatt** und ein **Code-Arbeitsblatt**
- **Physikalische Hardware** – Konfiguration, Ressource (STD_RES), Task, **Global_Variables**

> PC WORX: Euer Projekt heißt z. B. „AP2“, die Konfiguration **STD_CNF**, die Ressource **STD_RES**. So steht es in den Projektdateien.`,
  },
  {
    id: 'pw-projekt',
    title: 'Projekt anlegen',
    icon: '📁',
    body: `Meist bekommst du ein vorbereitetes Projekt (.zwt) von deinem Ausbilder. So öffnest bzw. legst du an:

**Vorhandenes Projekt öffnen**
1. **Datei → Projekt öffnen/entpacken** (für .zwt-Archive) wählen.
2. Projekt auswählen. PC WORX entpackt es in den Projektordner.

**Neues Projekt**
1. **Datei → Neues Projekt …**
2. Vorlage für die Steuerung wählen: **AXC 1050** (passende Firmware-Version).
3. Projekt **sofort speichern** unter einem sprechenden Namen, z. B. \`AP2_Nachname\`.
4. Im Arbeitsbereich **Busaufbau** die Axioline-Module einfügen bzw. **einlesen**, wenn die Steuerung verbunden ist.

> Tipp: Speichere regelmäßig und mach vor größeren Änderungen eine Kopie (**Datei → Projekt speichern unter/zippen**). In der Prüfung kostet ein kaputtes Projekt viel Zeit.`,
  },
  {
    id: 'pw-poe',
    title: 'Baustein (POE) anlegen',
    icon: '🧩',
    body: `Für jeden Teil-GRAFCET legst du einen Funktionsbaustein an:

1. Im Projektbaum auf **Logische POEs** rechtsklicken → **Einfügen → POE …** (Program Organization Unit).
2. **Name**: z. B. \`G_Auto\`
3. **Typ**: **Funktionsbaustein**
4. **Sprache**: **ST**
5. OK. Es entstehen ein Code-Arbeitsblatt und ein Variablen-Arbeitsblatt.

**Instanz in Main einfügen (FUP):**
1. Main (FUP) öffnen.
2. Rechts im **Bearbeitungsassistenten** die Gruppe der Projekt-Bausteine wählen.
3. \`G_Auto\` per Drag & Drop ins Arbeitsblatt ziehen. PC WORX fragt nach dem Instanznamen, z. B. \`G_Auto_1\`.
4. Ein- und Ausgänge mit Variablen bzw. anderen Bausteinen verbinden.

> PC WORX: Danach muss das Projekt neu übersetzt werden, damit die neue Instanz bekannt ist.`,
  },
  {
    id: 'pw-variablen',
    title: 'Variablen deklarieren',
    icon: '📋',
    body: `**Globale Variablen (Ein-/Ausgänge)** stehen bei euch unter **Physikalische Hardware → STD_CNF → STD_RES → Global_Variables**. Jede Zeile hat:

| Spalte | Beispiel |
|---|---|
| Name | \`BG54\` |
| Typ | \`BOOL\` |
| Gültigkeit | \`VAR_GLOBAL\` |
| Adresse | \`%IX2.4\` |
| Kommentar | Materialerkennung Magazin |

So steht es in eurem Projekt (Auszug):
\`\`\`
KE2   AT %IX0.0 : BOOL;
SJ3   AT %IX0.1 : BOOL;
BG12  AT %IX1.5 : BOOL;
QA5   AT %QX4.6 : BOOL;
PF3   AT %QX6.4 : BOOL;
\`\`\`

> Prüfung: **BG54** (I20, Materialerkennung Magazin) kommt mit dem Vorbereitungsauftrag neu dazu und fehlt im Projekt noch. Nach dem Schema eurer Belegung wäre das **%IX2.4**. Prüfe die tatsächliche Klemme!

**Lokale Variablen eines Bausteins:** Variablen-Arbeitsblatt des Bausteins öffnen, neue Zeile, Name/Typ/Gültigkeit (VAR, VAR_INPUT, VAR_OUTPUT, VAR_EXTERNAL) und Anfangswert eintragen.

**Globale Variablen im Baustein benutzen:** Sie müssen dort als **VAR_EXTERNAL** stehen. Am schnellsten: Variable im Code schreiben. PC WORX fragt beim Übersetzen bzw. über den Dialog „Variable deklarieren“, ob sie angelegt werden soll. Dann **VAR_EXTERNAL** wählen.`,
  },
  {
    id: 'pw-prozessdaten',
    title: 'Prozessdaten zuordnen',
    icon: '🔗',
    body: `Die SPS muss wissen, welche Variable zu welcher Klemme gehört. Dafür gibt es zwei Wege:

**A) Direkte Adresse (so macht es euer Projekt)**
In Global_Variables steht bei jeder Variable eine Adresse wie \`%IX0.3\`. Die Adresse ergibt sich aus dem Modul im Busaufbau. Bei euch:
- **AXL F DI32/1 1F** → Eingänge \`%IX0.0\` … \`%IX3.7\` (Byte 0–3)
- **AXL F DO16/1 1H** → Ausgänge ab \`%QX4.0\`
- zweites **AXL F DO16/1 1H** → Ausgänge ab \`%QX6.0\`

**B) Arbeitsbereich „Prozessdatenzuordnung“**
1. Ansicht **Prozessdatenzuordnung** öffnen.
2. Oben links die **Variablen** (z. B. Global_Variables), oben rechts die **Prozessdaten** der Module (Kanäle).
3. Variable auf den Kanal ziehen bzw. beide markieren und **Verbinden**.
4. Unten erscheint die Zuordnung.

So rechnest du von Klemme auf Adresse um (bei 8 Bit pro Byte):

| Zuordnungsliste | Adresse | Variable |
|---|---|---|
| I0 | %IX0.0 | KE2 |
| I10 | %IX1.2 | SJ12 |
| I13 | %IX1.5 | BG12 |
| I20 | %IX2.4 | BG54 (neu) |
| I23 | %IX2.7 | FC7 |
| O0 | %QX4.0 | MB21 |
| O6 | %QX4.6 | QA5 |
| O8 | %QX6.0 | PF32 |

> Achtung: Bei den Ausgängen eures Projekts passen nicht alle Nummern zu einem festen Schema (z. B. PF15 an O23 liegt auf %QX7.4). Ihr habt also an eure Verdrahtung angepasst. Prüfe immer mit dem echten Klemmenplan bzw. online.`,
  },
  {
    id: 'pw-st',
    title: 'ST schreiben & Bausteine reinziehen',
    icon: '⌨️',
    body: `**Code schreiben:** Code-Arbeitsblatt des Bausteins öffnen und tippen. Groß-/Kleinschreibung ist egal (\`IF\` = \`If\` = \`if\`).

**Bausteine per Drag & Drop (Bearbeitungsassistent):**
1. Im ST-Arbeitsblatt die Schreibmarke an die gewünschte Stelle setzen.
2. Im **Bearbeitungsassistenten** (Fenster rechts) die Gruppe wählen, z. B. **Funktionsbausteine → IEC** für TON, R_TRIG, CTU.
3. Den Baustein ins Arbeitsblatt ziehen oder doppelklicken.
4. PC WORX fragt nach dem **Instanznamen** (z. B. \`T_X503\`). Die Instanz landet automatisch in der Variablentabelle.
5. Im Code steht dann ein **Aufruf-Gerüst als Text** mit allen Ein- und Ausgängen, ungefähr so:

\`\`\`
T_X503(IN:= (*BOOL*), PT:= (*TIME*));
\`\`\`

6. Platzhalter ersetzen:
\`\`\`
T_X503(IN := iStep = 503, PT := T#1s);
\`\`\`

Übrig gebliebene Kommentare und Ausgänge, die du nicht brauchst, kannst du löschen. Die Ausgänge fragst du danach mit \`T_X503.Q\` ab.

> Tipp: So vermeidest du Tippfehler bei den Anschlussnamen (\`IN\`, \`PT\`, \`CLK\`, \`CU\` …). In der Prüfung spart das Zeit.`,
  },
  {
    id: 'pw-uebersetzen',
    title: 'Übersetzen (Projekt erzeugen)',
    icon: '⚙️',
    body: `Bevor etwas auf die Steuerung kann, wird das Projekt **übersetzt** (kompiliert):

- **Code → Projekt erzeugen** (Make): übersetzt alles, was sich geändert hat
- **Code → Projekt neu erzeugen** (Rebuild): übersetzt alles neu. Nimm das, wenn seltsame Fehler auftauchen.
- Ein einzelnes Arbeitsblatt prüfst du mit **Syntax prüfen**.

Unten im **Meldungsfenster** erscheinen Fehler und Warnungen. **Doppelklick** auf eine Meldung springt zur Stelle im Code.

**Typische Meldungen und was sie meistens bedeuten:**

| Meldung (sinngemäß) | Ursache |
|---|---|
| „; erwartet“ | Semikolon am Zeilenende fehlt, oft in der Zeile davor |
| „Variable nicht deklariert“ | Tippfehler oder VAR_EXTERNAL fehlt |
| „Typen inkompatibel“ | INT und REAL gemischt, 1 statt TRUE |
| „END_IF erwartet“ | END_IF; vergessen |
| „:= erwartet“ | \`=\` statt \`:=\` geschrieben |

> Tipp: Genau diese Fehler zeigt dir auch der Trainer an. Wenn du sie hier schnell findest, findest du sie auch in PC WORX.`,
  },
  {
    id: 'pw-laden',
    title: 'Auf die Steuerung laden',
    icon: '⬇️',
    body: `1. PC und AXC 1050 per **Ethernet** verbinden. Der PC muss im gleichen IP-Netz sein wie die Steuerung.
2. Im Busaufbau bzw. in den Ressourcen-Einstellungen prüfen, ob die **IP-Adresse** der Steuerung stimmt (Kommunikationspfad).
3. **Online → Projektsteuerung** öffnen (Dialog für die Ressource STD_RES).
4. **Senden** (Download): Das übersetzte Projekt wird übertragen.
5. **Kaltstart**: Die SPS startet und alle Variablen bekommen ihre Startwerte.

**Kaltstart, Warmstart, Heißstart**
- **Kaltstart**: alle Variablen auf Startwert. Nach dem Laden eines neuen Programms immer die sichere Wahl.
- **Warmstart**: nur remanente (RETAIN-)Variablen bleiben erhalten.
- **Heißstart**: weitermachen, wo die SPS gestoppt wurde.

> Achtung: Vor dem Start prüfen: Steht die Anlage sicher? Sind Druckluft und Motor bereit? Niemand im Gefahrenbereich? Nach dem Laden kann sich die Anlage **sofort bewegen**.

> PC WORX: Damit das Programm nach einem Spannungsausfall wieder da ist, muss es auf der Steuerung bzw. SD-Karte gespeichert sein (Bootprojekt / „Senden“ mit Option zum Speichern). Frag deinen Ausbilder, wie es bei euch eingestellt ist.`,
  },
  {
    id: 'pw-online',
    title: 'Online beobachten & testen',
    icon: '🔍',
    body: `**Debug-Modus einschalten:** **Online → Debug ein/aus** (Symbol mit Brille/Käfer in der Symbolleiste).

Danach siehst du in den Arbeitsblättern die **aktuellen Werte**:
- In ST stehen die Werte neben den Variablen.
- In FUP sind TRUE-Leitungen farbig.
- Im Variablenfenster bzw. in der **Watchliste** kannst du Variablen sammeln und beobachten (z. B. \`G_Auto_1.iStep\`, \`G_Auto_1.C1\`).

**Werte überschreiben / forcen:**
- Doppelklick auf eine Variable im Debug-Modus öffnet einen Dialog. Dort kannst du einen Wert **überschreiben** (gilt einen Zyklus) oder **forcen** (bleibt fest, bis du es aufhebst).

> Achtung: Geforcte Werte unbedingt wieder aufheben (**Forcen aufheben**). Sonst wundert man sich später, warum ein Ausgang nicht reagiert.

**Systematisch testen (Inbetriebnahme):**
1. Erst **Einrichtbetrieb**: jeden Aktor einzeln tippen, Endlagen und Verriegelungen prüfen.
2. **Positionen ermitteln**: im Tippbetrieb zu Pos. 1–4 fahren und **C1** beobachten. Die Werte trägst du in die Tabelle der Unterlagen und als Konstanten im Programm ein.
3. Dann **Automatik** Schritt für Schritt: \`iStep\` beobachten. Bleibt die Kette hängen, prüfe die Transition des aktuellen Schritts.

> Tipp: Genau das übst du im Simulator mit dem Reiter **Werte** und der grünen Markierung im GRAFCET.`,
  },
  {
    id: 'pw-pruefung',
    title: 'Checkliste für die Prüfung',
    icon: '✅',
    body: `**Vor dem Prüfungstag (Vorbereitung, 8 h)**
- ☐ Umbau fertig, BG54 angeschlossen und im Programm (I20)
- ☐ Programm nach den GRAFCETs der Vorbereitung angepasst und **getestet**
- ☐ Positionen (Inkrementalwerte Pos. 1–4) ermittelt und dokumentiert
- ☐ Programm gesichert: Projekt als .zwt auf USB-Stick und ausgedruckt (Variablenliste + Code)
- ☐ Unterlagen im Schnellhefter, mit Name und Prüflingsnummer auf jedem Blatt

**Am Prüfungstag (Durchführung, 6 h)**
- ☐ Erst lesen, dann planen: Was ändert sich am GRAFCET? Welche Bausteine sind betroffen?
- ☐ Kopie des Projekts anlegen, bevor du änderst
- ☐ Änderungen klein halten, nach jeder Änderung übersetzen
- ☐ Erst Einricht, dann Automatik testen
- ☐ Änderungen in der Dokumentation nachtragen

**Fürs Fachgespräch**
- Erklären können: SPS-Zyklus, Flanke, warum Öffner für Stopp/NOT-AUS, wie die Positionierung mit BG12 funktioniert, was {INIT} macht, warum QA5/QA6 verriegelt sind.`,
  },
];
