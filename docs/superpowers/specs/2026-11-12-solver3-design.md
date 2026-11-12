# Teilprojekt B: 3x3-Solver „kurz“ (Kociemba) – Design

Teil der Gesamtplanung A → **B** → C → D (siehe `2026-11-12-nxn-foundation-design.md`).

## Ziel
Der 3x3 wird gelöst: Lösungen mit meist ≤ 20 Zügen, berechnet im Hintergrund, ohne dass die
Seite einfriert. Nach Abschluss gehen A und B gemeinsam live.

**Erfolg:** Ein beliebiger gültiger 3x3 wird in ≤ ~0,5 s (nach Vorbereitung) gelöst; die
Lösung führt im Netz und im 3D-Würfel zum gelösten Würfel.

## Rahmen
- Eigener Code, keine Abhängigkeiten, kein Build. Solver-Code läuft in Browser (Worker) und Node (Tests).
- 2x2-Verhalten unverändert. Alle bestehenden Unit- und e2e-Tests bleiben grün.
- Neue Texte DE + EN.
- Entwicklung auf `feature/solver3` (basiert auf `feature/nxn-foundation`).

## Solver (Kociemba-Zwei-Phasen)

### Koordinaten (aus dem 3x3-Modell `cp, co, ep, eo` von A)
| Phase | Koordinate | Werte |
|---|---|---|
| 1 | Eckendrehung (twist) | 2187 |
| 1 | Kantenkippung (flip) | 2048 |
| 1 | Lage der Mittelschicht-Kanten FR, FL, BL, BR (slice, ungeordnet) | 495 |
| 2 | Eckenpermutation | 40320 |
| 2 | Permutation der 8 U/D-Kanten | 40320 |
| 2 | Permutation der 4 Mittelschicht-Kanten | 24 |

- Zugtabellen je Koordinate werden aus `applyMove3` (A) abgeleitet, nicht von Hand eingetragen.
- Phase 1: alle 18 Züge. Phase 2: `U U2 U' D D2 D' R2 L2 F2 B2`.

### Pruning-Tabellen (Breitensuche, 4 Bit pro Eintrag)
- Phase 1: twist × slice, flip × slice
- Phase 2: Ecken × Mittelschicht-Perm, U/D-Kanten × Mittelschicht-Perm
- Pruning-Tabellen ≈ 2 MB; zusammen mit den Zugtabellen werden ≈ 3,8 MB in IndexedDB gespeichert
  (Entscheidung bei der Umsetzung: Laden dauert ~4 ms statt ~1 s Neuberechnung).

### Suche
- IDA* in Phase 1 bis zur Untergruppe, dann IDA* in Phase 2; Gesamtlänge wird schrittweise verkürzt.
- Zugfolgen-Regeln: nicht zweimal dieselbe Seite hintereinander; gegenüberliegende Seiten nur
  in fester Reihenfolge (z. B. U vor D).
- Abbruch: sobald eine Lösung ≤ 20 Züge gefunden ist, spätestens nach **500 ms** (dann beste bis dahin).
- Bereits gelöster Würfel → leere Lösung.

### Dateien
- `src/solver3/coords.js` – Koordinaten ↔ Zustand
- `src/solver3/tables.js` – Zug- und Pruning-Tabellen aufbauen; Export als `Uint8Array`, Import daraus
- `src/solver3/search.js` – Zwei-Phasen-Suche `solve(state, { maxLength = 20, timeoutMs = 500 })`
- `src/solver3/random-state.js` – gleichverteilt zufälliger gültiger Zustand (`rng` injizierbar)
- `src/solver3/worker.js` – Web Worker (Modul-Worker)
- `src/solver3/client.js` – Seite ↔ Worker (Promise-API, Anfrage-IDs)

## Hintergrund-Thread und Zwischenspeicher
- Start, sobald der 3x3 erstmals angezeigt wird (auch beim Seitenstart mit `#3x3`).
- Worker: Tabellen aus IndexedDB laden (DB `cube-solver`, Store `tables`, Schlüssel `cube3-tables-v1`);
  fehlen oder ungültig (Länge/Prüfsumme) → berechnen und speichern. Fehler beim Speichern werden ignoriert.
