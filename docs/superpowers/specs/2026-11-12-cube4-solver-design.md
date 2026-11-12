# Teilprojekt D2: 4x4-Solver (Reduktion, gestufte Suche) – Design

Teil von D (4x4): D1 Modell & Darstellung → **D2 Solver**. Baut auf A, B (Kociemba) und D1 auf.

## Ziel
Ein beliebiger gültiger 4x4 wird gelöst. Die Lösung ist in Phasen gegliedert, meist 60–90 Züge,
berechnet im Hintergrund-Thread. Nach Abschluss gehen D1 und D2 gemeinsam live.

**Erfolg:** gültiger 4x4 → geprüfte Lösung (am Ausgangszustand angewandt → gelöst) in ≤ ~1,5 s;
Anzeige gegliedert in „Mitten / Kanten paaren / Parität / Wie ein 3x3 lösen“.

## Rahmen
- Eigener Code, keine Abhängigkeiten, kein Build; Node-testbar. Texte DE + EN.
- 2x2/3x3 unverändert; alle bestehenden Tests grün.
- Branch `feature/cube4-solver` (von `feature/cube4-model`). Merge nach `main` erst nach Review **und** Rückfrage.

## Ausrichtung
Das Farbschema kommt wie in D1 aus der Ecke DBL. Die Mitten werden so gelöst, dass jede Seite die
Farbe dieses Schemas trägt; die Haltung des Würfels ist egal.

## Phasen
Jede Suchphase: IDA* mit Ziel-Prädikat, erlaubter Zugmenge und eigener Pruning-Tabelle (BFS, im Worker
bei jedem Start berechnet; kein zusätzlicher Cache).

| Phase | Ziel | Züge | Tabelle |
|---|---|---|---|
| M1 | Mittelfelder der U- und D-Farbe liegen auf U oder D | alle 36 | Lage der 8 Felder unter 24 Mittelfeldern: C(24,8) = 735 471 |
| M2 | Mittelfelder der F- und B-Farbe liegen auf F oder B; M1 bleibt | Züge, die M1 erhalten (U, D, Uw, Dw, R2, L2, F2, B2, Rw2, Lw2, Fw2, Bw2 – Menge per Test bestätigt) | C(16,8) = 12 870 |
| M3 | jedes Mittelfeld auf seiner Seite | Züge, die M1 und M2 erhalten | Lage der 4 Felder je Farbe auf ihren beiden Seiten (klein) |
| K | alle 12 Kantenpaare gebildet, Mitten gelöst | iterativ: IDA* bis Tiefe 7 über alle 36 Züge nach einer Folge, die die Zahl der Paare erhöht und alle Mitten gelöst zurücklässt; Heuristik 0 (Tiefe begrenzt) | – |
| K* | Sonderfall letzte Kanten: findet die Iteration keine Verbesserung, wird ein fester Kantenpaar-Algorithmus (mit Aufstell-Zügen per Suche) eingesetzt | | – |
| P | reduzierter Würfel ist als 3x3 lösbar | OLL-Parität (einzelne gekippte Kante): fester Algorithmus; PLL-Parität (zwei vertauschte Kanten): fester Algorithmus; beide als Zugfolgen in WCA-Notation, per Test verifiziert | – |
| 3x3 | gelöst | Kociemba (B) auf dem reduzierten Würfel; 3x3-Zug X ↦ äußere 4x4-Schicht X | Tabellen aus B |

- Reduktion → 3x3: Ecken direkt, Kantenpaare als 3x3-Kanten, Mitten als feste 3x3-Mitten (Schema aus DBL).
- Kontrolle: jede Phase prüft ihr Ziel; die Gesamtlösung wird am Ausgangszustand geprüft
  (Engine n = 4). Fehler → Fehlermeldung (`msg.solverFailed`), nie eine falsche Lösung.
- Aufeinanderfolgende Züge derselben Seite und Tiefe werden zusammengefasst (wie `simplify` in B).

## Dateien
- `src/solver4/centers.js` – M1–M3 (Koordinaten, Tabellen, Suche)
- `src/solver4/edges.js` – K, K*
- `src/solver4/parity.js` – P (Algorithmen + Erkennung)
- `src/solver4/reduce.js` – Ablauf, Umrechnung 4x4 → 3x3, Prüfung, Phasen-Ergebnis
- Worker (`src/solver3/worker.js`, `core.js`, `client.js`): neue Anfrage `solve4 {id, facelets}` →
  `{type:'solution4', id, phases}`; nutzt die Kociemba-Tabellen des 3x3-Solvers.
- `src/solvers.js`: `'4x4'`-Solver mit derselben Schnittstelle, `solve` liefert Phasen.

## Anzeige
- Solver-Ergebnis: `[{ phase: 'centers'|'edges'|'parity'|'solve3', moves }]`; leere Phasen werden weggelassen.
  2x2/3x3 liefern intern eine einzige Phase ohne Überschrift (bestehende Anzeige unverändert).
- Zugliste mit Abschnitts-Überschriften: „Mitten“ / “Centres”, „Kanten paaren“ / “Pair edges”,
  „Parität“ / “Parity”, „Wie ein 3x3 lösen“ / “Solve like a 3x3”.
- Schritt-Text mit Phase: „Kanten paaren · Schritt 23 von 74: Rw' – rechte zwei Schichten gegen den Uhrzeigersinn“.
- Pfeil mit „w“ bei Doppelschicht-Zügen (aus D1) wird damit sichtbar.
- Einleitung/Meta-Beschreibung ergänzt: „4x4: Lösung in Phasen (meist 60–90 Züge)“.
- „Gültiger Würfel – der 4x4-Solver folgt.“ entfällt.
- Mischen 4x4 bleibt bei 40 Zufallszügen (echte Zufallszustände: zu lange Animation).

## Tests
**Unit (Node):**
- M1/M2/M3: für 50 Mischungen erreicht jede Phase ihr Ziel; die Zugmengen von M2/M3 erhalten die vorherigen Ziele (für alle Züge der Menge geprüft).
- K: nach K sind alle 12 Paare gebildet und die Mitten gelöst (50 Mischungen).
- P: gezielte Paritätsfälle (einzelne gekippte Kante; zwei vertauschte Kantenpaare) → als 3x3 lösbar nach P; die Paritäts-Algorithmen selbst: angewandt auf gelöst ergeben genau den erwarteten Paritätsfall.
- Gesamt: 50 Mischungen → Lösung angewandt = gelöst; Mittelwert ≤ 90, Maximum ≤ 120 Züge; ≤ 1,5 s pro Lösung in Node (gemessen, Grenze 3 s als harte Assertion wegen CI).
- Gelöster Würfel → leere Lösung; gelöst in anderer Haltung → leere Lösung.

**e2e:**
- 4x4 mischen → lösen → „Ende“: jede Seite einfarbig, 3D == Netz.
- Abschnitts-Überschriften und Phasen-Text sichtbar (DE und EN).
- Pfeil mit „w“ erscheint, wenn der nächste Zug ein Doppelschicht-Zug ist.
- „Lösen“ während der Vorbereitung löst automatisch; veraltete Antworten werden verworfen (wie 3x3).
- Alle bisherigen e2e grün.

## Nicht im Umfang
Kürzere Lösungen (Mehrphasen-Solver), echte Zufallszustände beim 4x4-Mischen, 5x5+, Lernmodus (C).
