# Teilprojekt E2: 5x5-Solver (Reduktion) – Design

Teil von E (5x5): E1 Modell & Darstellung → **E2 Solver**. Grundlage: Vorschlag
`docs/superpowers/notes/2026-11-12-5x5-proposal.md` (Ansatz A, vom Nutzer gewählt).

## Ziel
Gültige 5x5-Stellungen in Phasen lösen, Anzeige wie beim 4x4. Danach gehen E1 + E2 gemeinsam nach `main`
(nach Review und Freigabe des Nutzers).

## Auslieferung
- Weiter auf `feature/cube5-model`. Alle bisherigen Unit- und e2e-Tests bleiben grün.

## Ablauf (Phasen wie beim 4x4)
1. **Mitten** – x- und t-Mitten gemeinsam in vier Stufen: Z1 U/D-Farben auf U/D · Z2 F/B-Farben auf F/B ·
   Z3a U und D fertig (exakte Tabelle, 70 × 70 Zustände) · Z3b die vier Seiten (IDA* mit exakten Teil-Tabellen
   für F/B und R/L, die sich unter den Z3b-Zügen unabhängig verhalten). Z1/Z2: IDA* mit `max(h_x, h_t)`;
   Z1 in allen drei Blickrichtungen (Achse U/D, R/L, F/B), Z2 mit beiden Seitenpaaren; je Blickrichtung drei Wege
   (optimal, erst x-Mitten, erst t-Mitten) mit gemeinsamem Knotenbudget, das sich jede Runde verdoppelt – so gewinnt
   der günstigste Weg und keine Suche läuft unbegrenzt. Züge derselben Achse vertauschen beim 5x5; die Suche hält
   sie in fester Reihenfolge (U < Uw < Dw < D). Ausgabe in echten Zügen (Blickrichtung zurückübersetzt).
2. **Kanten paaren** – je Kante die Mittelkante als Anker, die zwei Kantenstücke dazu: gierig wie beim 4x4
   (Aufstellung · Uw/Dw · kurze Folge · zurück), Zielmaß gepaarte Kantenstücke (0–24); Mitten bleiben gelöst.
   Letzte Kanten: dieselbe Suche mit längeren Aufstellungen. Bleibt nichts zu gewinnen → Fehler (nie falsche Lösung).
3. **Parität** – ist die Vertauschung der Kantenstücke ungerade: feste 15-Zug-Folge
   (`Rw' U2 Lw F2 Lw' F2 Rw2 U2 Rw U2 Rw' U2 F2 Rw2 F2`, dieselbe wie die 4x4-OLL-Parität; per Test auf dem 5x5 geprüft)
   auf eine ungepaarte Kante, danach wird weiter gepaart – diese Züge stehen mit in der Phase „Parität“.
   Eine PLL-Parität gibt es beim 5x5 nicht.
4. **Wie ein 3x3 lösen** – reduzierter 3x3 (Ecken, Mittelkanten, feste Mitten) mit dem Kociemba-Solver; nur äußere Züge.

Jede Gesamtlösung wird am Ausgangszustand geprüft; Fehler → Fehlermeldung, nie eine falsche Lösung.

## Zielwerte (Node, 50 Mischungen à 60 Zügen, fester Zufall)
- Länge: Mittelwert ≤ 140, Maximum ≤ 180 Züge.
- Zeit: ≤ 1,5 s je Lösung im Mittel, harte Testgrenze 4 s je Lösung.
- Tabellenaufbau zusätzlich zum 4x4: ≤ 2 s in Node. Ein IndexedDB-Cache kommt nur, wenn der Aufbau im Browser
  spürbar stört (Messung im Plan).
- **Prüfpunkt nach den Mitten:** Mittelwert ≤ 45 Züge und ≤ 1 s je Würfel; sonst Messwerte vorlegen und Optionen
  besprechen (z. B. Stufen gierig statt optimal). **Prüfpunkt nach den Kanten:** Mitten + Kanten im Mittel ≤ 115.

## Anbindung
- Worker: `prepare5` / `solve5` → `ready5` / `solution5` (wie 4x4; eigener Fehlertyp für die Vorbereitung).
- `src/solvers.js`: `'5x5'` mit Phasen-Antwort; Texte `msg.preparing5` (DE/EN).
- Anzeige: Phasen-Überschriften wie beim 4x4 („Mitten“, „Kanten paaren“, „Parität“, „Wie ein 3x3 lösen“).
- Einleitung/Meta nennen den 5x5 („5x5: in Phasen, meist 110–150 Züge“, nach Messung angepasst).

## Tests
**Unit:** Paritätsfolge erzeugt auf dem gelösten 5x5 genau eine Kante mit vertauschten Kantenstücken, Mitten bleiben;
Mitten-Stufen erhalten vorherige Stufen; 50 Mischungen: gelöst, Zielwerte; gelöster Würfel → keine Phasen;
Fehlerpfade (Paaren scheitert → Fehler).
**e2e:** 5x5 mischen → lösen → Ende einfarbig, 3D == Netz; Überschriften DE/EN; „Lösen“ während der Vorbereitung
löst automatisch; alle bisherigen e2e grün.

## Nicht im Umfang
Kürzeste Mitten-Lösungen (Ansatz C), Zoom-Ansicht zum Einfärben, 6x6 und größer.
