# Feste 3D-Ansicht und Auto-Färben – Design

## Warum
Beim Testen fiel auf:
1. Die 3D-Ansicht dreht sich vor jedem Zug auf einer verdeckten Seite (hinten, unten, links) dorthin und springt
   danach sofort zum nächsten Ziel – eine fortwährende Bewegung, man verliert die Orientierung.
2. Beim einzelnen Weiterschalten ist die Drehanimation zu schnell.
3. Das Eingeben dauert, obwohl sich viele Felder logisch ergeben (jede Ecke gibt es nur einmal, Kanten nur in festen
   Farbkombinationen); außerdem kann man eine Farbe öfter setzen, als sie vorkommt („überfärben“).

## Ziele
- 3D-Würfel bleibt ruhig in fester Haltung; Züge auf verdeckten Seiten bleiben trotzdem erkennbar.
- Einzelschritte („Weiter“/„Zurück“, Tasten) animieren 30 % langsamer (Viertel-Drehung ~430 ms statt 300 ms);
  Abspielen und Mischen bleiben unverändert.
- Beim Eingeben färbt die App alles, was logisch feststeht, sofort selbst; volle Farben sind nicht mehr wählbar.

## Nicht-Ziele
- Kein Achsenkreuz mit kreisenden Pfeilen (verworfene Variante B), keine geglättete Auto-Kamera (Variante C).
- Kein Modus „Felder tauschen“ / Korrigieren mitten in der Lösung (bewusst zurückgestellt).
- Kein Erraten: Auto-Färben setzt nur, was zwingend folgt.

## Anti-Ziele
- Die App färbt nie etwas Falsches, das aus einem Vertipper stammt und dann stehen bleibt.
- Die feste Ansicht darf keinen Zug „unsichtbar“ machen.

## Ansätze (gewählt: A)
- **A – Knopf „Ansicht festhalten“ + gestrichelter Pfeil durch den Würfel (gewählt).** Einfach, behält die
  bestehende Pfeil-Darstellung, verdeckte Seiten bleiben erkennbar.
- B – Achsenkreuz durch den Würfel, Pfeile kreisen vor/hinter dem Würfel um die Achse: anschaulich, aber mehr
  Aufwand und eng bei Doppelschicht-Zügen und halben Drehungen.
- C – Auto-Kamera behalten, aber nicht sofort zurückspringen: löst das Problem nur halb.

Auto-Färben: ein sinnvoller Weg – Ausschlussverfahren auf Farbebene über die bekannten Steine jeder Größe
(siehe unten); sofortiges Einfärben statt Vorschlag mit Bestätigung (Entscheidung des Nutzers).

## 1. Feste 3D-Ansicht
- Neuer Knopf **„Ansicht festhalten“** neben „Ansicht zurücksetzen“ (Umschalter, `aria-pressed`), EN „Keep view fixed“.
  **Standard: an.** Die Wahl wird in `localStorage` gemerkt (mit try/catch wie die Sprache).
- **An:** die Kamera dreht sich nie von selbst – weder beim Schritt-für-Schritt/Abspielen noch beim Mischen.
  Von Hand drehen (ziehen) und „Ansicht zurücksetzen“ funktionieren weiter.
- Zug auf einer **verdeckten Seite** (aus der aktuellen Kamera nicht sichtbar, wie heute per `isFaceVisible`):
  der Hinweispfeil sitzt an dieser Seite, **gestrichelt und durch den Würfel hindurch sichtbar** (nicht vom Würfel
  verdeckt). Drehrichtung wie gewohnt (Blick auf die Seite). Die Drehanimation läuft ganz normal; man sieht sie von
  vorn durch die Lücken bzw. an den sichtbaren Rändern.
- **Aus:** Verhalten wie heute (Kamera folgt verdeckten Seiten).
- Der Zustand gilt für alle Größen gemeinsam.

## 2. Auto-Färben
### Wann
Nach jeder Eingabe des Nutzers (Feld im Netz antippen; ein Tipp am 3D-Würfel markiert wie bisher nur das Feld im
Netz), in allen Größen (2x2–5x5) – **nur solange noch Felder leer sind** (typisch nach „Leeren“, beim Abtippen des
echten Würfels). Auf einem vollständigen Würfel (Start, nach Mischen, „Gelöst zurücksetzen“, Bearbeiten während einer
Lösung) bleibt alles wie heute: freies Umfärben, keine ausgeblendeten Farben, „Lösen“ meldet Fehler. Alle Felder eines
vollständigen Würfels zählen als eigene.
Nicht beim Mischen, „Gelöst zurücksetzen“, „Leeren“ und beim Anzeigen einer Lösung (dort sind alle Felder gesetzt).

