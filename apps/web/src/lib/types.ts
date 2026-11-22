export type Attrs = Record<string, string>;

export interface Page { slug: string; title: string; headHtml: string; htmlAttrs: Attrs; bodyAttrs: Attrs }
export interface ContentBlock { id: number; sortOrder: number; key: string; kind: string; html: string }

export interface Episode {
  slug: string; sortOrder: number; readerOrder: number; seasonNumber: number | null; spinoffSlug: string | null;
  numLabel: string; title: string; subtitle: string | null; itemAttrs: Attrs; readerAttrs: Attrs;
  readerTag: string; readerTitle: string; bodyHtml: string; bodyAttrs: Attrs; afterHtml: string;
}
export interface Spinoff { slug: string; label: string; sortOrder: number; attrs: Attrs }

export interface CharacterPart {
  id: number; sortOrder: number; kind: 'field' | 'gallery' | 'html'; attrs: Attrs | null; html: string | null;
  fieldParts: Array<{ t: 'label'; text: string; attrs: Attrs } | { t: 'value'; html: string; attrs: Attrs } | { t: 'raw'; html: string }> | null;
  images: Array<{ attrs: Attrs }> | null;
}
export interface Character {
  id: number; sortOrder: number; attrs: Attrs; name: string; title: string; headerAttrs: Attrs;
  badgeText: string | null; badgeAttrs: Attrs | null; toggleText: string; bodyAttrs: Attrs; parts: CharacterPart[];
}
export interface CharacterGroup { id: string; page: string; attrs: Attrs; characters: Character[] }

export interface EntityTag { id: number; text: string; attrs: Attrs }
export interface Entity {
  id: number; attrs: Attrs; rank: string; name: string; imgAttrs: Attrs | null; descHtml: string;
  descAttrs: Attrs; tagsAttrs: Attrs; order: string[]; tags: EntityTag[];
}
export interface EntityGroup { id: string; page: string; attrs: Attrs; entities: Entity[] }

export interface Rank {
  id: number; attrs: Attrs; label: string; labelAttrs: Attrs; name: string; nameAttrs: Attrs;
  descHtml: string; descAttrs: Attrs; extraHtml: string; midAttrs: Attrs;
}
export interface RankGroup { id: string; page: string; attrs: Attrs; ranks: Rank[] }

export interface GlossaryTerm {
  id: number; page: string; attrs: Attrs; term: string; termAttrs: Attrs; defHtml: string; defAttrs: Attrs;
}
export interface FaqItem {
  id: number; attrs: Attrs; question: string; questionAttrs: Attrs; answerHtml: string; answerAttrs: Attrs;
}

export interface Layer {
  id: number; attrs: Attrs; beforeHtml: string; numHtml: string; midAttrs: Attrs; preNameHtml: string;
  name: string; nameAttrs: Attrs; bodyHtml: string; badgeText: string; badgeAttrs: Attrs;
}
export interface LayerGroup { id: string; page: string; attrs: Attrs; trailingHtml: string; layers: Layer[] }
export interface Camada {
  id: number; attrs: Attrs; beforeHtml: string; code: string; codeAttrs: Attrs; midAttrs: Attrs;
  name: string; nameAttrs: Attrs; descHtml: string; descAttrs: Attrs;
}
export interface CamadaGroup { id: string; page: string; attrs: Attrs; trailingHtml: string; camadas: Camada[] }

export interface RelMapData {
  nodes: Array<{ id: string; name: string; x: number; y: number; hub: boolean }>;
  edges: Array<{ from: string; to: string; label: string }>;
}

export interface PagePayload {
  page: Page;
  blocks: ContentBlock[];
  ui: Record<string, string>;
  episodes: Episode[];
  spinoffs: Spinoff[];
  characterGroups: CharacterGroup[];
  entityGroups: EntityGroup[];
  rankGroups: RankGroup[];
  glossary: GlossaryTerm[];
  faq: FaqItem[];
  layerGroups: LayerGroup[];
  camadaGroups: CamadaGroup[];
  relmap: RelMapData;
}
