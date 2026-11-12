# D2: 4x4-Solver (Reduktion) – Implementation Plan

> **For agentic workers:** Execute task-by-task (executing-plans, inline). `bd` not available; git history on `feature/cube4-solver` is the record. **Task 2 ends with a checkpoint: if the edge-pairing targets are missed, stop and report to the user with options before continuing.** No merge to `main` without the user's approval.

**Goal:** Gültige 4x4-Stellungen in Phasen lösen (meist 60–90 Züge, ≤ 1,5 s), im Worker, mit gegliederter Anzeige.

**Architecture:** `src/solver4/` (Node-testbar) arbeitet auf 4x4-Feldern mit der Engine (n = 4). Mitten: drei IDA*-Stufen mit Bitmasken-Pruning. Kanten: iteratives Paaren. Parität: feste, getestete Algorithmen. 3x3-Teil: Kociemba aus B auf dem reduzierten Würfel.

**Spec:** `docs/superpowers/specs/2026-11-12-cube4-solver-design.md`

## Global Constraints
- Keine Abhängigkeiten, kein Build; Texte DE + EN; alle bisherigen Tests grün.
- Ergebnisform `[{ phase: 'centers'|'edges'|'parity'|'solve3', moves }]`, leere Phasen weglassen.
- Jede Lösung wird am Ausgangszustand geprüft; Fehler → Fehlermeldung, nie eine falsche Lösung.
- Zielwerte: Mittelwert ≤ 90, Maximum ≤ 120 Züge, ≤ 1,5 s je Lösung (Node).

## Gemeinsame Definitionen
- Mittelfelder: `CENTER_FACELETS` aus `src/puzzles/cube4.js` (24, nach Seite gruppiert, U R F D L B je 4). Mittel-Slot i ↔ `CENTER_FACELETS[i]`, Seite = `FACES[i >> 2]`.
- Zielfarbe je Seite: Schema aus DBL (wie `parse4`).
- Slot-Permutation je Zug: aus der Engine-Feldpermutation, eingeschränkt auf Mittelfelder.
- Bitmasken: 24-Bit-Maske = Menge der Slots mit einer Eigenschaft; Zug auf Maske über drei 256er-Nachschlagetabellen pro Zug (je Byte).

---

### Task 1: Mitten (M1–M3)
**Files:** Create `src/solver4/centers.js`, `test/solver4-centers.test.js`

**Interfaces:** `createCenterSolver() -> { solveCenters(facelets, scheme) -> Move[] }` (gibt die Mitten-Phase zurück; Ergebnis angewandt ⇒ jede Seite trägt in ihren 4 Mittelfeldern die Schema-Farbe). Zugmengen: `M1_MOVES` = alle 36; `M2_MOVES` = U*, D*, Uw*, Dw*, R2, L2, F2, B2, Rw2, Lw2, Fw2, Bw2; `M3_MOVES` = U*, D*, Uw2, Dw2, R2, L2, F2, B2, Rw2, Lw2, Fw2, Bw2.
- M1: Maske der Slots mit U- oder D-Farbe; Ziel = Slots von U und D; Pruning per BFS über Masken (Tiefe in `Uint8Array(2^24)`, 4 Bit gepackt) vom Ziel aus.
- M2: 16-Bit-Maske der F/B-Farben unter den Seiten-Slots (F R B L); Ziel F, B; BFS über M2_MOVES.
- M3: Tripel (U-Farbe unter U/D-Slots, F-Farbe unter F/B-Slots, R-Farbe unter R/L-Slots), je 8-Bit-Maske; BFS über M3_MOVES.

**Acceptance Criteria:**
- M2_MOVES erhalten M1-Ziel, M3_MOVES erhalten M1- und M2-Ziel (für jeden Zug geprüft).
- BFS-Tabellen erreichen alle Zustände (keine ungesetzten Einträge); max. Tiefen geloggt.
- 50 Mischungen (40 Züge): nach `solveCenters` sind alle Mitten gelöst; Länge geloggt; gelöster Würfel → `[]`.
- Gelöster Würfel in anderer Haltung (Gelb oben, Blau vorne) → Mitten schon passend → `[]`.

- [ ] Tests → FAIL → implementieren → PASS → Commit `feat(solver4): centres in three stages`

### Task 2: Kanten paaren + **Prüfpunkt**
**Files:** Create `src/solver4/edges.js`, `test/solver4-edges.test.js`

**Interfaces:** `pairEdges(facelets) -> Move[]` (Mitten müssen gelöst sein; danach: alle 12 Kanten gepaart, Mitten weiterhin gelöst); `pairedCount(facelets) -> 0..12` (Kante gepaart ⇔ ihre zwei Kantenstücke zeigen dieselben zwei Farben in gleicher Lage).
- Verfahren: wiederholt kürzeste Folge suchen, die `pairedCount` erhöht und die Mitten gelöst lässt. Suchraum je Schritt: `setup` (äußere Züge, Tiefe 0–3) + `slice` (Uw, Uw', Dw, Dw') + `flip` (feste Folge aus Liste, z. B. `R U R' F R' F' R`, und Varianten über Seitenwahl) + `slice⁻¹`; dazu direkte IDA*-Suche bis Tiefe 5 über alle 36 Züge als Abkürzung. Kandidaten mit gleicher Wirkung werden über die Kanten-Signatur dedupliziert.
- Letzte zwei Kanten: feste Folge `Dw R F' U R' F Dw'` mit Aufstell-Suche (äußere Züge ≤ 4).

