import parse, { attributesToProps, domToReact, type DOMNode, type Element, type HTMLReactParserOptions } from 'html-react-parser';
import { createElement, Fragment, memo } from 'react';
import { EVENT_PROPS, legacyHandler } from '@/lib/legacy';
import { Marker } from './Marker';

const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source']);
const MARKER = /^@([a-z-]+)(?::(.*))?$/;

const options: HTMLReactParserOptions = {
  replace(node: DOMNode) {
    // <!--@tipo:arg--> vira o componente que le os dados do banco
    if (node.type === 'comment') {
      const m = MARKER.exec(((node as unknown as { data: string }).data ?? '').trim());
      return m ? <Marker kind={m[1]} arg={m[2]} /> : <Fragment />;
    }
    // handlers inline (onclick="...") continuam funcionando
    if (node.type === 'tag') {
      const el = node as Element;
      const handlers = Object.keys(el.attribs).filter((a) => EVENT_PROPS[a.toLowerCase()]);
      if (handlers.length) {
        const plain = { ...el.attribs };
        for (const h of handlers) delete plain[h];
        const props: Record<string, unknown> = attributesToProps(plain);
        for (const h of handlers) {
          props[EVENT_PROPS[h.toLowerCase()]] = legacyHandler(el.attribs[h]);
          props[`data-${h.toLowerCase()}`] = el.attribs[h];
        }
        const kids = VOID.has(el.name) ? undefined : domToReact(el.children as DOMNode[], options);
        return createElement(el.name, props, kids);
      }
    }
    return undefined;
  },
};

/** Renderiza um trecho de HTML do banco (com marcadores e handlers inline) como arvore React. */
export const Content = memo(function Content({ html }: { html: string }) {
  if (!html) return null;
  return <>{parse(html, options)}</>;
});
