import type { CSSProperties } from 'react';
import { EVENT_PROPS, legacyHandler } from './legacy';
import type { Attrs } from './types';

const BOOLEAN_ATTRS = new Set(['open', 'hidden', 'disabled', 'checked', 'selected', 'readonly', 'required', 'autofocus', 'controls', 'loop', 'muted']);
const RENAME: Record<string, string> = {
  class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', colspan: 'colSpan',
  rowspan: 'rowSpan', maxlength: 'maxLength', autocomplete: 'autoComplete', crossorigin: 'crossOrigin',
};

function camel(prop: string) {
  return prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** "color: red; --x: 1" -> { color: 'red', '--x': '1' } */
export function parseStyle(style: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of style.split(/;(?![^(]*\))/)) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const value = decl.slice(i + 1).trim();
    if (prop && value) out[camel(prop)] = value;
  }
  return out as CSSProperties;
}

/** Atributos HTML guardados no banco -> props do React (mesma marcacao do original). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function attrsToProps(attrs: Attrs | null | undefined): any {
  const props: Record<string, unknown> = {};
  if (!attrs) return props;
  for (const [key, value] of Object.entries(attrs)) {
    const k = key.toLowerCase();
    if (k === 'style') props.style = parseStyle(value);
    else if (EVENT_PROPS[k]) {
      props[EVENT_PROPS[k]] = legacyHandler(value);
      props[`data-${k}`] = value; // o JS original consulta o codigo do handler (ex.: [data-onclick*="'ep1'"])
    }
    else if (BOOLEAN_ATTRS.has(k)) props[RENAME[k] ?? k] = true;
    else props[RENAME[k] ?? key] = value;
  }
  return props;
}
