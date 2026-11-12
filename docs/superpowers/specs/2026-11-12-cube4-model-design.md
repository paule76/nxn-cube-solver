# Teilprojekt D1: 4x4-Modell und Darstellung – Design

Teil von D (4x4): **D1 Modell & Darstellung** → D2 Reduktions-Solver. Baut auf A (N×N-Grundlage) und B (3x3-Solver) auf.

## Ziel
Nach D1 kann man den 4x4 wählen, eingeben, prüfen lassen, mischen und Züge (inkl. Doppelschicht-Züge)
animiert ansehen. Lösen folgt in D2.

## Auslieferung
- Branch `feature/cube4-model` (von `main`). **Kein Merge nach `main` vor Abschluss von D2.**
- 2x2/3x3-Verhalten unverändert; alle bestehenden Unit- und e2e-Tests bleiben grün.

## Rahmen
- Keine Abhängigkeiten in der ausgelieferten Seite, kein Build. Texte DE + EN.

## Züge mit Schichttiefe (Engine)
- Zug-Objekt: `{ face, turns, depth }`; `depth = 1` äußere Schicht (bisheriges Verhalten),
  `depth = 2` äußere + innere Schicht. Fehlt `depth`, gilt 1 (bestehende Züge bleiben gültig).
- Notation (WCA): `R R2 R'` (depth 1), `Rw Rw2 Rw'` (depth 2); gilt für U D L R F B.
- `createMoveSet(n)` liefert für n = 4 alle 36 Züge (18 × depth 1, 18 × depth 2); für n = 2, 3 weiterhin 18.
- Schicht-Zugehörigkeit: Koordinate entlang der Außennormale ≥ n − 1 − 2·(depth − 1).
- 3D-Animation dreht alle Steine der betroffenen Schichten.

## 4x4-Modell (`src/puzzles/cube4.js`)
- **Feld-Reihenfolge** wie bisher: U R F D L B, je 16 Felder zeilenweise in Netz-Leserichtung.
- **Ecken (8):** gleiche Logik wie 2x2; das Farbschema wird aus der Ecke DBL (hinten-unten-links) abgeleitet,
  der Würfel darf beliebig gehalten werden.
- **Kantenstücke (24):** je zwei pro Kante; ein Kantenstück hat in seinem Platz eine feste Lage
  (nicht kippbar). Jedes der 24 Kantenstücke muss genau einmal vorkommen.
- **Mittelsteine (24):** je 4 pro Farbe, gleichfarbige austauschbar.
- Zustand: `{ cp, co, wp, cf }` – Ecken-Permutation/-Orientierung, Kantenstück-Permutation, Mittelfeld-Farben.

### Prüfung (erste Verletzung gewinnt; Meldungen DE/EN mit Stelle)
| Code | Bedeutung |
|---|---|
| `incomplete` | nicht alle 96 Felder gefärbt |
| `colorCount` | Farbe ≠ 16× (`expected: 16`) |
| `cornerOrder` / `cornerImpossible` / `duplicateCorner` / `twistedCorner` | wie 2x2 |
| `edgeImpossible` | Kantenstück mit unmöglichen Farben (`position`, `colors`) |
| `edgeMirrored` | richtige Farben, falsche Reihenfolge – Hinweis „evtl. gespiegelt eingegeben“ |
| `duplicateEdge` | Kantenstück doppelt |

Weitere Bedingungen gibt es nicht: Ecken-Orientierung ist die einzige Invariante (Kantenstücke
haben feste Lage, gleichfarbige Mitten sind austauschbar), daher ist jede Eingabe, die alle Prüfungen
besteht, lösbar.

### Mischen
- 40 Zufallszüge aus allen 36 Zügen; nie zweimal hintereinander dieselbe Seite;
  nie „X, Gegenseite, X“. (Echte Zufallszustände folgen mit D2.)

## Oberfläche
- Größenwahl **2x2 | 3x3 | 4x4**, Hash `#4x4`, Zustand je Größe (wie in A).
- Netz mit 4×4 Feldern je Seite; auf 375-px-Handys ca. 14 px pro Feld (bewusst, wie beim 3x3 entschieden);
  kein horizontales Scrollen bei 360 px.
- 3D-Würfel mit 56 Steinen; Pfeil zeigt für Doppelschicht-Züge zusätzlich „w“ bzw. eine Doppellinie
  (Unterscheidung `R` / `Rw` sichtbar), Zähler für halbe Drehungen und Kameradrehung zu verdeckten Seiten wie bisher.
- Zugtexte: „Rw – rechte zwei Schichten im Uhrzeigersinn“ / “Rw – right two layers clockwise”.
- „Lösen“ beim 4x4 (bis D2): gültige Eingabe → „Gültiger Würfel – der 4x4-Solver folgt.“ /
  “Valid cube – the 4x4 solver is coming soon.”; gelöst → „Schon gelöst!“.
- Solver-Anbindung (`src/solvers.js`) wird explizit je Größe; unbekannte Größe → kein Solver
  (statt Rückfall auf den 2x2-Solver, offener Punkt aus Review B).

## Tests
**Unit:**
- Engine n = 4: 36 Züge; jeder ×4 = Identität; `Rw` = `R` + innere Schicht (Vergleich über Feld-Permutationen);
  n = 2, 3 unverändert (18 Züge, bisherige Tests grün).
- Notation: Round-Trip aller 36 Züge; `Rw` ↔ `{face:'R', turns:1, depth:2}`.
- 4x4-Modell: für alle 36 Züge und 200 Zufallsfolgen liefert das Modell dieselben Felder wie die Engine;
  Hin-und-Rück für 50 Mischungen; gelöster Würfel in anderer Haltung → gelöst;
  je ein Testfall pro Fehlercode (DE- und EN-Meldung).
- Mischen 4x4: Länge 40, Regeln eingehalten.

**e2e:**
- `#4x4`: 96 Felder, 56 Steine; Wechsel 3x3 ↔ 4x4 behält Eingaben.
- Mischen 4x4 → 40 Züge, 3D == Netz.
- Fehlermeldung (z. B. Farbe 15×) und „Gültiger Würfel – der 4x4-Solver folgt.“
- Doppelschicht-Animation: während `Rw` sind genau 28 Steine gedreht (16 der äußeren + 12 der inneren Schicht).
- Kein H-Scroll bei 360 px; keine Konsolenfehler; alle bisherigen e2e grün.

## Nicht im Umfang
4x4-Solver (D2), echte Zufallszustände 4x4, einzelne innere Schichten (`r`, `2R`) in der Oberfläche,
5x5 und größer, Einfärben am 3D-Würfel.
