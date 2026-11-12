// Translations (German, English). Keys are flat; `{name}` marks a placeholder.
// Move notation (R, U2, F') and side letters (U R F D L B) are the same in both languages.

export const LANGS = ['de', 'en'];

export const MESSAGES = {
  de: {
    'meta.title': 'Würfel-Löser',
    'meta.description': 'Gib die Farben deines Zauberwürfels (2x2 oder 3x3) ein und erhalte eine kurze Lösung Schritt für Schritt – mit 3D-Animation.',
    'app.title': 'Würfel-Löser',
    'app.lead': 'Wähle die Größe, färbe das Netz wie deinen Würfel ein und drücke „Lösen“. 2x2: kürzeste Lösung · 3x3: kurze Lösung (meist ≤ 20 Züge).',
    'lang.label': 'Sprache',

    'input.title': 'Würfel eingeben',
    'palette.label': 'Farbe wählen',
    'net.hintHtml': 'So liest du das Netz: Die Mitte ist <strong>vorne (F)</strong>. Seite <strong>B</strong> so eintragen, wie du sie von hinten siehst (ihre linke Spalte grenzt an R). Seite <strong>D</strong> so, wie du sie von unten siehst, mit der Vorderkante oben.',
    'camera.reset': 'Ansicht zurücksetzen',
    'cube3d.label': '3D-Ansicht des Würfels (ziehen zum Drehen)',

    'button.solve': 'Lösen',
    'button.scramble': 'Zufällig mischen',
    'button.reset': 'Gelöst zurücksetzen',
    'button.clear': 'Leeren',
    'confirm.clear': 'Wirklich leeren?',
    'confirm.reset': 'Wirklich zurücksetzen?',
    'confirm.scramble': 'Wirklich mischen?',
    'confirm.hint': 'Zum Bestätigen noch einmal klicken.',

    'msg.init': 'Initialisiere Solver…',
    'msg.ready': 'Bereit.',
    'msg.alreadySolved': 'Schon gelöst!',
    'msg.foundOne': 'Lösung gefunden: 1 Zug.',
    'msg.foundMany': 'Lösung gefunden: {count} Züge.',
    'msg.scrambling': 'Mische …',
    'msg.scrambled': 'Gemischt mit: {moves} – jetzt „Lösen“ drücken.',

    'solution.title': 'Lösung',
    'solution.hint': 'Halte den Würfel so, wie du ihn eingegeben hast: U oben, F vorne. Drehrichtung jeweils mit Blick auf die Seite.',
    'nav.first': '⏮ Anfang',
    'nav.firstLabel': 'Zum Anfang',
    'nav.prev': '◀ Zurück',
    'nav.next': 'Weiter ▶',
    'nav.last': 'Ende ⏭',
    'nav.lastLabel': 'Zum Ende',
    'play.play': '▶ Abspielen',
    'play.pause': '⏸ Pause',
    'tempo.label': 'Tempo',
    'tempo.langsam': 'langsam',
    'tempo.normal': 'normal',
    'tempo.schnell': 'schnell',
    'keys.hint': 'Tasten: ← → · Pos1/Ende · Leertaste',

    'step.next': 'Schritt {n} von {total}: {move}',
    'step.done': 'Fertig – der Würfel ist gelöst! 🎉',
    'move.describe': '{notation} – {face} {turn}',
    'move.face.U': 'obere Seite',
    'move.face.R': 'rechte Seite',
    'move.face.F': 'vordere Seite',
    'move.turn.cw': 'im Uhrzeigersinn',
    'move.turn.ccw': 'gegen den Uhrzeigersinn',
    'move.turn.half': 'halbe Drehung (180°)',

    'side.U': 'Oben',
    'side.L': 'Links',
    'side.F': 'Vorne',
    'side.R': 'Rechts',
    'side.B': 'Hinten',
    'side.D': 'Unten',
    'cell.label': '{side}, Feld {n}: {color}',

    'color.W': 'Weiß',
    'color.Y': 'Gelb',
    'color.G': 'Grün',
    'color.B': 'Blau',
    'color.R': 'Rot',
    'color.O': 'Orange',
    'color.empty': 'leer',

    'corner.URF': 'oben-vorne-rechts',
    'corner.UFL': 'oben-vorne-links',
    'corner.ULB': 'oben-hinten-links',
    'corner.UBR': 'oben-hinten-rechts',
    'corner.DFR': 'unten-vorne-rechts',
    'corner.DLF': 'unten-vorne-links',
    'corner.DBL': 'unten-hinten-links',
    'corner.DRB': 'unten-hinten-rechts',

    'error.incomplete': 'Es sind noch nicht alle Felder gefärbt.',
    'error.colorCount': '{color} kommt {count}× vor (erwartet: {expected}×).',
    'error.cornerOrder': 'Ecke {corner} ({colors}): Farben in falscher Reihenfolge – evtl. eine Seite gespiegelt eingegeben (B von hinten, D von unten gesehen).',
    'error.cornerImpossible': 'Ecke {corner} ({colors}) gibt es auf einem Würfel nicht.',
    'error.duplicateCorner': 'Eine Ecke kommt doppelt vor – bitte Eingabe prüfen.',
    'error.twistedCorner': 'Eine Ecke ist verdreht – so ist der Würfel nicht lösbar.',

    'error.centers': 'Die Mittelsteine passen nicht zusammen – jede Farbe muss genau einmal in der Mitte liegen, mit den richtigen Gegenseiten (Weiß–Gelb, Grün–Blau, Rot–Orange).',
    'error.edgeImpossible': 'Kante {edge} ({colors}) gibt es auf einem Würfel nicht.',
    'error.duplicateEdge': 'Eine Kante kommt doppelt vor – bitte Eingabe prüfen.',
    'error.flippedEdge': 'Eine Kante ist gekippt – so ist der Würfel nicht lösbar.',
    'error.parity': 'Zwei Steine sind vertauscht – so ist der Würfel nicht lösbar.',
    'msg.preparing3': '3x3-Solver wird vorbereitet …',
    'msg.searching': 'Suche Lösung …',
    'msg.solverFailed': '3x3-Solver konnte nicht gestartet werden.',
    'size.label': 'Würfelgröße',
    'move.face.D': 'untere Seite',
    'move.face.L': 'linke Seite',
    'move.face.B': 'hintere Seite',
    'edge.UR': 'oben-rechts',
    'edge.UF': 'oben-vorne',
    'edge.UL': 'oben-links',
    'edge.UB': 'oben-hinten',
    'edge.DR': 'unten-rechts',
    'edge.DF': 'unten-vorne',
    'edge.DL': 'unten-links',
    'edge.DB': 'unten-hinten',
    'edge.FR': 'vorne-rechts',
    'edge.FL': 'vorne-links',
    'edge.BL': 'hinten-links',
    'edge.BR': 'hinten-rechts',
    'footer.source': 'Quellcode auf GitHub',
    'footer.license': 'MIT-Lizenz',
  },
  en: {
    'meta.title': 'Cube Solver',
    'meta.description': 'Enter the colours of your cube (2x2 or 3x3) and get a short solution step by step – with 3D animation.',
    'app.title': 'Cube Solver',
    'app.lead': 'Choose the size, colour the net like your cube and press “Solve”. 2x2: shortest solution · 3x3: short solution (usually ≤ 20 moves).',
    'lang.label': 'Language',

    'input.title': 'Enter your cube',
    'palette.label': 'Choose colour',
    'net.hintHtml': 'How to read the net: the middle is the <strong>front (F)</strong>. Enter side <strong>B</strong> as you see it from behind (its left column touches R). Enter side <strong>D</strong> as you see it from below, with the front edge at the top.',
    'camera.reset': 'Reset view',
    'cube3d.label': '3D view of the cube (drag to rotate)',

    'button.solve': 'Solve',
    'button.scramble': 'Random scramble',
    'button.reset': 'Reset to solved',
    'button.clear': 'Clear',
    'confirm.clear': 'Really clear?',
    'confirm.reset': 'Really reset?',
    'confirm.scramble': 'Really scramble?',
    'confirm.hint': 'Click again to confirm.',

    'msg.init': 'Initialising solver…',
    'msg.ready': 'Ready.',
    'msg.alreadySolved': 'Already solved!',
    'msg.foundOne': 'Solution found: 1 move.',
    'msg.foundMany': 'Solution found: {count} moves.',
    'msg.scrambling': 'Scrambling …',
    'msg.scrambled': 'Scrambled with: {moves} – now press “Solve”.',

    'solution.title': 'Solution',
    'solution.hint': 'Hold the cube the way you entered it: U on top, F at the front. Turn directions are as seen looking at that side.',
    'nav.first': '⏮ First',
    'nav.firstLabel': 'First move',
    'nav.prev': '◀ Back',
    'nav.next': 'Next ▶',
    'nav.last': 'Last ⏭',
    'nav.lastLabel': 'Last move',
    'play.play': '▶ Play',
    'play.pause': '⏸ Pause',
    'tempo.label': 'Speed',
    'tempo.langsam': 'slow',
    'tempo.normal': 'normal',
    'tempo.schnell': 'fast',
    'keys.hint': 'Keys: ← → · Home/End · Space',

    'step.next': 'Step {n} of {total}: {move}',
    'step.done': 'Done – the cube is solved! 🎉',
    'move.describe': '{notation} – {face} {turn}',
    'move.face.U': 'top face',
    'move.face.R': 'right face',
    'move.face.F': 'front face',
    'move.turn.cw': 'clockwise',
    'move.turn.ccw': 'counter-clockwise',
    'move.turn.half': 'half turn (180°)',

    'side.U': 'Top',
    'side.L': 'Left',
    'side.F': 'Front',
    'side.R': 'Right',
    'side.B': 'Back',
    'side.D': 'Bottom',
    'cell.label': '{side}, square {n}: {color}',

    'color.W': 'White',
    'color.Y': 'Yellow',
    'color.G': 'Green',
    'color.B': 'Blue',
    'color.R': 'Red',
    'color.O': 'Orange',
    'color.empty': 'empty',

    'corner.URF': 'top-front-right',
    'corner.UFL': 'top-front-left',
    'corner.ULB': 'top-back-left',
    'corner.UBR': 'top-back-right',
    'corner.DFR': 'bottom-front-right',
    'corner.DLF': 'bottom-front-left',
    'corner.DBL': 'bottom-back-left',
    'corner.DRB': 'bottom-back-right',

    'error.incomplete': 'Not all squares are coloured yet.',
    'error.colorCount': '{color} appears {count}× (expected: {expected}×).',
    'error.cornerOrder': 'Corner {corner} ({colors}): colours in the wrong order – maybe a side was entered mirrored (B seen from behind, D seen from below).',
    'error.cornerImpossible': 'Corner {corner} ({colors}) does not exist on a cube.',
    'error.duplicateCorner': 'A corner appears twice – please check your input.',
    'error.twistedCorner': 'A corner is twisted – the cube cannot be solved like this.',

    'error.centers': 'The centre pieces do not match – each colour must be in exactly one centre, with the right opposite sides (white–yellow, green–blue, red–orange).',
    'error.edgeImpossible': 'Edge {edge} ({colors}) does not exist on a cube.',
    'error.duplicateEdge': 'An edge appears twice – please check your input.',
    'error.flippedEdge': 'An edge is flipped – the cube cannot be solved like this.',
    'error.parity': 'Two pieces are swapped – the cube cannot be solved like this.',
    'msg.preparing3': 'Preparing the 3x3 solver …',
    'msg.searching': 'Searching for a solution …',
    'msg.solverFailed': 'The 3x3 solver could not be started.',
    'size.label': 'Cube size',
    'move.face.D': 'bottom face',
    'move.face.L': 'left face',
    'move.face.B': 'back face',
    'edge.UR': 'top-right',
    'edge.UF': 'top-front',
    'edge.UL': 'top-left',
    'edge.UB': 'top-back',
    'edge.DR': 'bottom-right',
    'edge.DF': 'bottom-front',
    'edge.DL': 'bottom-left',
    'edge.DB': 'bottom-back',
    'edge.FR': 'front-right',
    'edge.FL': 'front-left',
    'edge.BL': 'back-left',
    'edge.BR': 'back-right',
    'footer.source': 'Source on GitHub',
    'footer.license': 'MIT License',
  },
};

/**
 * @param {{ lang: 'de'|'en', messages?: Record<string, Record<string, string>> }} options
 */
export function createI18n({ lang, messages = MESSAGES }) {
  let current = lang;
  return {
    get lang() {
      return current;
    },
    setLang(next) {
      if (!(next in messages)) throw new Error(`Unknown language: ${next}`);
      current = next;
    },
    /** Translated text; unknown keys come back unchanged so they stay visible. */
    t(key, params = {}) {
      const text = messages[current]?.[key];
      if (text === undefined) return key;
      return text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
    },
  };
}

/**
 * A stored choice wins; otherwise the browser's first preferred language decides.
 * @param {{ stored?: string|null, navigatorLanguages?: readonly string[] }} options
 */
export function detectLang({ stored, navigatorLanguages = [] } = {}) {
  if (LANGS.includes(stored)) return stored;
  return navigatorLanguages[0]?.toLowerCase().startsWith('de') ? 'de' : 'en';
}
