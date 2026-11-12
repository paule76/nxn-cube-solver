// Turns language-neutral results from the puzzle modules into translated text.

/**
 * @param {{ code: string, params?: object }} result failed parse result
 * @param {(key: string, params?: object) => string} t
 */
export function formatParseError({ code, params = {} }, t) {
  const colorName = (c) => t(`color.${c}`);
  const p = { ...params };
  if (p.color) p.color = colorName(p.color);
  if (p.colors) p.colors = p.colors.map(colorName).join('/');
  if (p.kind) p.kind = t(`centerKind.${p.kind}`);
  if (p.position) {
    if (code.startsWith('edge')) p.edge = t(/\d$/.test(p.position) ? `wing.${p.position}` : `edge.${p.position}`);
    else p.corner = t(`corner.${p.position}`);
  }
  return t(`error.${code}`, p);
}
