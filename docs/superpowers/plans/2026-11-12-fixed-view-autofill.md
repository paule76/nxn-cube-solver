# Feste 3D-Ansicht, langsamere Einzelschritte, Auto-Färben – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ruhige 3D-Ansicht (Knopf „Ansicht festhalten“), 30 % langsamere Einzelschritte und automatisches Ergänzen zwingender Felder bei der Eingabe.

**Architecture:** Kamera-Folgen wird in `cube3d-view.js` abschaltbar; verdeckte Züge zeigen den Pfeil in einer zweiten, darübergelegten 3D-Ebene ohne Verdeckung. Auto-Färben ist ein reines, in Node testbares Modul (`src/autofill.js`) über Stein-Beschreibungen, die jedes Puzzle-Modul liefert; `app.js` verwaltet, welche Felder eigene und welche ergänzte sind.

**Tech Stack:** Vanilla JS (ES-Module), CSS 3D, `node --test`, Playwright (e2e).

**Spec:** `docs/superpowers/specs/2026-11-12-fixed-view-autofill-design.md`

## Global Constraints
- Keine Abhängigkeiten in der Seite, kein Build; Texte DE + EN; beide Themes (hell/dunkel).
- Alle bisherigen Unit- und e2e-Tests grün; Tests zum Kamera-Folgen laufen mit „Ansicht festhalten: aus“.
- Einzelschritt-Viertel-Drehung 430 ms (statt 300 ms); Abspielen/Mischen unverändert 300 ms.
- „Ansicht festhalten“ Standard an, in `localStorage` (Schlüssel `cube-solver-fixed-view`, try/catch).
- Auto-Färben und Ausblenden voller Farben nur, solange Felder leer sind; Auto-Färben ≤ 50 ms je Tipp (5x5).
- Branch `feature/fixed-view-autofill`; Merge nach `main` nur nach Freigabe des Nutzers.

## Review Focus
1. Tipp auf ein ergänztes Feld mit einer anderen Farbe → Feld wird eigenes, ergänzte Felder neu berechnet, ggf. Widerspruch – nie bleiben alte Folgerungen stehen (Task 4, Test „Ändern verwirft Folgerungen“).
2. Größenwechsel mit halb eingegebenem Würfel → Eigene/Ergänzte bleiben je Größe erhalten (Task 4, e2e „Größenwechsel behält Markierungen“).
3. Auto-Färben füllt das letzte leere Feld → Würfel vollständig, alle Farben wieder wählbar, „Lösen“ funktioniert (Task 4, e2e).
4. Andere Haltung (z. B. Gelb oben) → Folgerungen stimmen trotzdem (Task 3, Unit-Test mit gedrehtem Schema).
5. „Ansicht festhalten“ an, Mischen/Abspielen mit Zügen auf B/D/L → Kamera bleibt exakt stehen, Pfeil sichtbar (Task 2, e2e).

---

### Task 1: Langsamere Einzelschritte

**Files:**
- Modify: `src/stepper.js` (`goTo(step, options)`), `src/views/cube3d-view.js` (`showMove` Option `turnMs`), `src/app.js` (`goTo` für Knöpfe/Tasten mit `{ turnMs: 430 }`, Player ohne)
- Test: `test/stepper.test.js`, `e2e/animation.e2e.js`

**Interfaces:**
- Produces: `stepper.goTo(step: number, options?: { turnMs?: number }) -> Promise<boolean>` reicht `options` an `view.showMove(move, direction, options)` durch; `showMove(move, direction, { countHalfTurns = true, turnMs = 300 })`.

