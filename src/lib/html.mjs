// HTML com escape automático: h`<p>${texto}</p>` escapa; raw(x) passa sem escape; listas juntam-se.
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(String(s ?? ''));

function valor(v) {
  if (v == null || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(valor).join('');
  return esc(v);
}

export function h(partes, ...vals) {
  let out = '';
  partes.forEach((p, i) => { out += p + (i < vals.length ? valor(vals[i]) : ''); });
  return raw(out);
}

// atributos: attrs({ href, 'aria-label': x, hidden: true, x: false })
export function attrs(o) {
  return raw(Object.entries(o).filter(([, v]) => v != null && v !== false).map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`)).join(''));
}

export const json = (o) => raw(JSON.stringify(o).replace(/</g, '\\u003c'));
