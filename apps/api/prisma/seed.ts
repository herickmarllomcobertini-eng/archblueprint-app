import { Prisma, PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const load = (name: string): any[] =>
  JSON.parse(readFileSync(join(__dirname, 'seed-data', `${name}.json`), 'utf-8'));
const loadObj = (name: string): any => JSON.parse(readFileSync(join(__dirname, 'seed-data', `${name}.json`), 'utf-8'));
/** Json opcional: null do JS vira JSON null no SQLite */
const J = (v: unknown) => (v === null || v === undefined ? Prisma.JsonNull : (v as Prisma.InputJsonValue));
const O = (v: unknown) => (v ?? {}) as Prisma.InputJsonValue;

async function clear() {
  // ordem inversa das dependencias: o seed pode rodar varias vezes sem duplicar
  await prisma.relEdge.deleteMany();
  await prisma.relNode.deleteMany();
  await prisma.camada.deleteMany();
  await prisma.camadaGroup.deleteMany();
  await prisma.layer.deleteMany();
  await prisma.layerGroup.deleteMany();
  await prisma.faqItem.deleteMany();
  await prisma.glossaryTerm.deleteMany();
  await prisma.rank.deleteMany();
  await prisma.rankGroup.deleteMany();
  await prisma.entityTag.deleteMany();
  await prisma.entity.deleteMany();
  await prisma.entityGroup.deleteMany();
  await prisma.characterPart.deleteMany();
  await prisma.character.deleteMany();
  await prisma.characterGroup.deleteMany();
  await prisma.episode.deleteMany();
  await prisma.spinoff.deleteMany();
  await prisma.season.deleteMany();
  await prisma.contentBlock.deleteMany();
  await prisma.page.deleteMany();
  await prisma.uiString.deleteMany();
  await prisma.media.deleteMany();
}

async function main() {
  await clear();

  await prisma.media.createMany({
    data: load('media').map((m) => ({
      hash: m.hash, folder: m.folder, filename: m.filename, path: m.path, width: m.width,
      height: m.height, bytesOriginal: m.bytesOriginal, bytesAvif: m.bytesAvif, alt: m.alt ?? null,
    })),
  });
  await prisma.uiString.createMany({ data: load('uiStrings') });

  for (const p of load('pages')) {
    await prisma.page.create({
      data: { slug: p.slug, title: p.title, headHtml: p.headHtml, htmlAttrs: O(p.htmlAttrs), bodyAttrs: O(p.bodyAttrs) },
    });
  }
  await prisma.contentBlock.createMany({
    data: load('blocks').map((b) => ({
      pageSlug: b.page, sortOrder: b.sortOrder, key: b.key, kind: b.kind, html: b.html,
    })),
  });

  // episodios
  await prisma.season.createMany({
    data: [{ number: 1, label: 'Temporada 1' }, { number: 2, label: 'Temporada 2' }],
  });
  await prisma.spinoff.createMany({
    data: load('spinoffs').map((s) => ({ slug: s.slug, label: s.label, sortOrder: s.sortOrder, attrs: O(s.attrs) })),
  });
  await prisma.episode.createMany({
    data: load('episodes').map((e) => ({
      slug: e.slug, sortOrder: e.sortOrder, readerOrder: e.readerOrder,
      seasonNumber: e.seasonNumber ?? null, spinoffSlug: e.spinoffSlug ?? null,
      numLabel: e.numLabel, title: e.title, subtitle: e.subtitle ?? null,
      itemAttrs: O(e.itemAttrs), readerAttrs: O(e.readerAttrs), readerTag: e.readerTag,
      readerTitle: e.readerTitle, bodyHtml: e.bodyHtml, bodyAttrs: O(e.bodyAttrs), afterHtml: e.afterHtml ?? '',
    })),
  });

  // personagens
  await prisma.characterGroup.createMany({
    data: load('characterGroups').map((g) => ({ id: g.id, page: g.page, sortOrder: g.sortOrder, attrs: O(g.attrs) })),
  });
  for (const c of load('characters')) {
    await prisma.character.create({
      data: {
        page: c.page, groupId: c.groupId, sortOrder: c.sortOrder, attrs: O(c.attrs), name: c.name,
        title: c.title, headerAttrs: O(c.headerAttrs), badgeText: c.badgeText ?? null,
        badgeAttrs: J(c.badgeAttrs), toggleText: c.toggleText, bodyAttrs: O(c.bodyAttrs),
        parts: {
          create: c.parts.map((p: any) => ({
            sortOrder: p.sortOrder, kind: p.kind, attrs: J(p.attrs), html: p.html ?? null,
            fieldParts: J(p.fieldParts), images: J(p.images),
          })),
        },
      },
    });
  }

  // entidades
  await prisma.entityGroup.createMany({
    data: load('entityGroups').map((g) => ({ id: g.id, page: g.page, attrs: O(g.attrs) })),
  });
  for (const e of load('entities')) {
    await prisma.entity.create({
      data: {
        page: e.page, groupId: e.groupId, sortOrder: e.sortOrder, attrs: O(e.attrs), rank: e.rank,
        name: e.name, imgAttrs: J(e.imgAttrs), descHtml: e.descHtml, descAttrs: O(e.descAttrs),
        tagsAttrs: O(e.tagsAttrs), order: e.order,
        tags: { create: e.tags.map((t: any, i: number) => ({ sortOrder: i, text: t.text, attrs: O(t.attrs) })) },
      },
    });
  }

  // ranks
  await prisma.rankGroup.createMany({
    data: load('rankGroups').map((g) => ({ id: g.id, page: g.page, attrs: O(g.attrs) })),
  });
  await prisma.rank.createMany({
    data: load('ranks').map((r) => ({
      page: r.page, groupId: r.groupId, sortOrder: r.sortOrder, attrs: O(r.attrs), label: r.label,
      labelAttrs: O(r.labelAttrs), name: r.name, nameAttrs: O(r.nameAttrs), descHtml: r.descHtml,
      descAttrs: O(r.descAttrs), extraHtml: r.extraHtml ?? '', midAttrs: O(r.midAttrs),
    })),
  });

  // glossario e faq
  await prisma.glossaryTerm.createMany({
    data: load('glossary').map((g) => ({
      page: g.page, sortOrder: g.sortOrder, attrs: O(g.attrs), term: g.term, termAttrs: O(g.termAttrs),
      defHtml: g.defHtml, defAttrs: O(g.defAttrs),
    })),
  });
  await prisma.faqItem.createMany({
    data: load('faq').map((f) => ({
      sortOrder: f.sortOrder, attrs: O(f.attrs), question: f.question, questionAttrs: O(f.questionAttrs),
      answerHtml: f.answerHtml, answerAttrs: O(f.answerAttrs),
    })),
  });

  // cosmologia
  await prisma.camadaGroup.createMany({
    data: load('camadaGroups').map((g) => ({ id: g.id, page: g.page, attrs: O(g.attrs), trailingHtml: g.trailingHtml ?? '' })),
  });
  await prisma.camada.createMany({
    data: load('camadas').map((c) => ({
      groupId: c.groupId, sortOrder: c.sortOrder, attrs: O(c.attrs), beforeHtml: c.beforeHtml ?? '', code: c.code,
      codeAttrs: O(c.codeAttrs), midAttrs: O(c.midAttrs), name: c.name, nameAttrs: O(c.nameAttrs),
      descHtml: c.descHtml, descAttrs: O(c.descAttrs),
    })),
  });
  await prisma.layerGroup.createMany({
    data: load('layerGroups').map((g) => ({
      id: g.id, page: g.page, sortOrder: g.sortOrder, attrs: O(g.attrs), trailingHtml: g.trailingHtml ?? '',
    })),
  });
  await prisma.layer.createMany({
    data: load('layers').map((l) => ({
      groupId: l.groupId, sortOrder: l.sortOrder, attrs: O(l.attrs), beforeHtml: l.beforeHtml ?? '',
      numHtml: l.numHtml, midAttrs: O(l.midAttrs), preNameHtml: l.preNameHtml ?? '', name: l.name,
      nameAttrs: O(l.nameAttrs), bodyHtml: l.bodyHtml, badgeText: l.badgeText, badgeAttrs: O(l.badgeAttrs),
    })),
  });

  // mapa de relacoes
  const rel = loadObj('relmap');
  await prisma.relNode.createMany({
    data: rel.nodes.map((n: any, i: number) => ({ id: n.id, name: n.name, x: n.x, y: n.y, hub: !!n.hub, sortOrder: i })),
  });
  await prisma.relEdge.createMany({
    data: rel.edges.map((e: any, i: number) => ({ fromId: e.from, toId: e.to, label: e.label, sortOrder: i })),
  });

  const counts = {
    episodios: await prisma.episode.count(), personagens: await prisma.character.count(),
    entidades: await prisma.entity.count(), ranks: await prisma.rank.count(),
    camadas: await prisma.camada.count(), layers: await prisma.layer.count(),
    glossario: await prisma.glossaryTerm.count(), faq: await prisma.faqItem.count(),
    relNos: await prisma.relNode.count(), relArestas: await prisma.relEdge.count(),
    blocos: await prisma.contentBlock.count(), midias: await prisma.media.count(),
  };
  console.table(counts);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