**Acceptance Criteria:**
- 50 Mischungen (nach Task 1): alle Kanten gepaart, Mitten gelöst.
- **Prüfpunkt:** Mittelwert Mitten+Kanten ≤ 65 Züge und ≤ 1,0 s je Würfel in Node. Werden Ziele verfehlt: Messwerte notieren, stoppen und dem Nutzer Optionen vorlegen (z. B. längere Lösungen akzeptieren / anderes Paarungsverfahren).

- [ ] Tests → FAIL → implementieren → PASS → Messung → Commit `feat(solver4): edge pairing` → Prüfpunkt

### Task 3: Parität, 3x3-Teil, Gesamtablauf
**Files:** Create `src/solver4/parity.js`, `src/solver4/reduce.js`, `test/solver4-reduce.test.js`

**Interfaces:**
- `toReduced3(facelets4) -> facelets3` (Ecken → 3x3-Ecken, Kantenpaar → 3x3-Kante, Mitten → feste Mitte).
- `OLL_PARITY`, `PLL_PARITY` (Zugfolgen in WCA-Notation; per Test: auf gelöstem 4x4 angewandt ergibt OLL-Parität genau eine gekippte gepaarte Kante bei sonst gelöstem Würfel, PLL-Parität genau zwei vertauschte Kanten).
- `fixParity(facelets) -> Move[]` (wählt nach `parse3(toReduced3)`-Code `flippedEdge`/`parity` die Algorithmen inkl. Aufstellung per Suche über äußere Züge ≤ 3).
- `createSolver4(search3) -> { solve(facelets) -> { phases } }`; `search3` = Kociemba-Suche aus B.

**Acceptance Criteria:**
- Paritäts-Algorithmen erzeugen genau die Paritätsfälle (siehe oben).
- 50 Mischungen: Gesamtlösung am Ausgangszustand ⇒ gelöst; Mittelwert ≤ 90, Maximum ≤ 120; ≤ 1,5 s je Lösung (Grenze 3 s im Test).
- Paritätsfälle (konstruiert über Algorithmen) werden gelöst und enthalten Phase `parity`.
- Gelöst → `[]`-Phasen.

- [ ] Tests → FAIL → implementieren → PASS → Commit `feat(solver4): parity, 3x3 stage, full reduction`

### Task 4: Worker und Anbindung
**Files:** Modify `src/solver3/core.js` (`solve4(facelets)` mit Prüfung), `src/solver3/worker.js` (`solve4` → `solution4 {id, phases}`), `src/solver3/client.js` (`solve4`), `src/solvers.js` (`'4x4'` → `{ isReady, failed, whenReady, solve(state, facelets) -> phases }`), Tests in `test/solver3-core.test.js`, `test/solver3-client.test.js`.

**Acceptance Criteria:** Core löst 5 Mischungen geprüft; Client ordnet `solution4` zu; `solvers.get('4x4')` vorhanden; 2x2/3x3 liefern intern eine Phase `{ phase: 'solve', moves }`.

- [ ] Tests → FAIL → implementieren → PASS → Commit `feat: 4x4 solver in the worker`

### Task 5: Anzeige in Phasen
**Files:** Modify `src/app.js` (Lösung = Phasen; Zugliste mit Überschriften; Schritt-Text mit Phase), `src/step-text.js`, `src/i18n.js` (`phase.centers|edges|parity|solve3`, `step.nextInPhase`, Lead/Meta mit 4x4), `index.html`, `style.css`, Create `e2e/solve4.e2e.js`; `msg.validNoSolver` entfernen.

**Acceptance Criteria (e2e):** 4x4 mischen → lösen → Ende: Seiten einfarbig, 3D == Netz; Überschriften „Mitten“, „Kanten paaren“, „Wie ein 3x3 lösen“ (DE) / EN-Pendants; Schritt-Text „<Phase> · Schritt k von n: …“; Pfeil-Klasse `wide` sichtbar bei Doppelschicht-Zug; „Lösen“ während Vorbereitung löst automatisch; alle bisherigen e2e grün; 2x2/3x3-Anzeige unverändert (keine Überschrift).

- [ ] Implementieren; Unit + e2e grün; Screenshots; Commit `feat: 4x4 solution shown in phases`

### Task 6: README, Review, Freigabe-Frage
- [ ] README (Stand 4x4 ✅, Solver-Beschreibung)
- [ ] Frischer Reviewer über `git diff main..feature/cube4-solver`; Critical/Important per Test fixen
- [ ] Nutzer fragen: D1 + D2 nach `main`?
