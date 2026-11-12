# Teilprojekt A: N×N-Grundlage + 3x3-Modell – Implementation Plan

> **For agentic workers:** Execute task-by-task (executing-plans, inline). `bd` is not available in this environment; git history on `feature/nxn-foundation` is the record. Every task ends with a commit on that branch. **No merge to `main` in this plan** (main gets A together with B).

**Goal:** Größenwahl 2x2/3x3; 3x3 eingeben, prüfen, mischen, animiert ansehen; 2x2 unverändert inkl. Solver.

**Architecture:** Allgemeine N×N-Feld-Engine (`src/engine/`) erzeugt Züge aus der Geometrie; Puzzle-Module (`src/puzzles/`) liefern Prüfung/Mischen/Solver je Größe; Views bekommen `n`; `app.js` hält einen Zustand je Größe.

**Tech Stack:** ES-Module, `node --test`, Playwright 1.63.0 (devDependency, nur für `e2e/`).

**Spec:** `docs/superpowers/specs/2026-11-12-nxn-foundation-design.md` (inkl. „Stress Test Results“)

## Global Constraints
- Ausgelieferte Seite ohne Abhängigkeiten/Build; Deploy kopiert nur `index.html`, `style.css`, `src/`.
- Playwright **genau 1.63.0** als devDependency (passt zum vorinstallierten Browser), `package-lock.json` committen.
- Feld-Index = `face * n² + row * n + col`, Seiten U0 R1 F2 D3 L4 B5 (für n = 3 identisch mit Kociemba U1…B9).
- Alle neuen Texte DE + EN; `i18n.test.js` bleibt grün; `*Html`-Schlüssel ohne Platzhalter.
- Hash/localStorage nur gegen Allowlist (`'2x2'`, `'3x3'`; `'de'`, `'en'`).
- Nach jeder Task: `npm test` und `npm run e2e` grün.

---

### Task 1: e2e-Tests ins Repo + CI

**Files:**
- Modify: `package.json` (scripts `test: "node --test test/"`, `e2e: "node --test --test-concurrency=1 e2e/"`; devDependency `"playwright": "1.63.0"`), create `package-lock.json` via `npm install`
- Create: `e2e/server.js` (statischer Server ohne Abhängigkeiten, `startServer() -> {url, close()}` auf freiem Port, liefert Repo-Root aus, MIME für html/css/js)
- Create: `e2e/helpers.js` (`openPage(browser, {locale = 'de-DE', reducedMotion, viewport})`, `paint(page, facelets)` färbt per Palette+Klick, `netColors(page)`, `cubeColors(page)` – beide nach `data-index` sortiert, `stateAfter(movesString, n = 2)` → Facelets aus `src/cube.js`)
- Create: `e2e/solve.e2e.js`, `e2e/animation.e2e.js`, `e2e/controls.e2e.js`, `e2e/i18n.e2e.js`
- Modify: `.github/workflows/pages.yml` (Job `e2e`: checkout, setup-node 24, `npm ci`, `npx playwright install --with-deps chromium`, `npm run e2e`; `deploy.needs: [test, e2e]`)

**Acceptance Criteria (Inhalte der e2e-Tests, alle gegen den heutigen 2x2):**
- `solve`: Default → „Schon gelöst!“; Zustand nach `R` → Lösung `R'`, „Weiter“ → Netz gelöst; Weiß 3× → „Weiß kommt 3× vor (erwartet: 4×).“; 11-Zug-Mischung → ≤ 11 Züge, Ende einfarbig, 3D == Netz.
- `animation`: Pfeil auf R, `ccw` bei `R'`; Doppelklick „Weiter“ = genau 1 Schritt; reduced motion < 300 ms; `R2` Zähler „1“ (150 ms, 500 ms) dann „2“ (850 ms); Sprachwechsel in der Pause lässt Schicht gedreht; Lösen in der Pause → Zähler weg, kein Phantomzug, „Weiter“ danach funktioniert.
- `controls`: Autoplay „schnell“ erreicht „Fertig“; Netzklick während Autoplay verbirgt Lösung; Tasten → ← End; Palette-Pfeiltaste ändert Farbe statt Schritt; Fokus bleibt auf „Weiter“ (Leertaste 2×); hängender Drag; Hover-/Klick-Sync; Mischen (12 Züge, 3D == Netz, Buttons gesperrt) und Rückfragen (Leeren 2×, Ablauf nach 3,5 s, Reset ohne Rückfrage auf gelöstem Würfel).
- `i18n`: `en-US` → „Solve“, Fußzeile EN; Fehlermeldung wird beim Umschalten neu übersetzt; Wahl bleibt nach Reload; kein H-Scroll bei 375 px; keine Konsolenfehler (in allen Dateien geprüft).