### Was zwingend folgt (Ausschlussverfahren, wiederholt bis nichts mehr folgt)
Arbeitet auf **Farben**, nicht auf Seiten – das Farbschema ist fest (Weiß↔Gelb, Grün↔Blau, Rot↔Orange, mit
Händigkeit), die Haltung beliebig. Daraus ergeben sich die gültigen Steine als Farbkombinationen:
- **Ecken:** 8 Farb-Tripel (im Uhrzeigersinn, wie in der Prüfung); jede Ecke genau einmal.
- **Kanten** (3x3) / **Mittelkanten** (5x5): 12 Farbpaare; jede genau einmal, Lage beliebig (kippbar).
- **Kantenstücke** (4x4, 5x5): 24 Stücke mit fester Leserichtung im Platz (wie in der Prüfung); jedes genau einmal.
- **Mittelsteine:** 3x3 und 5x5-feste Mitte: je Farbe genau eine, gegenüber die Gegenfarbe, mit richtiger
  Händigkeit (wie die Prüfung `centers`); 4x4-Mitten und 5x5-x-/t-Mitten: je Farbe 4, austauschbar.
- **Farbanzahl:** jede Farbe genau n² Felder.

Für jeden Platz (Ecke, Kante, …) werden die noch möglichen Steine samt Lage bestimmt – passend zu den schon
gefärbten Feldern des Platzes und ohne Steine, die schon sicher an einem anderen Platz liegen. Bleibt genau eine
Farbe für ein leeres Feld übrig (über alle noch möglichen Steine/Lagen), wird es gefärbt. Zusätzlich: ist eine Farbe
voll, kommt sie für kein Feld mehr in Frage; hat eine Mitten-Gruppe nur noch eine mögliche Farbe, wird gefärbt.

### Darstellung
- Automatisch gefärbte Felder bekommen eine **dezente Markierung** (im Netz und am 3D-Würfel, z. B. kleiner Punkt),
  damit man sieht, was die App ergänzt hat. Ein Hinweis im Netz-Bereich erklärt das kurz (DE/EN).
- **Neu rechnen:** Ändert der Nutzer ein selbst gesetztes Feld (oder setzt ein neues), werden alle ergänzten Felder
  verworfen und aus den eigenen Feldern neu berechnet. Tippt er auf ein ergänztes Feld, bekommt es die gewählte Farbe
  und wird zu einem eigenen (dann neu rechnen).
- **Widerspruch:** passt an einem Platz kein Stein mehr (oder zwei Plätze brauchen denselben Stein), meldet die App
  das sofort mit Stelle, z. B. „Ecke oben-vorne-rechts passt zu keinem Stein mehr.“ / EN entsprechend. Der Tipp des
  Nutzers bleibt stehen, alle ergänzten Felder werden verworfen (nichts Gefolgertes aus widersprüchlicher Eingabe
  bleibt stehen). Die bestehenden Fehlermeldungen beim „Lösen“ bleiben unverändert.

### Farbauswahl
- Solange Felder leer sind: **volle Farben** (n² Felder gefärbt, eigene + ergänzte) werden in der Farbauswahl
  **ausgeblendet** (nicht wählbar). Ist der Würfel vollständig, sind wieder alle Farben wählbar.
- Ist die gewählte Farbe voll, springt die Auswahl auf die nächste freie Farbe; sind alle voll, ist keine gewählt.
- Ein Feld in einer vollen Farbe kann man weiter umfärben (das gibt die Farbe wieder frei).
- Wird durch das Ergänzen der letzte leere Platz gefüllt, ist der Würfel vollständig; ab dann gilt das Verhalten
  für vollständige Würfel (die Markierungen der ergänzten Felder bleiben sichtbar, bis der Nutzer etwas ändert).

## Rahmen
- Keine Abhängigkeiten, kein Build; Texte DE + EN; alle bisherigen Unit- und e2e-Tests grün (wo sie das bisherige
  Kamera-Folgen prüfen, gelten sie für „Ansicht festhalten: aus“).
- Logik für Auto-Färben als eigenes, in Node testbares Modul je Größe (nutzt die Stein-Definitionen der Puzzle-Module).

## Dem Umsetzer überlassen
- Genaue Gestalt der Markierung, des gestrichelten Pfeils und des Knopfes (passend zum bestehenden Stil, beide Themes).
- Algorithmus-Details des Ausschlussverfahrens (solange: nur Zwingendes, Ergebnis ≤ 50 ms je Tipp auf dem Handy).
- Ob die Kamera beim Einschalten von „festhalten“ auf die Standardansicht zurückspringt.
