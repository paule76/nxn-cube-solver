# NxN Cube Solver

Statische Web-App zum Eingeben, Prüfen, Mischen und Lösen von Zauberwürfeln – auf Deutsch und Englisch.

> Hervorgegangen aus [2x2-cube-solver](https://github.com/paule76/2x2-cube-solver). Dieses Repo bleibt eingefroren als stabile 2x2-Version online (https://paule76.github.io/2x2-cube-solver/) und bekommt nur noch kritische Fehlerbehebungen; neue Funktionen entstehen hier.

## Stand

| Größe | Eingabe & Prüfung | Mischen & Animation | Lösen |
|---|---|---|---|
| 2x2 | ✅ | ✅ | ✅ optimal (höchstens 11 Züge) |
| 3x3 | ✅ | ✅ (zufälliger Zustand) | ✅ kurz, meist ≤ 20 Züge (Kociemba); erklärte Anfänger-Methode folgt (Teilprojekt C) |
| 4x4 | ✅ | ✅ (40 Züge inkl. Doppelschicht) | ✅ in Phasen (Reduktion), meist 70–100 Züge |
| 5x5 | ✅ | ✅ (60 Züge inkl. Doppelschicht) | ✅ in Phasen (Reduktion), meist 110–150 Züge |

Die Größe wählt man oben im Eingabebereich (**2x2 | 3x3 | 4x4 | 5x5**). Sie steht auch in der Adresse (`#2x2` … `#5x5`), sodass man direkt verlinken kann; die Zurück-Taste des Browsers wechselt die Größe. Jede Größe merkt sich ihre Eingabe.

## Bedienung

1. Größe wählen, Farbe in der Palette wählen und die Felder im aufgeklappten Netz einfärben – so, wie dein Würfel aussieht (U = oben, F = vorne, R = rechts, L = links, B = hinten, D = unten). Seite B so eintragen, wie man sie von hinten sieht, Seite D von unten mit der Vorderkante oben.
2. **Lösen** drücken. Die Eingabe wird geprüft (Farbanzahl, Mittelsteine, Ecken, Kanten, verdrehte Ecken, gekippte Kanten, vertauschte Steine) – Fehlermeldungen nennen die betroffene Stelle.
3. Mit **Weiter / Zurück** die Züge Schritt für Schritt durchgehen, oder **Abspielen** (Tempo langsam / normal / schnell).

Zum Üben erzeugt **Zufällig mischen** eine Mischung und zeigt sie animiert: beim 2x2 12 Zufallszüge, beim 3x3 einen gleichverteilt zufälligen Zustand (die umgekehrte Lösung, meist ~20 Züge).

„Leeren“, „Gelöst zurücksetzen“ und „Zufällig mischen“ überschreiben die Eingabe: Der Button wird zuerst rot („Wirklich …?“), erst ein zweiter Klick innerhalb von 3 Sekunden führt die Aktion aus. Ist das Netz leer oder der Würfel gelöst, entfällt die Rückfrage (außer beim Leeren).

### 3D-Ansicht

- Ziehen (Maus/Finger) dreht die Ansicht, „Ansicht zurücksetzen“ stellt sie wieder her.
- Ein **Pfeil** zeigt Seite und Richtung des nächsten Zugs; die Schicht dreht sich animiert (bei „Bewegung reduzieren“ ohne Animation).
- Bei Einzelschritten (Weiter, Zurück, Pfeiltasten) dauert eine Vierteldrehung 430 ms, beim Abspielen und Mischen 300 ms.
- Halbe Drehungen (`R2` …) laufen als zwei Vierteldrehungen mit Pause und Zähler „1“ / „2“.
- Liegt der nächste Zug auf einer verdeckten Seite (D, L, B), dreht sich die Kamera dorthin und danach zurück.
- Netz und 3D-Würfel heben dasselbe Feld hervor (Maus über Netz-Feld bzw. Klick auf 3D-Sticker).
- **Tastatur:** ← / → Zurück / Weiter, Pos1 / Ende, Leertaste = Abspielen / Pause.

Notation: `R` = rechte Seite im Uhrzeigersinn (mit Blick auf die Seite), `R'` = gegen den Uhrzeigersinn, `R2` = halbe Drehung; Seiten U D L R F B. Beim 4x4 dreht `Rw` die rechten zwei Schichten zusammen (WCA-Notation). Unterstützt wird das Standard-Farbschema (Weiß↔Gelb, Grün↔Blau, Rot↔Orange gegenüber).

## Aufbau

| Pfad | Aufgabe |
|---|---|
| `src/engine/` | N×N-Geometrie, Züge als Feld-Permutationen, Kamera-Sichtbarkeit |
| `src/puzzles/` | Puzzle-Module je Größe (`cube2.js`, `cube3.js`): Prüfung, Mischen, Solver |
| `src/cube.js`, `src/solver.js` | 2x2-Modell und optimaler 2x2-Solver (Distanztabelle über 3.674.160 Zustände) |
| `src/solver3/` | 3x3-Solver: Kociemba-Koordinaten, Zug-/Pruning-Tabellen, Zwei-Phasen-Suche, Zufallszustände, Web Worker, IndexedDB-Cache |
| `src/solver5/` | 5x5-Solver: Mitten in vier Stufen (`centers.js`, Blickrichtungen in `rotate.js`), Kanten paaren mit Parität (`edges.js`), Gesamtablauf (`reduce.js`) |
| `src/solver4/` | 4x4-Solver: Mitten (`centers.js`), Kanten paaren (`edges.js`), Parität und 3x3-Sicht (`parity.js`), Gesamtablauf (`reduce.js`) |
| `src/solvers.js` | einheitliche asynchrone Solver-Schnittstelle je Größe |
| `src/views/` | Netz- und 3D-Ansicht (CSS-3D) für beliebiges N |
| `src/app.js` | Bedienung, Größenwahl, Zustand je Größe |
| `src/i18n.js`, `src/messages.js` | Texte Deutsch/Englisch, Fehlermeldungen |
| `src/player.js`, `src/keys.js`, `src/stepper.js`, `src/confirm.js` | Autoplay, Tastatur, Schritt-Navigation, Rückfragen |

Puzzle-Module erfüllen `{ id, size, moveFaces, solvedFacelets(), parse(f), isSolved(s), applyMoves(f, moves), scramble(rng), solve?(s) }`. Ansichten erfüllen `{ render(facelets), showMove(move, dir), showHint?(move), highlight?(index) }`.

Die ausgelieferte Seite hat **keine Abhängigkeiten und keinen Build-Schritt**. Playwright ist nur Entwicklungs-Abhängigkeit für die Browser-Tests.

## 3x3-Solver

Der 3x3 wird mit dem Zwei-Phasen-Algorithmus von Herbert Kociemba gelöst (eigene Umsetzung):
Phase 1 bringt den Würfel in die Untergruppe ⟨U, D, L2, R2, F2, B2⟩, Phase 2 löst ihn dort.
Die Suche hört auf, sobald eine Lösung mit höchstens 20 Zügen bekannt ist und mindestens 0,1 s gesucht wurde,
spätestens nach 0,5 s. Kurze Mischungen bekommen so fast immer eine ebenso kurze Lösung.

Die Tabellen (~3,8 MB) berechnet ein Web Worker beim ersten Besuch im Hintergrund (Desktop ~1 s, Handy einige Sekunden);
danach liegen sie in IndexedDB und sind beim nächsten Besuch sofort da. Die Seite bleibt währenddessen bedienbar.

## 4x4-Solver

Der 4x4 wird durch Reduktion auf einen 3x3 gelöst; die Lösung wird in Phasen mit Überschriften angezeigt:

1. **Mitten** – in drei Stufen, jede optimal über eine Distanztabelle (Breitensuche über Bitmasken der 24 Mittelfelder).
2. **Kanten paaren** – je Schritt die Folge *Aufstellung · Doppelschicht · kurze Folge · Doppelschicht zurück*, die pro Zug die meisten Kanten paart; die Mitten bleiben dabei gelöst.
3. **Parität** – falls nötig: eine feste Folge kippt ein Kantenpaar (OLL-Parität), eine andere vertauscht zwei (PLL-Parität).
4. **Wie ein 3x3 lösen** – mit dem Kociemba-Solver oben, nur äußere Züge.

Jede Lösung wird vor der Anzeige am Ausgangszustand geprüft. In Node: im Mittel ~85 Züge (max. ~105), ~0,35 s je Würfel;
die Tabellen baut der Web Worker beim Wechsel auf 4x4 in ~1–2 s auf.

## 5x5-Solver

Ebenfalls Reduktion auf einen 3x3, Anzeige in denselben Phasen:

1. **Mitten** – x-Mitten (diagonal) und t-Mitten (seitlich) gemeinsam in vier Stufen: U/D-Farben auf U/D, F/B-Farben
   auf F/B, dann U und D fertig, dann die vier Seiten. Gesucht wird mit IDA* über Distanztabellen je Mitten-Art; für
   die ersten zwei Stufen wird die günstigste Achse gewählt, bei sehr schweren Fällen werden erst die x-Mitten gelöst.
2. **Kanten paaren** – die zwei Kantenstücke jeder Kante zur Mittelkante, wie beim 4x4 (eine oder beide Reihen je Schritt).
3. **Parität** – sind zwei Kantenstücke ungerade vertauscht, hilft eine feste 15-Zug-Folge.
4. **Wie ein 3x3 lösen** – Kociemba wie oben.

In Node: im Mittel ~132 Züge (max. ~150), ~1,25 s je Würfel; Tabellenaufbau beim Wechsel auf 5x5 ~1,5–3 s.

## Lokal starten

ES-Module brauchen einen Webserver:

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

## Tests

```bash
npm test        # Unit-Tests (Node ≥ 20)
npm ci          # einmalig: Playwright (Entwicklungs-Abhängigkeit)
npx playwright install chromium   # falls noch kein Browser vorhanden
npm run e2e     # Browser-Tests (eigener kleiner Server, kein Python nötig)
```

Auf langsamen Rechnern (z. B. Raspberry Pi) verlängert `CUBE_TIME_FACTOR` alle Zeitgrenzen der Tests um diesen Faktor, etwa `CUBE_TIME_FACTOR=1.5 npm test`; die Grenzen für die Zuganzahl bleiben gleich.

## Veröffentlichung (GitHub Pages)

`.github/workflows/pages.yml` führt Unit- und Browser-Tests bei jedem Push (auf `main` und `feature/**`) und bei Pull Requests aus und veröffentlicht nur von `main`. Veröffentlicht werden ausschließlich `index.html`, `style.css` und `src/`.

Einmalig im Repository: **Settings → Pages → Build and deployment → Source: „GitHub Actions“**.

## Lizenz

[MIT](LICENSE) – Copyright (c) 2026 paule76