- [ ] Step 1: `npm install --save-dev --save-exact playwright@1.63.0`; scripts anpassen; `npm test` → 60 PASS
- [ ] Step 2: `e2e/server.js`, `e2e/helpers.js`, vier e2e-Dateien schreiben
- [ ] Step 3: `npm run e2e` → alle PASS (gegen unveränderten Code). Gegenprobe: in `src/stepper.js` die Zeile `if (getSolution() !== sol || sol.step !== from) return false;` testweise entfernen → mindestens ein e2e-Test FAIL; zurücksetzen.
- [ ] Step 4: Workflow ergänzen; YAML parsen (`python3 -c "import yaml;…"`)
- [ ] Step 5: Commit `test: browser e2e suite for the 2x2 and CI job`

### Task 2: N×N-Engine

**Files:** Create `src/engine/geometry.js`, `src/engine/facelets.js`, `test/engine.test.js`

**Interfaces (Produces):**
- `FACES = ['U','R','F','D','L','B']`, `FACE_NORMALS` (wie heute), `OPPOSITE_FACE = {U:'D', D:'U', R:'L', L:'R', F:'B', B:'F'}`
- `createGeometry(n) -> { n, stickers: {position, normal}[6n²], cubies: [x,y,z][] }` – Koordinaten in −(n−1)…(n−1), Schritt 2; `cubies` nur äußere Steine (mind. eine Koordinate = ±(n−1)).
  Sticker-Position je Seite (r = Zeile, c = Spalte, m = n−1):
  `U: (−m+2c, m, −m+2r)` · `R: (m, m−2r, m−2c)` · `F: (−m+2c, m−2r, m)` · `D: (−m+2c, −m, m−2r)` · `L: (−m, m−2r, −m+2c)` · `B: (m−2c, m−2r, −m)`
- `inLayer(position, face, n)` – Koordinate entlang der Außennormale = n−1
- `rotation(move) -> {axis, degrees}`: Achse U/D→y, R/L→x, F/B→z; `degrees = −90 · turns · s`, s = +1 für U/R/F, −1 für D/L/B
- `rotateVec`, `cssRotate` (aus heutigem `src/geometry.js` übernommen)
- `createMoveSet(n) -> { moves: Move[18], perm(move) -> Int16Array, apply(facelets, move), applyAll(facelets, moves) }` – `perm[j] = i` heißt: neues Feld j kommt von altem Feld i.
- `moveToString`, `parseMoves(str)` für `U D L R F B` + `'`/`2` (in `facelets.js`)
- `src/geometry.js` wird zu einem dünnen Wrapper auf `createGeometry(2)` (bestehende Importe bleiben gültig).

**Acceptance Criteria:**
- `stickers unique and on their face` für n = 2, 3, 4 (Position·Normale = n−1).
- `n = 2 order unchanged`: `createGeometry(2).stickers` == heutige `STICKERS`.
- `each move ×4 is identity`, `X X' identity`, `perm is a bijection` für n = 2, 3, 4 und alle 18 Züge.
- `engine matches 2x2 model`: für U/R/F und 200 Zufallsfolgen `apply(toFacelets(SOLVED), …)` == `toFacelets(applyMoves(SOLVED, …))`.
- `D is U' seen from below`: für n = 3 gilt `apply(f, D)` dreht die untere Zeile von F nach R (Feld F[2][*] → R[2][*]) – Spot-Check der Richtung für D, L, B: nach `L` stehen die U-Farben links (L-Schicht) auf F; nach `B` stehen die R-Farben (rechte Spalte) auf U.
- `parseMoves` Round-Trip für alle 18 Züge.

- [ ] Step 1: Tests schreiben → FAIL; Step 2: implementieren → PASS; Step 3: `npm run e2e` grün; Step 4: Commit `feat: NxN facelet engine`

