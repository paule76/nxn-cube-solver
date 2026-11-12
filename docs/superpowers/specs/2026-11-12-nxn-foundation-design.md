# Teilprojekt A: N×N-Grundlage + 3x3-Modell – Design

Teil der Gesamtplanung A → B → C → D:
- **A (dieses Dokument):** N×N-Engine, Darstellung für beliebiges N, 3x3-Eingabe/-Prüfung/-Mischen, Größenwahl.
- B: eigener 3x3-Solver „kurz“ (Kociemba, ~20 Züge).
- C: 3x3 „erklärt“ (Anfänger-Methode) + Umschalter kurz/erklärt.
- D: 4x4 und größer (später, eigenes Projekt).

## Ziel
Nach A kann man zwischen 2x2 und 3x3 wechseln, einen 3x3 eingeben, prüfen lassen,
zufällig mischen und Züge animiert ansehen. Der 2x2 funktioniert unverändert weiter
(inklusive optimalem Solver). Der 3x3 kann noch nicht gelöst werden.

## Auslieferung
- Entwicklung auf Branch `feature/nxn-foundation` im Repo `paule76/nxn-cube-solver`.
- **Kein Merge nach `main` vor Abschluss von Teilprojekt B** (Live-Seite bleibt bis dahin der 2x2).
- Prüfung von A lokal (Tests + Playwright + Screenshots).

## Rahmen
- Die **ausgelieferte Seite** bleibt ohne Abhängigkeiten und ohne Build; fremder Code wird nicht übernommen.
- Playwright wird **Entwicklungs-Abhängigkeit** (feste Version, `package-lock.json`) für `e2e/`-Tests;
  der Deploy kopiert weiterhin nur `index.html`, `style.css`, `src/`.
- Alle neuen Texte auf Deutsch und Englisch (`src/i18n.js`, Schlüsseltest muss grün bleiben).
- 2x2-Verhalten, -Tests und -Browserchecks bleiben unverändert grün.

## Architektur

```
src/
  engine/  geometry.js  – Sticker-Positionen/Normalen und Schichten für beliebiges N
           facelets.js  – Züge als Feld-Permutationen (aus der Geometrie erzeugt), anwenden, Notation
  puzzles/ cube2.js     – 2x2: Prüfung + Solver (nutzt bestehendes cube.js / solver.js)
           cube3.js     – 3x3: Ecken/Kanten-Modell, Prüfung, Mischen
           index.js     – PUZZLES: { '2x2': cube2, '3x3': cube3 }
  views/   net-view.js, cube3d-view.js – mit Parameter N
  app.js   – Größenwahl, Zustand je Größe, Hash #2x2 / #3x3
```

### Feld-Reihenfolge (alle Größen)
Seiten in der Reihenfolge U, R, F, D, L, B; je Seite N×N Felder zeilenweise in
Netz-Leserichtung (wie heute beim 2x2: U mit B oben, R/F/L/B mit U oben, D mit F oben,
B von hinten gesehen). Index = `faceIndex * N² + row * N + col`. Für N = 2 identisch
mit der heutigen Reihenfolge.

### Engine
- `createGeometry(n)` → `{ n, stickers: {position, normal}[6n²], cubies: position[] }`.
  Koordinaten wie heute (x → R, y → U, z → F), Positionen in Einheiten von −(n−1)…(n−1) in Zweierschritten.
- `layerOf(position, face, depth = 1)` – Steine der äußeren Schicht einer Seite (depth für spätere innere Schichten).
- `createMoveSet(n)` → für jede Seite U D L R F B und Drehung 1, 2, −1 eine Feld-Permutation;
  `applyMove(facelets, move)`, `applyMoves`. Rotation: Uhrzeigersinn mit Blick auf die Seite
  (−90° um die Außennormale; bestehende CSS-Umrechnung `cssRotate` bleibt).
- Notation: `U D L R F B` mit `'` und `2`; `parseMoves`, `moveToString` für alle sechs Seiten.