- Versionsschlüssel wird erhöht, wenn sich Tabellenlogik ändert; alte Schlüssel werden ignoriert.
- Nachrichten: `ready`, `solve {id, state}` → `solution {id, moves}`, `randomScramble {id}` → `scramble {id, moves}`, `error {id?, message}`.
- Worker startet nicht oder meldet Fehler → Meldung „3x3-Solver konnte nicht gestartet werden.“ /
  “The 3x3 solver could not be started.”; Mischen fällt auf Zufallszüge zurück.

## Einbindung in die App
- Puzzle-Schnittstelle: `solve(state) → Promise<Move[]>` für alle Größen (2x2 sofort aufgelöst);
  neu optional `ready → boolean` und `whenReady() → Promise`.
- „Lösen“ beim 3x3, solange nicht bereit: Meldung `msg.preparing3` („3x3-Solver wird vorbereitet …“),
  Lösung wird nach Bereitschaft automatisch berechnet und angezeigt.
- Während der Suche: `msg.searching` („Suche Lösung …“).
- Jede Anfrage bekommt eine Markierung; ändern sich Eingabe, Größe oder Lösung inzwischen,
  wird die Antwort verworfen.
- `msg.validNoSolver` entfällt.
- Einleitung/Meta-Beschreibung: „2x2: kürzeste Lösung · 3x3: kurze Lösung (meist ≤ 20 Züge)“.
- **Schritt-Sperre je Größe:** ein Stepper pro Größe (Fix aus Review A).

## Mischen 3x3
- Solver bereit: gleichverteilt zufälliger Zustand → lösen → Mischung = umgekehrte Lösung
  (Züge in umgekehrter Reihenfolge, Drehrichtung umgekehrt). Ergebnis-Zustand = Zufallszustand.
- Solver nicht bereit: 20 Zufallszüge wie in A (keine Wartezeit).
- 2x2 unverändert (12 Zufallszüge).

## Freigabe
1. `feature/solver3` fertig + Review → `feature/nxn-foundation` und `feature/solver3` nach `main`
   (Fast-Forward). Damit gehen A und B live.
2. Workflow: `cancel-in-progress` nur für Nicht-`main`-Refs (laufende Deployments werden nicht abgebrochen).
3. 2x2-Repo (eingefroren, letzter vereinbarter Push): dezenter Hinweis auf der Seite „Neue Version mit 3x3“
   mit Link auf `https://paule76.github.io/nxn-cube-solver/` (DE/EN) und Verweis in der README.

## Tests
**Unit (Node, Solver ohne Worker):**
- Koordinaten ↔ Zustand für 100 Zufallszustände verlustfrei (soweit die Koordinate den Zustand bestimmt).
- Zugtabellen stimmen mit `applyMove3` überein (für alle Koordinaten, 18 bzw. 10 Züge, Stichproben).
- Pruning-Tabellen vollständig gefüllt; maximale Tiefe Phase 1 ≤ 12, Phase 2 ≤ 18.
- Export → Import ergibt identische Tabellen.
- 200 Zufallszustände: Lösung angewandt ergibt gelöst; Mittelwert ≤ 21, Maximum ≤ 24 Züge.
- Gelöster Zustand → `[]`; Zustand nach einem Zug → 1 Zug.
- Tabellenaufbau in Node ≤ 3 s.
- Zufallszustand: immer `parse3`-gültig; Verteilung grob gleichmäßig (Ecken-/Kantenpositionen).
- Mischung aus Zufallszustand: angewandt auf gelöst ergibt genau den Zufallszustand.

**e2e:**
- 3x3 mischen → lösen → „Ende“: jede Seite einfarbig, 3D == Netz.
- Neuladen: Solver ist sofort bereit (aus IndexedDB; Meldung „Bereit.“ ohne Vorbereitungsphase).
- „Lösen“ während der Vorbereitung → Lösung erscheint danach automatisch.
- Größenwechsel während der Suche → kein veraltetes Ergebnis beim Zurückwechseln.
- Alle bisherigen e2e grün.

## Nicht im Umfang
Anfänger-Methode / Umschalter kurz–erklärt (C), 4x4+ (D), optimale 3x3-Lösungen.
