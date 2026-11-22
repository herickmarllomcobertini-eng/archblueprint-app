import type { SyntheticEvent } from 'react';

/**
 * O site original usa handlers inline (onclick="openEp('ep1')", oninput="filterEpisodes(this.value)").
 * Eles continuam funcionando: o codigo do atributo e compilado uma vez e executado com
 * `this` = elemento, exatamente como o navegador faz com HTML puro. As funcoes chamadas
 * (openEp, toggleChar...) vivem em src/legacy/behaviors.ts e sao expostas em `window`.
 */
const cache = new Map<string, (this: unknown, event: Event) => void>();

export function legacyHandler(code: string) {
  return (e: SyntheticEvent) => {
    let fn = cache.get(code);
    if (!fn) {
      fn = new Function('event', code) as (this: unknown, event: Event) => void;
      cache.set(code, fn);
    }
    fn.call(e.currentTarget, e.nativeEvent);
  };
}

export const EVENT_PROPS: Record<string, string> = {
  onclick: 'onClick', oninput: 'onInput', onchange: 'onChange', onkeydown: 'onKeyDown', onkeyup: 'onKeyUp',
  onsubmit: 'onSubmit', onfocus: 'onFocus', onblur: 'onBlur', onmouseover: 'onMouseOver', onmouseout: 'onMouseOut',
};