### Task 3: Puzzle-Module, 3x3-Modell, Prüfung, Mischen

**Files:**
- Create: `src/puzzles/cube3.js`, `src/puzzles/cube2.js`, `src/puzzles/index.js`, `test/cube3.test.js`, `test/puzzles.test.js`
- Modify: `src/scramble.js` (`randomScramble(length = 12, rng = Math.random, faces = ['U','R','F'])`; zusätzlich: wenn vorletzter Zug Seite X und letzter die Gegenseite von X war, ist X verboten), `test/scramble.test.js`
- Modify: `src/cube.js` (`colorCount`-Params um `expected: 4` ergänzen), `src/messages.js` (Kanten-Positionen), `src/i18n.js`, `test/parse.test.js`

**cube3.js (Kociemba-Reihenfolge, 0-basiert):**
- `CORNER_FACELETS = [[8,9,20],[6,18,38],[0,36,47],[2,45,11],[29,26,15],[27,44,24],[33,53,42],[35,17,51]]` (URF UFL ULB UBR DFR DLF DBL DRB)
- `CORNER_COLORS` wie 2x2; `EDGE_FACELETS = [[5,10],[7,19],[3,37],[1,46],[32,16],[28,25],[30,43],[34,52],[23,12],[21,41],[50,39],[48,14]]` (UR UF UL UB DR DF DL DB FR FL BL BR); `EDGE_COLORS = [[U,R],[U,F],[U,L],[U,B],[D,R],[D,F],[D,L],[D,B],[F,R],[F,L],[B,L],[B,R]]`; `CENTERS = [4,13,22,31,40,49]`
- `SOLVED3 = {cp:[0..7], co:[0×8], ep:[0..11], eo:[0×12]}`
- `toFacelets3(state, scheme = DEFAULT_SCHEME)`; Mitten = `scheme[face]`
- `parse3(facelets)` → Codes gemäß Spec in dieser Reihenfolge: `incomplete`, `colorCount {color,count,expected:9}`, `centers`, `cornerImpossible|cornerOrder {position,colors}`, `edgeImpossible {position,colors}`, `duplicateCorner`, `duplicateEdge`, `twistedCorner`, `flippedEdge`, `parity`
  - `centers` ok, wenn 6 verschiedene Farben, `scheme[OPPOSITE_FACE[f]] === OPPOSITE_COLOR[scheme[f]]` und `(scheme.U, scheme.R, scheme.F)` eine zyklische Drehung einer Standard-Ecken-Farbfolge ist (`CORNER_COLORS` mit `DEFAULT_SCHEME`).
  - Parität: Anzahl Inversionen von `cp` und `ep` müssen gleich modulo 2 sein.
- Züge im Modell: `MOVE_CUBIES[m] = parse3(engine.apply(toFacelets3(SOLVED3), m)).state`; `applyMove3(s, m)`: `cp[i]=s.cp[m.cp[i]]`, `co[i]=(s.co[m.cp[i]]+m.co[i])%3`, `ep[i]=s.ep[m.ep[i]]`, `eo[i]=(s.eo[m.ep[i]]+m.eo[i])%2`.

**Puzzle-Schnittstelle (`src/puzzles/index.js`):** `PUZZLES = { '2x2': cube2, '3x3': cube3 }`, `PUZZLE_IDS = ['2x2','3x3']`; jedes Modul `{ id, size, moveFaces, solvedFacelets(), parse(f), scramble(rng), solve? }`. cube2: `moveFaces ['U','R','F']`, `scramble` 12 Züge, `solve` über `createSolver()` (lazy, einmalig). cube3: alle sechs Seiten, `scramble` 20 Züge, **kein** `solve`.

**i18n-Schlüssel (neu, DE/EN):** `size.label`, `move.face.D|L|B`, `edge.UR…BR` (z. B. „oben-rechts“ / „top-right“), `error.centers`, `error.edgeImpossible`, `error.duplicateEdge`, `error.flippedEdge`, `error.parity`, `msg.validNoSolver`; `error.colorCount` mit `{expected}`.