### Puzzle-Schnittstelle
```
{
  id: '2x2' | '3x3',
  size: number,
  moveFaces: string[],                 // für Mischen/Lösen, 2x2: ['U','R','F'], 3x3: alle sechs
  solvedFacelets(): string[],          // Standardschema
  parse(facelets) -> { ok: true, state, scheme } | { ok: false, code, params },
  scramble(rng?) -> Move[],            // 2x2: 12 Züge (wie heute), 3x3: 20 Züge
  solve?: (state) -> Move[],           // 2x2 vorhanden, 3x3 erst in B
}
```
Fehlt `solve`, meldet „Lösen“ nach erfolgreicher Prüfung „Gültiger Würfel – der 3x3-Solver
folgt.“ (nur auf dem Branch sichtbar).

## Oberfläche
- Umschalter **2x2 | 3x3** über dem Netz (Stil wie Sprachumschalter, `aria-pressed`).
- Adresse: `#2x2` / `#3x3`; Browser-Zurück wechselt die Größe (`hashchange`).
  Ohne Hash: zuletzt gewählte Größe (localStorage `cube-solver-size`), beim ersten Besuch 3x3.
- Zustand je Größe: Eingabe, Lösung, Schritt bleiben beim Wechsel erhalten.
  Beim Wechsel: Autoplay stoppt, laufende Animation wird abgebrochen, offene Rückfragen zurückgesetzt.
- Netz: Kreuz-Layout mit N×N Feldern; Feldgröße passt sich an (3x3: min. ~22 px), kein
  horizontales Scrollen bei 360 px. Mittelsteine beim 3x3 sind normale, einfärbbare Felder.
- 3D-Würfel: alle äußeren Steine (3x3: 26), Größe skaliert mit N; Pfeil, Halbdrehungs-Zähler
  und Animation für alle sechs Seiten.
- Verdeckte Seiten: Maßgeblich ist die **tatsächliche Sichtbarkeit** aus dem aktuellen
  Blickwinkel (aus den Kamerawinkeln berechnet, als reine Funktion getestet).
  - Seite sichtbar → keine Kameradrehung.
  - Seite verdeckt → Kamera dreht animiert auf einen festen Blickwinkel je Seite
    (z. B. D: schräg von unten vorne), danach zurück zum **vorherigen** Blickwinkel
    (Standard oder selbst gewählt).
  - Folgen mehrere Züge auf verdeckten Seiten (Autoplay), bleibt die Kamera dazwischen stehen.
- Zugtexte ergänzt: untere / linke / hintere Seite (DE) bzw. bottom / left / back face (EN).
- Mischen 3x3: 20 Züge über alle Seiten; nie zweimal dieselbe Seite hintereinander und keine
  Folge „X, Gegenseite, X“ (z. B. `R L R`).

## Prüfung 3x3 (Reihenfolge, erste Verletzung gewinnt)
| Code | Bedeutung | Params |
|---|---|---|
| `incomplete` | nicht alle 54 Felder gefärbt | – |
| `colorCount` | Farbe ≠ 9× | `color, count, expected: 9` |
| `centers` | Mitten nicht 6 verschiedene Farben, Gegenpaare (W/Y, G/B, R/O) falsch oder gespiegelt | – |
| `cornerOrder` / `cornerImpossible` | wie 2x2 | `position, colors` |
| `edgeImpossible` | Kante mit unmöglichen Farben | `position, colors` |
| `duplicateCorner` / `duplicateEdge` | Stein doppelt | – |
| `twistedCorner` | Summe Ecken-Orientierung ≠ 0 mod 3 | – |
| `flippedEdge` | Summe Kanten-Orientierung ≠ 0 mod 2 | – |
| `parity` | Permutationsparität Ecken ≠ Kanten | – |

- Die Mittelsteine bestimmen das Farbschema (Würfel darf beliebig gehalten sein).
- `colorCount` erhält `expected`, damit dieselbe Meldung für 2x2 (4×) und 3x3 (9×) funktioniert.
- Kantennamen: UR, UF, UL, UB, DR, DF, DL, DB, FR, FL, BL, BR (Kociemba-Reihenfolge),
  übersetzt z. B. „oben-rechts“ / „top-right“.
- Modell: `cp, co` (8 Ecken) und `ep, eo` (12 Kanten) in Kociemba-Reihenfolge; Grundlage für B.

## Tests
- Engine: für N = 2, 3, 4 ist jeder Zug viermal Identität, `X X'` Identität; Permutationen sind bijektiv.
- Engine vs. 2x2-Modell: für alle U/R/F-Züge und 200 Zufallsfolgen identische Felder.
- Engine vs. 3x3-Modell: für alle 18 Züge und 200 Zufallsfolgen `toFacelets(applyMoves(model))`
  == `engine.applyMoves(facelets)`.
