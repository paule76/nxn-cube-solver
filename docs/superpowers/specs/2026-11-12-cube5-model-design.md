# Teilprojekt E1: 5x5-Modell und Darstellung – Design

Teil von E (5x5): **E1 Modell & Darstellung** → E2 Reduktions-Solver (Ansatz A: Mitten in Stufen mit Tabellen,
Kanten gierig paaren, Kanten-Parität, Kociemba). Baut auf A (N×N-Grundlage), B (3x3) und D (4x4) auf.

## Ziel
Nach E1 kann man den 5x5 wählen, eingeben, prüfen lassen, mischen und Züge (inkl. Doppelschicht-Züge)
animiert ansehen. Lösen folgt in E2.

## Auslieferung
- Branch `feature/cube5-model` (von `main`). **Kein Merge nach `main` vor Abschluss von E2** (wie bei D).
- 2x2/3x3/4x4-Verhalten unverändert; alle bestehenden Unit- und e2e-Tests bleiben grün.

## Rahmen
- Keine Abhängigkeiten in der ausgelieferten Seite, kein Build. Texte DE + EN.

## Züge (Engine)
- Die N×N-Engine kann n = 5 schon: `movesFor(5)` = 36 Züge (18 × depth 1, 18 × depth 2), WCA-Notation `R`, `Rw`.
- Tiefe 2 reicht: Mit Zügen bis Tiefe 2 von allen Seiten bleibt die mittlere Schicht jeder Achse stehen –
  die 6 festen Mittelfelder bleiben also immer an ihrem Platz. `3Rw` und Mittelschicht-Züge werden nicht angeboten.

## 5x5-Modell (`src/puzzles/cube5.js`)
- **Feld-Reihenfolge** wie bisher: U R F D L B, je 25 Felder zeilenweise in Netz-Leserichtung (150 Felder).
- **Farbschema** aus den **6 festen Mittelfeldern** (wie 3x3); ungültige Mitten → `centers`.
- **Ecken (8):** wie 3x3 (Position + Drehung).
- **Mittelkanten (12)**, das mittlere Stück jeder Kante: wie 3x3-Kanten (Position + Kippung).
- **Kantenstücke (24)**, die äußeren Stücke jeder Kante: wie 4x4 (feste Lage, jedes genau einmal).
- **Mittelsteine:** 24 x-Mitten (diagonal) und 24 t-Mitten (an den Seitenmitten), zwei getrennte Gruppen;
  je Farbe genau 4 von jeder Art, gleichfarbige austauschbar.
- Zustand: `{ cp, co, mp, mo, wp, xc, tc }`.

### Prüfung (erste Verletzung gewinnt; Meldungen DE/EN mit Stelle)
| Code | Bedeutung |
|---|---|
| `incomplete` | nicht alle 150 Felder gefärbt |
| `colorCount` | Farbe ≠ 25× (`expected: 25`) |
| `centers` | feste Mittelfelder passen nicht (wie 3x3) |
| `cornerOrder` / `cornerImpossible` / `duplicateCorner` | wie 3x3 |
| `edgeImpossible` / `duplicateEdge` | Mittelkante wie 3x3 |
| `edgeImpossible` / `duplicateEdge4` | Kantenstück wie 4x4 (Spiegel-Hinweis) |
| `centerCount` (neu) | eine Farbe hat nicht genau 4 x-Mitten und 4 t-Mitten (`color`, `kind`) |
| `twistedCorner` / `flippedEdge` / `parity` | wie 3x3 (Ecken-Drehung, Mittelkanten-Kippung, Ecken- vs. Mittelkanten-Vertauschung) |

Weitere Bedingungen gibt es nicht (Kantenstücke: jede Anordnung erreichbar; gleichfarbige Mitten austauschbar),
daher ist jede Eingabe, die alle Prüfungen besteht, lösbar. Das prüft ein Test (Hin-und-Rück über Mischungen).

### Mischen
- 60 Zufallszüge (WCA-Länge) aus allen 36 Zügen; nie zweimal hintereinander dieselbe Seite; nie „X, Gegenseite, X“.

## Oberfläche
- Größenwahl **2x2 | 3x3 | 4x4 | 5x5**, Hash `#5x5`, Zustand je Größe (wie bisher).
- Netz mit 5×5 Feldern je Seite; auf 375-px-Handys ca. 11 px pro Feld (bewusst so; eine Zoom-Ansicht zum
  Einfärben einer Seite ist ein späterer, eigener Punkt); kein horizontales Scrollen bei 360 px (Größenwahl mit
  vier Knöpfen passt auch).
- 3D-Würfel mit 98 Steinen; Doppelschicht-Pfeil, Halbe-Drehung-Zähler und Kamera wie beim 4x4.
- „Lösen“ beim 5x5 (bis E2): gültige Eingabe → „Gültiger Würfel – der 5x5-Solver folgt.“ /
  “Valid cube – the 5x5 solver is coming soon.”; gelöst → „Schon gelöst!“.
- Einleitung/Meta-Beschreibung nennen den 5x5 erst mit E2.

## Tests
**Unit:**
- Engine n = 5: 36 Züge; jeder ×4 = Identität; die 6 festen Mittelfelder bleiben bei allen Zügen stehen.
- 5x5-Modell: für alle 36 Züge und 200 Zufallsfolgen liefert das Modell dieselben Felder wie die Engine;
  Hin-und-Rück für 50 Mischungen; gelöster Würfel in anderer Haltung (andere feste Mitten oben/vorne) → gelöst;
  je ein Testfall pro Fehlercode (DE- und EN-Meldung), insbesondere `centerCount` (x-Mitte der einen und t-Mitte einer anderen Farbe
  vertauscht: Farbanzahl 25 stimmt, trotzdem Fehler).
- Mischen 5x5: Länge 60, Regeln eingehalten.

**e2e:**
- `#5x5`: 150 Felder, 98 Steine; Wechsel 4x4 ↔ 5x5 behält Eingaben.
- Mischen 5x5 → 60 Züge, 3D == Netz.
- Fehlermeldung (z. B. Farbe 24×) und „Gültiger Würfel – der 5x5-Solver folgt.“
- Doppelschicht-Animation: während `Rw` sind genau 41 Steine gedreht (25 der äußeren + 16 der zweiten Schicht).
- Kein H-Scroll bei 360 px (DE und EN); keine Konsolenfehler; alle bisherigen e2e grün.

## Nicht im Umfang
5x5-Solver (E2), echte Zufallszustände 5x5, `3Rw`/Mittelschicht-Züge in der Oberfläche, Zoom-Ansicht zum
Einfärben, 6x6 und größer.