**Acceptance Criteria:**
- Round-Trip `parse3(toFacelets3(s))` für 50 Mischungen (mit Engine erzeugt).
- `model matches engine`: für alle 18 Züge und 200 Folgen `toFacelets3(applyMoves3)` == `engine.applyAll`.
- gelöster Würfel mit Schema Gelb oben/Blau vorne → ok und gelöst.
- je ein Test pro Fehlercode (u. a.: zwei Kanten-Sticker getauscht → `flippedEdge`; zwei Kanten vertauscht → `parity`; Mitten U/D vertauscht → `centers`); DE- und EN-Meldung je Code.
- 2x2-Meldung unverändert: „Weiß kommt 3× vor (erwartet: 4×).“
- Mischen: 3x3 Länge 20, keine gleiche Seite hintereinander, nie `X, Gegenseite(X), X`; 2x2-Tests unverändert grün.
- `puzzles.test.js`: beide Module erfüllen die Schnittstelle; `solvedFacelets()` wird von `parse` als gelöst erkannt.
- `i18n.test.js` ergänzt: Schlüssel, die auf `Html` enden, enthalten keine `{…}`-Platzhalter (Sicherheitsregel aus der Spec).

- [ ] Step 1: Tests → FAIL; Step 2: implementieren → PASS; Step 3: `npm run e2e` grün; Step 4: Commit `feat: 3x3 model, validation and puzzle modules`

### Task 4: Views auf N umbauen (nur 2x2 aktiv)

**Files:** Modify `src/views/net-view.js` (Option `n`, Seitenstart `faceIndex*n²`, CSS-Variable `--n`), `src/views/cube3d-view.js` (Option `n`; Geometrie aus `createGeometry(n)`; `--s = var(--cube) / n`; Pfeil/Zähler auf `var(--cube)/2 + 3px`; `inLayer(…, n)`; `rotation` mit D/L/B), `style.css` (`--cell` aus `--n` berechnet, mind. 18 px), `src/app.js` (Views über `PUZZLES['2x2']` erzeugen)

**Acceptance Criteria:** Für den Nutzer keine sichtbare Änderung beim 2x2: `npm run e2e` vollständig grün; Screenshot 1280/375 gleicht dem bisherigen Layout. Zusätzlicher Unit-Test nicht nötig (Geometrie in Task 2 getestet).

- [ ] Step 1: Umbau; Step 2: `npm test` + `npm run e2e` grün; Step 3: Commit `refactor: views take cube size n` (**sicherer Zwischenstand**)

### Task 5: Größenwahl und 3x3 in der Oberfläche

**Files:** Modify `index.html` (Umschalter `<div class="size-switch" role="group">` mit Buttons `data-size="2x2|3x3"`), `src/app.js`, `style.css`, `src/step-text.js` (D/L/B), Create `src/size.js` + `test/size.test.js`, Create `e2e/sizes.e2e.js`

**Interfaces:** `src/size.js`: `SIZE_KEY = 'cube-solver-size'`, `pickSize({hash, stored}) -> '2x2'|'3x3'` (Hash gewinnt, dann gespeicherter Wert, sonst `'3x3'`; nur Allowlist), `sizeFromHash(hash) -> id|null`.

**Verhalten:** Zustand je Größe `{ input, solution }`; Wechsel: Player pausieren, laufende Animation abbrechen (`render()`), Confirms zurücksetzen, Views mit neuem `n` in **neuem** Container-Element neu erzeugen (keine doppelten Listener), Hash setzen (`history.pushState` nur bei Nutzerklick; `hashchange` → Wechsel), Größe speichern (try/catch). „Lösen“ ohne `solve`: bei gültiger Eingabe `msg.validNoSolver`, sonst Fehlermeldung. Mischen/Zurücksetzen/Leeren/Rückfragen nutzen das aktive Puzzle.

**Acceptance Criteria:**
- Unit: `pickSize` – `#3x3` → 3x3; `#4x4` + stored `2x2` → 2x2; nichts → 3x3; stored `<img>` → 3x3.
- e2e: erster Besuch → 3x3 (54 Felder, 26 Steine); `#2x2` in URL → 2x2; Umschalten setzt Hash, Zurück-Taste wechselt zurück; 3x3-Eingabe bleibt nach 2x2-Ausflug erhalten; 3x3 Rot 10× → „Rot kommt 10× vor (erwartet: 9×).“; gültiger 3x3 → „Gültiger Würfel – der 3x3-Solver folgt.“; Mischen 3x3 → 20 Züge, 3D == Netz; Sprachwechsel übersetzt alles inkl. Größen-Label; kein H-Scroll bei 360 und 375 px; keine Konsolenfehler; alle bisherigen e2e grün (laufen mit `#2x2`).