- [ ] **Step 1: Failing test** – `test/stepper.test.js`: `goTo passes options to showMove`: Fake-View zeichnet Aufrufe auf; `await stepper.goTo(1, { turnMs: 430 })` → `assert.deepEqual(calls[0].options, { turnMs: 430 })`.
- [ ] **Step 2:** `node --test test/stepper.test.js` → FAIL.
- [ ] **Step 3: Implementieren.** `SINGLE_STEP_MS = 430` in `app.js`; Navigationsknöpfe und Pfeiltasten rufen `goTo(target, { turnMs: SINGLE_STEP_MS })`, der Player-Schritt ohne Option. In `cube3d-view.js` ersetzt `turnMs` die Konstante bei beiden Hälften einer halben Drehung.
- [ ] **Step 4: e2e** – `e2e/animation.e2e.js`: „Weiter“ → eine Layer-Transition mit `430ms` (über `getComputedStyle(cubie).transitionDuration` während der Drehung), „Abspielen“ → `300ms`.
- [ ] **Step 5:** Unit + `e2e/animation.e2e.js` grün → Commit `feat: slower single steps (430 ms per quarter turn)`.

### Task 2: „Ansicht festhalten“ mit Pfeil durch den Würfel

**Files:**
- Modify: `src/views/cube3d-view.js`, `src/app.js`, `index.html` (Knopf `#fixed-view` neben `#reset-camera`, `aria-pressed`), `src/i18n.js` (`camera.fixed`: „Ansicht festhalten“ / “Keep view fixed”), `style.css`
- Test: `e2e/camera.e2e.js` (bestehende Folgen-Tests mit vorher ausgeschaltetem Knopf), neu `e2e/fixed-view.e2e.js`

**Interfaces:**
- Produces: `cube3d.setFollow(on: boolean)`; bei `false` ruft weder `showMove` noch `showHint` die Kamera-Nachführung auf. `showHint(move)` setzt am Pfeil die Klasse `through`, wenn `!isFaceVisible(move.face, camera)`.

- [ ] **Step 1: Failing e2e** – `e2e/fixed-view.e2e.js`:
  - `fixed view is default and remembered`: Knopf `aria-pressed="true"`; ausschalten, neu laden → `false`.
  - `fixed: camera never moves while playing a solution with B/D/L moves`: 3x3 `stateAfter3("B D L")` lösen, abspielen bis Ende; `.camera` `style.transform` vor/nach identisch und zwischendurch nie anders (Polling 25 ms).
  - `fixed: hidden-face move shows the see-through arrow`: Lösung, deren erster Zug B ist (`stateAfter3("B'")`) → `.hint-arrow.through` sichtbar (`isVisible`), `data-face="B"`.
  - `not fixed: camera follows as before` (aus → bestehendes Verhalten, Transform ändert sich bei B).
- [ ] **Step 2:** Tests laufen lassen → FAIL.
- [ ] **Step 3: Implementieren.**
  - Zustand in `app.js` aus `localStorage` (`cube-solver-fixed-view`, Standard `true`), Knopf schaltet um und ruft `cube3d.setFollow(!fixed)`; beim Einschalten `resetCamera()`.
  - Durchsichtiger Pfeil: eine zweite Ebene `.overlay` als Geschwister der Würfel-Szene, absolut darübergelegt, `pointer-events: none`, gleiche Kamera-Transformation (in `applyCamera` mitsetzen) und gleiche `preserve-3d`-Struktur nur für den Pfeil. Der Pfeil wird bei verdeckten Seiten in diese Ebene gehängt (sonst wie bisher im Würfel); dort ist er nicht vom Würfel verdeckt. Stil `.through`: gestrichelte Linie, leicht transparent, beide Themes.
- [ ] **Step 4:** Unit + alle e2e grün (in `camera.e2e.js` vor den Folgen-Tests `#fixed-view` ausschalten).
- [ ] **Step 5:** Screenshot Handy (375 px) mit durchsichtigem Pfeil prüfen; Commit `feat: keep the 3D view fixed (default) with see-through arrows`.

### Task 3: Auto-Färben – Logik

**Files:**
- Create: `src/autofill.js`, `test/autofill.test.js`
- Modify: `src/puzzles/cube2.js`, `cube3.js`, `cube4.js`, `cube5.js` (je `pieces` am Puzzle-Modul)

