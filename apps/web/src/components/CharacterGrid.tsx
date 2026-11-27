import { memo, useRef, useState } from 'react';
import { fetchChunk } from '@/lib/api';
import { attrsToProps } from '@/lib/attrs';
import type { Character, CharacterPart } from '@/lib/types';
import { Content } from './Content';
import { usePageData } from './PageData';

function Part({ part }: { part: CharacterPart }) {
  if (part.kind === 'gallery') {
    return (
      <div {...attrsToProps(part.attrs)}>
        {(part.images ?? []).map((img, i) => <img key={i} {...attrsToProps(img.attrs)} />)}
      </div>
    );
  }
  if (part.kind === 'field') {
    return (
      <div {...attrsToProps(part.attrs)}>
        {(part.fieldParts ?? []).map((fp, i) => {
          if (fp.t === 'label') return <span key={i} {...attrsToProps(fp.attrs)}>{fp.text}</span>;
          if (fp.t === 'value') return <div key={i} {...attrsToProps(fp.attrs)} dangerouslySetInnerHTML={{ __html: fp.html }} />;
          return <Content key={i} html={fp.html} />;
        })}
      </div>
    );
  }
  return <Content html={part.html ?? ''} />;
}

/** Ficha de personagem. No modo protegido o conteudo so e baixado e decifrado ao abrir a ficha. */
function Card({ c }: { c: Character }) {
  const { protected: locked } = usePageData();
  const [parts, setParts] = useState<CharacterPart[] | null>(locked ? null : c.parts);
  const started = useRef(false);

  const attrs = attrsToProps(c.attrs);
  const original = attrs.onClick as ((ev: unknown) => void) | undefined;
  attrs.onClick = (ev: unknown) => {
    if (locked && c.chunk && !started.current) {
      started.current = true;
      fetchChunk<{ parts: CharacterPart[] }>(c.chunk)
        .then((r) => setParts(r.parts))
        .catch(() => {
          started.current = false;
        });
    }
    original?.(ev);
  };

  return (
    <div {...attrs}>
      <div {...attrsToProps(c.headerAttrs)}>
        <div>
          <div className="char-name">{c.name}</div>
          <div className="char-title">{c.title}</div>
        </div>
        {c.badgeText !== null ? <span {...attrsToProps(c.badgeAttrs)}>{c.badgeText}</span> : null}
      </div>
      <div className="char-toggle">{c.toggleText}</div>
      <div {...attrsToProps(c.bodyAttrs)}>
        {(parts ?? []).map((p) => <Part key={p.id} part={p} />)}
      </div>
    </div>
  );
}

export const CharacterGrid = memo(function CharacterGrid({ groupId }: { groupId: string }) {
  const group = usePageData().characterGroups.find((g) => g.id === groupId);
  if (!group) return null;
  return (
    <div {...attrsToProps(group.attrs)}>
      {group.characters.map((c) => <Card key={c.id} c={c} />)}
    </div>
  );
});
