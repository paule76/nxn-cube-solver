# NxN Cube Solver

> Hervorgegangen aus [2x2-cube-solver](https://github.com/paule76/2x2-cube-solver) (bleibt als stabile 2x2-Version online: https://paule76.github.io/2x2-cube-solver/).
> Ziel dieses Repos: Erweiterung auf weitere Würfelgrößen (zuerst 3x3). **Aktueller Stand: 2x2.**

## 2x2 Würfel-Löser

Statische Web-App, die einen 2x2-Zauberwürfel **optimal** löst (kürzestmögliche Zugfolge, höchstens 11 Züge).

## Bedienung

1. Farbe in der Palette wählen und die Felder im aufgeklappten Netz einfärben – so, wie dein Würfel aussieht (U = oben, F = vorne, R = rechts, L = links, B = hinten, D = unten).
2. **Lösen** drücken.
   Zum Üben: **Zufällig mischen** erzeugt eine zufällige Mischung aus 12 Zügen und zeigt sie animiert.
3. Mit **Weiter / Zurück** die Züge Schritt für Schritt durchgehen. Das Netz zeigt jeweils den Zwischenstand.

### 3D-Ansicht

- Neben dem Netz zeigt ein 3D-Würfel den aktuellen Stand. **Ziehen** (Maus/Finger) dreht die Ansicht, „Ansicht zurücksetzen“ stellt sie wieder her.
- Halbe Drehungen (`R2`, `U2`, `F2`) laufen als zwei Vierteldrehungen mit kurzer Pause; ein Zähler „1“ / „2“ hilft beim Mitzählen.
- Ein **Pfeil** zeigt Seite und Richtung des nächsten Zugs; bei „Weiter“/„Zurück“ dreht sich die Schicht animiert (bei „Bewegung reduzieren“ ohne Animation).
- **Abspielen** spielt die Lösung automatisch ab (Tempo langsam / normal / schnell).
- Fährt man im Netz über ein Feld, leuchtet derselbe Sticker im 3D-Würfel auf; ein Klick auf einen 3D-Sticker markiert das Feld im Netz.
- **Tastatur:** ← / → Zurück / Weiter, Pos1 / Ende, Leertaste = Abspielen / Pause.

„Leeren“, „Gelöst zurücksetzen“ und „Zufällig mischen“ überschreiben die Eingabe. Dann wird der Button zuerst rot („Wirklich …?“), und erst ein zweiter Klick innerhalb von 3 Sekunden führt die Aktion aus. Ist das Netz leer oder der Würfel gelöst, entfällt die Rückfrage (außer beim Leeren).

Notation: `R` = rechte Seite im Uhrzeigersinn (mit Blick auf die Seite), `R'` = gegen den Uhrzeigersinn, `R2` = halbe Drehung. Es werden nur die Seiten U, R und F gedreht – die Ecke hinten-unten-links bleibt an ihrem Platz.

## Wie es funktioniert

Mit fester DBL-Ecke hat der 2x2 genau 7! · 3⁶ = 3.674.160 Zustände. Beim Laden berechnet eine Breitensuche für jeden Zustand die Distanz zum gelösten Würfel (~3,7 MB, unter einer Sekunde). Eine Lösung folgt dann einfach Zügen, die die Distanz jeweils um 1 senken – damit ist sie garantiert optimal.

| Datei | Aufgabe |
|---|---|
| `src/cube.js` | Würfelmodell, Züge, Netz ↔ Zustand, Validierung |
| `src/solver.js` | Distanztabelle und Lösungssuche |
| `src/views/net-view.js` | Netz-Ansicht |
| `src/views/cube3d-view.js` | 3D-Ansicht (CSS-3D), Animation, Pfeile |
| `src/geometry.js` | 3D-Lage der Sticker, Schicht-Drehungen |
| `src/player.js`, `src/keys.js`, `src/stepper.js` | Autoplay, Tastatur, Schritt-Navigation |
| `src/app.js` | Bedienung, Schritt-Navigation |

Ansichten implementieren die Schnittstelle `{ render(facelets), showMove(move, direction), showHint?(move), highlight?(index) }`; die App verteilt Aufrufe an Netz und 3D-Ansicht.

Die Oberfläche gibt es auf **Deutsch und Englisch** (Umschalter oben rechts; Start in der Browsersprache, die Wahl wird gemerkt). Texte stehen in `src/i18n.js`; ein Test prüft, dass beide Sprachen dieselben Schlüssel haben.

Unterstützt wird das Standard-Farbschema (Weiß↔Gelb, Grün↔Blau, Rot↔Orange gegenüber).

## Lokal starten

Kein Build nötig, aber ES-Module brauchen einen Webserver:

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

## Tests

```bash
npm test   # Node ≥ 20 (CI: Node 24), keine Abhängigkeiten
```

## Veröffentlichung (GitHub Pages)

Der Workflow `.github/workflows/pages.yml` testet und veröffentlicht bei jedem Push auf `main`.

Einmalig im Repository einstellen: **Settings → Pages → Build and deployment → Source: „GitHub Actions“**.

## Lizenz

[MIT](LICENSE) – Copyright (c) 2026 paule76