- [ ] Step 1: `size.test.js` → FAIL → `size.js` → PASS; Step 2: UI; Step 3: `e2e/sizes.e2e.js`; Step 4: `npm test` + `npm run e2e` grün; Step 5: Commit `feat: size switch 2x2/3x3 with per-size state`

### Task 6: Kamera für verdeckte Seiten

**Files:** Create `src/engine/camera.js`, `test/camera.test.js`; Modify `src/views/cube3d-view.js`; Create `e2e/camera.e2e.js`

**Interfaces:** `DEFAULT_CAMERA = {x:-25, y:-35}`, `FACE_VIEWS = { U, R, F: DEFAULT_CAMERA, D:{x:25,y:-35}, L:{x:-25,y:35}, B:{x:-25,y:145} }`, `isFaceVisible(face, camera) -> boolean` (Außennormale in CSS-Koordinaten (y gespiegelt) erst um `rotateY(camera.y)`, dann `rotateX(camera.x)` drehen; sichtbar, wenn z > 0.1).

**Verhalten in cube3d-view:** `showHint(move)` und `showMove`: ist `move.face` nicht sichtbar → vorherigen Blickwinkel merken (falls noch keiner gemerkt), Kamera per 300-ms-Transition auf `FACE_VIEWS[face]`. `showHint(next)`: gibt es einen gemerkten Blickwinkel und ist `next` darin sichtbar oder `null` → zurückdrehen und vergessen; sonst stehen bleiben. Ziehen durch den Nutzer verwirft den gemerkten Blickwinkel. reduced motion: ohne Transition.

**Acceptance Criteria:**
- Unit: Default → U, R, F sichtbar, D, L, B nicht; `isFaceVisible(f, FACE_VIEWS[f])` für alle sechs; Kamera `{x:-25,y:145}` → B sichtbar, F nicht.
- e2e (2x2 kann nur U/R/F lösen, 3x3 noch gar nicht – daher über **Mischen** im 3x3): während einer 3x3-Mischung wird für jeden Zug auf D/L/B die Kamera so gestellt, dass die Seite sichtbar ist (Stichprobe: Kamera-Transform während eines D/L/B-Zugs ≠ Default); nach Ende der Mischung steht die Kamera wieder auf Default. (Das Mischen ruft dafür vor jedem Zug `showHint(move)` und danach `showHint(null)` auf.)
- Die Folgezug-Logik wird als reine Funktion getestet (nächster Punkt), nicht per e2e.
- `nextCameraAction(saved, current, nextFace) -> {camera, saved}` als reine Funktion mit Tests für: sichtbar/kein saved → keine Änderung; verdeckt → FACE_VIEWS + saved; saved & nächster sichtbar im saved → zurück; saved & nächster verdeckt im saved → FACE_VIEWS[next], saved bleibt.

- [ ] Step 1: Unit-Tests → FAIL → `camera.js` → PASS; Step 2: Integration; Step 3: e2e; Step 4: alles grün; Step 5: Commit `feat: rotate the camera to hidden faces`

### Task 7: Texte, README, Review

**Files:** Modify `README.md` (Größenwahl, 3x3-Prüfung, e2e-Tests `npm run e2e`, Repos-Regel), `src/i18n.js`:
- `app.title` / `meta.title`: „Würfel-Löser“ / „Cube Solver“ (Branch ist nicht live; B ergänzt die Lösungslänge).
- `app.lead` größenneutral: „Färbe das Netz wie deinen Würfel ein und drücke „Lösen“.“ / „Colour the net like your cube and press “Solve”.“ – der Hinweis „höchstens 11 Züge“ entfällt hier.

- [ ] Step 1: Texte + README; `npm test` + `npm run e2e` grün; Commit `docs: README and texts for 2x2/3x3`
- [ ] Step 2: frischer Reviewer (stärkstes Modell) über `git diff main..feature/nxn-foundation` mit Spec + Plan; Critical/Important per TDD/e2e fixen; Minor auflisten
- [ ] Step 3: Push Branch (kein Merge)