- 3x3 `parse`: Hin-und-Rück für 50 Zufallsmischungen; gelöster Würfel in anderer Haltung → gelöst;
  je ein Testfall pro Fehlercode; deutsche und englische Meldung je Code.
- Mischen 3x3: Länge 20, keine gleiche Seite hintereinander, kein „X, Gegenseite, X“, deterministisch mit festem rng.
- Playwright: Größenwechsel inkl. `#3x3` und Zurück-Taste; Zustand bleibt je Größe erhalten;
  3x3 einfärben, Fehlermeldungen; Mischen 3x3 → 3D == Netz; Animation auf D/L/B mit Kameradrehung;
  beide Sprachen; kein H-Scroll bei 375 px; keine Konsolenfehler; alle bisherigen 2x2-Checks grün.

## Sicherheit
- Hash (`#2x2`/`#3x3`) und localStorage-Werte (Größe, Sprache) werden nur gegen die Liste
  bekannter Werte geprüft; unbekannte Werte werden ignoriert und nie ins DOM geschrieben.
- `innerHTML` bleibt auf `*Html`-Wörterbuchschlüssel beschränkt; ein Test stellt sicher,
  dass diese Schlüssel keine Platzhalter enthalten.

## Repos
- `2x2-cube-solver` wird eingefroren: nur noch kritische Fehlerbehebungen, die per
  `cherry-pick` auch in `nxn-cube-solver` übernommen werden. Neue Funktionen nur hier.
- Nach Livegang von B: Hinweis auf der 2x2-Seite und in deren README auf die neue Version
  (eine spätere Weiterleitung auf `#2x2` wird dann entschieden).

## Reihenfolge der Umsetzung
1. e2e-Tests (Playwright) ins Repo, sichern den heutigen 2x2-Stand ab; auch in GitHub Actions.
2. N×N-Engine mit Abgleich gegen das 2x2-Modell.
3. 3x3-Modell, Prüfung, Mischen (reine Logik mit Tests).
4. Netz und 3D-Ansicht auf N umbauen, zunächst nur 2x2 – e2e bleibt grün (sicherer Zwischenstand).
5. Größenwahl, Hash, Zustand je Größe, 3x3 in der Oberfläche.
6. Kameradrehung für verdeckte Seiten.
7. Texte, README, abschließender Review durch frischen Reviewer.

## Nicht im Umfang
3x3-Solver (B), echte Zufallszustände beim Mischen (B, braucht den Solver), Anfänger-Methode (C), 4x4+ und innere Schichten in der Oberfläche (D),
Einfärben direkt am 3D-Würfel.

## Stress Test Results: Teilprojekt A

### Resolved Decisions
- Kameradrehung: nach tatsächlicher Sichtbarkeit, Rückkehr zum vorherigen Blickwinkel, kein Hin-und-her bei Folgezügen.
- Repos: 2x2 eingefroren, Fixes per cherry-pick, Neues nur in nxn; Hinweis nach B.
- Mischen: 20 Zufallszüge in A; echte Zufallszustände in B.
- Regression: e2e-Tests (Playwright, devDependency) als erste Aufgabe, auch in CI.
- Sicherheit: Hash/localStorage gegen Allowlist; innerHTML nur für platzhalterfreie `*Html`-Schlüssel; Playwright gepinnt, nicht ausgeliefert.
- Umfang: 7 getrennt testbare Schritte, sicherer Zwischenstand nach Schritt 4, Review am Ende.

### Changes Made
- Regel „keine Abhängigkeiten“ präzisiert (gilt für die ausgelieferte Seite).
- Abschnitte Sicherheit, Repos, Reihenfolge ergänzt; Kameraregel präzisiert.

### Deferred / Parking Lot
- Echte Zufallszustände beim Mischen → B.
- Performance großer Würfel (5x5: 98 Steine) auf älteren Handys → D.
- Weiterleitung der 2x2-Seite → nach B entscheiden.

### Confidence Assessment
- Overall: High
- Areas of concern: Umbau der 3D-Ansicht (Animation/Fokus/Ziehen) – abgefedert durch e2e-Tests vor dem Umbau.
