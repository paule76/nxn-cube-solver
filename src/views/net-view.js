// Net view: the cube unfolded as a cross. Implements the view interface
// { render(facelets), showMove(move, direction), highlight(index|null) }.

// Face letter -> position in the facelet order (U R F D L B) and grid placement in the cross.
const LAYOUT = [
  { face: 'U', order: 0, col: 2, row: 1 },
  { face: 'L', order: 4, col: 1, row: 2 },
  { face: 'F', order: 2, col: 2, row: 2 },
  { face: 'R', order: 1, col: 3, row: 2 },
  { face: 'B', order: 5, col: 4, row: 2 },
  { face: 'D', order: 3, col: 2, row: 3 },
];


/**
 * @param {HTMLElement} container
 * @param {{ n?: number, onCellClick(index: number): void, onCellHover?(index: number|null): void,
 *           cellLabel?(side: string, n: number, color: string|null): string,
 *           sideName?(side: string): string }} options
 */
export function createNetView(container, {
  n = 2,
  onCellClick,
  onCellHover = () => {},
  cellLabel = (side, n, color) => `${side} ${n}: ${color ?? '-'}`,
  sideName = (side) => side,
}) {
  const per = n * n;
  const FACES = LAYOUT.map((f) => ({ ...f, start: f.order * per }));
  const labels = [];
  const cells = new Array(6 * per);
  container.classList.add('net');
  container.style.setProperty('--n', String(n));
  container.replaceChildren();

  for (const { face, start, col, row } of FACES) {
    const el = document.createElement('div');
    el.className = 'face';
    el.style.gridColumn = String(col);
    el.style.gridRow = String(row);
    const label = document.createElement('span');
    label.className = 'face-label';
    label.textContent = face;
    labels.push([label, face]);
    el.append(label);
    for (let k = 0; k < per; k++) {
      const index = start + k;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.index = String(index);
      cell.addEventListener('click', () => onCellClick(index));
      cell.addEventListener('mouseenter', () => onCellHover(index));
      cell.addEventListener('focus', () => onCellHover(index));
      cell.addEventListener('mouseleave', () => onCellHover(null));
      cell.addEventListener('blur', () => onCellHover(null));
      cells[index] = cell;
      el.append(cell);
    }
    container.append(el);
  }

  return {
    render(facelets) {
      for (const [label, face] of labels) label.title = sideName(face);
      facelets.forEach((color, i) => {
        const cell = cells[i];
        cell.dataset.color = color ?? '';
        const face = FACES.find((f) => i >= f.start && i < f.start + per);
        cell.setAttribute('aria-label', cellLabel(face.face, i - face.start + 1, color));
      });
    },
    // The flat net has no animation.
    showMove() {
      return Promise.resolve();
    },
    highlight(index) {
      cells.forEach((cell, i) => {
        const on = i === index;
        cell.classList.remove('highlighted');
        if (on) {
          void cell.offsetWidth; // restart the blink animation
          cell.classList.add('highlighted');
        }
      });
    },
  };
}
