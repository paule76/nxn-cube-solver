# Teilprojekt E2: 5x5-Solver (Reduktion) – Design

Teil von E (5x5): E1 Modell & Darstellung → **E2 Solver**. Grundlage: Vorschlag
`docs/superpowers/notes/2026-11-12-5x5-proposal.md` (Ansatz A, vom Nutzer gewählt).

## Ziel
Gültige 5x5-Stellungen in Phasen lösen, Anzeige wie beim 4x4. Danach gehen E1 + E2 gemeinsam nach `main`
(nach Review und Freigabe des Nutzers).

## Auslieferung
- Weiter auf `feature/cube5-model`. Alle bisherigen Unit- und e2e-Tests bleiben grün.

## Ablauf (Phasen wie beim 4x4)
1. **Mitten** – in drei Stufen wie beim 4x4 (U/D-Farben auf U/D · F/B-Farben auf F/B · alle auf ihre Seite),
   je Stufe für x- und t-Mitten gemeinsam. Je Stufe: zuerst die x-Mitten mit den 4x4-Tabellen (die x-Mitten
   verhalten sich unter allen 36 Zügen exakt wie die 4x4-Mitten), dann x + t zusammen per IDA* mit Heuristik
   `max(h_x, h_t)` über die erlaubten Züge der Stufe; Knotenbudget mit Rückfall auf die erste gefundene Lösung.
   Für Stufe 1 wird die günstigste der drei Achsen gewählt (U/D, R/L oder F/B zuerst) – die Stufen 2/3 folgen
   der gewählten Achse (Ansicht über Würfeldrehung umbenannt, Ausgabe in echten Zügen).
2. **Kanten paaren** – je Kante die Mittelkante als Anker, die zwei Kantenstücke dazu: gierig wie beim 4x4
   (Aufstellung · Uw/Dw · kurze Folge · zurück), Zielmaß gepaarte Kantenstücke (0–24); Mitten bleiben gelöst.
   Letzte Kanten: dieselbe Suche mit längeren Aufstellungen. Bleibt nichts zu gewinnen → Fehler (nie falsche Lösung).
3. **Parität** – falls bei einer Kante die zwei Kantenstücke vertauscht sind: feste Folge
   (r2 B2 U2 l U2 r' U2 r U2 F2 r F2 l' B2 r2 mit r = Rw R'), per Test auf dem 5x5 geprüft. Eine PLL-Parität gibt es beim 5x5 nicht.
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