**Interfaces:**
- Produces (Puzzle-Modul): `pieces: { corners: number[][], edges?: number[][], wings?: number[][], fixedCenters?: number[], centerGroups?: number[][] }`
  - `corners`: Eckfelder im Uhrzeigersinn (wie Prüfung), mit Namen `cornerNames`; `edges`: 2 Felder, kippbar (3x3-Kanten, 5x5-Mittelkanten), Namen `edgeNames`; `wings`: 2 Felder in fester Leserichtung (4x4/5x5), Namen `wingNames`; `fixedCenters`: 6 Felder in FACES-Reihenfolge (3x3/5x5); `centerGroups`: austauschbare Mittelfelder je Art (4x4: eine Gruppe mit 24; 5x5: x- und t-Gruppe je 24).
- Produces: `autofill(puzzle, facelets: (string|null)[]) -> { facelets: (string|null)[], filled: number[], conflict: null | { kind: 'corner'|'edge'|'wing'|'centers', name?: string } }`. Reine Funktion; `facelets` des Ergebnisses = Eingabe + ergänzte Felder (bei `conflict` = Eingabe unverändert, `filled = []`).
- Steinvorrat aus `puzzle.solvedFacelets()`: Ecken als Farb-Tripel bis auf zyklische Drehung, Kanten als Farbpaare (beide Lagen), Kantenstücke als geordnete Paare, feste Mitten als die 24 Drehungen des Standardschemas (aus den Ecken des gelösten Würfels ableitbar oder per `AXIS_VIEWS`/Würfeldrehungen erzeugt), Zielanzahl je Farbe n².

**Verfahren (Fixpunkt):** Je Platz die Menge möglicher (Stein, Lage) passend zu gefärbten Feldern; Steine, die an einem anderen Platz sicher liegen (Platz mit genau einem Stein), entfernen; Lagen, die eine volle Farbe in ein leeres Feld setzen würden, entfernen; leeres Feld färben, wenn alle verbleibenden Möglichkeiten dieselbe Farbe dort haben; Mitten-Gruppen: leeres Feld färben, wenn nur eine Farbe noch fehlt (Anzahl), und nur bis zur Gruppen-Anzahl (4 je Farbe je Gruppe). Wiederholen, bis nichts mehr passiert. Leere Möglichkeitenmenge → `conflict`.

- [ ] **Step 1: Failing tests** (`test/autofill.test.js`):
  - `2x2: two stickers of a corner fix the third` – leeres Netz, Ecke URF Felder 0/1 mit W/R (passend zum gelösten Würfel) → drittes Feld `G` in `filled`.
  - `solved cube minus one field per piece -> everything filled back` – für alle Größen: gelöst, pro Stein ein Feld `null` → Ergebnis == gelöst, `conflict === null`.
  - `scrambled cube with 30 % of fields cleared -> never a wrong colour` – je Größe 20 Mischungen: jedes gefüllte Feld == Original.
  - `other holding (yellow on top) works` – `toFacelets*(SOLVED*, {U:'Y',D:'W',F:'B',B:'G',R:'R',L:'O'})` mit Lücken → richtig ergänzt.
  - `contradiction: two corners with the same colours -> conflict corner` – zwei Ecken vollständig gleich gefärbt (Rest leer) → `conflict.kind === 'corner'`, `filled` leer.
  - `full colour excluded` – 3x3: alle 9 Weiß gesetzt, Feld einer Kante mit Weiß-Kandidat leer → wird nicht Weiß.
  - `speed` – 5x5, 60 % leer: `autofill` < 50 ms (Mittel aus 10).
