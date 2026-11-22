import { memo } from 'react';
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

function Card({ c }: { c: Character }) {
  return (
    <div {...attrsToProps(c.attrs)}>
      <div {...attrsToProps(c.headerAttrs)}>
        <div>
          <div className="char-name">{c.name}</div>
          <div className="char-title">{c.title}</div>
        </div>
        {c.badgeText !== null ? <span {...attrsToProps(c.badgeAttrs)}>{c.badgeText}</span> : null}
      </div>
      <div className="char-toggle">{c.toggleText}</div>
      <div {...attrsToProps(c.bodyAttrs)}>
        {c.parts.map((p) => <Part key={p.id} part={p} />)}
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