- [ ] **Step 2:** `node --test test/autofill.test.js` → FAIL.
- [ ] **Step 3:** `pieces` in den vier Puzzle-Modulen ergänzen (aus vorhandenen Konstanten: `CORNER_FACELETS*`, `EDGE_FACELETS`, `MIDGE_FACELETS`, `WING_FACELETS*`, `CENTERS`/`FIXED_CENTERS`, `CENTER_FACELETS`, `X_/T_CENTER_FACELETS`), dann `autofill` implementieren.
- [ ] **Step 4:** Tests grün; alle Unit-Tests grün.
- [ ] **Step 5:** Commit `feat: logic for auto-colouring forced fields`.

### Task 4: Auto-Färben in der App

**Files:**
- Modify: `src/app.js`, `src/views/net-view.js`, `src/views/cube3d-view.js`, `src/i18n.js`, `style.css`, `index.html` (Hinweistext unter dem Netz)
- Test: `e2e/autofill.e2e.js`

**Interfaces:**
- Consumes: `autofill(puzzle, facelets)` (Task 3).
- Produces: View-Methode `markAuto(indices: number[])` (Netz-Zellen und 3D-Aufkleber Klasse `auto`, z. B. kleiner Punkt); Sitzung je Größe speichert `autoCells: number[]`.

**Regeln (aus der Spec):**
- Aktiv nur, wenn die Eingabe ohne ergänzte Felder leere Felder hat. Ablauf beim Tipp: ergänzte Felder leeren → Feld setzen (wird eigenes) → `autofill` → Ergebnis übernehmen, `autoCells = filled`. Bei `conflict`: Eingabe ohne ergänzte Felder behalten, `autoCells = []`, Meldung `autofill.conflict`.
- Vollständiger Würfel (Start, Mischen, Zurücksetzen, Bearbeiten während Lösung): wie heute, `autoCells = []`; Markierungen nach Auto-Vervollständigung bleiben bis zur nächsten Änderung.
- Farbauswahl: bei leeren Feldern volle Farben ausblenden (`hidden`); gewählte volle Farbe → nächste freie in Palettenreihenfolge, keine frei → keine gewählt. Vollständig → alle sichtbar.
- Texte: `autofill.conflict`: „{place} passt zu keinem Stein mehr.“ / “{place} no longer fits any piece.”; `autofill.place.corner|edge|wing|centers` („Ecke {name}“, „Kante {name}“, „Kantenstück {name}“, „Die Mittelfelder“ bzw. EN); Namen über vorhandene `corner.*`, `edge.*`, `wing.*`; Hinweis `autofill.note`: „Felder mit Punkt hat die App ergänzt.“ / “Fields with a dot were filled in by the app.” (nur sichtbar, wenn ergänzte Felder da sind).

- [ ] **Step 1: Failing e2e** (`e2e/autofill.e2e.js`):
  - `2x2 after Leeren: two stickers of a corner -> third filled and marked` (`.cell.auto` am erwarteten Index, Farbe richtig).
  - `full colour disappears from the palette while fields are empty; complete cube shows all colours`.
  - `changing an own field drops old conclusions` (Review Focus 1).
  - `contradiction shows the message and keeps only own fields` (zwei gleiche Ecken).
  - `size switch keeps own and filled fields per size` (Review Focus 2).
  - `last empty field filled by the app -> Lösen works` (Review Focus 3).
  - Ohne Leeren (gelöster Start) unverändert: Umfärben möglich, alle Farben sichtbar.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Implementieren nach den Regeln oben.
- [ ] **Step 4:** Unit + alle e2e grün; Screenshot Handy (Markierung, Palette mit ausgeblendeter Farbe).
- [ ] **Step 5:** Commit `feat: auto-colour forced fields while entering a cube`.

### Task 5: README, Review, Freigabe
- [ ] README: Abschnitte Bedienung (Ansicht festhalten, Auto-Färben, Einzelschritt-Tempo).
- [ ] Frischer Reviewer über `git diff main..feature/fixed-view-autofill`; Critical/Important per Test fixen.
- [ ] Nutzer fragen: nach `main`?
