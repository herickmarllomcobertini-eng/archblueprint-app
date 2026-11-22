import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CharactersService } from '../characters/characters.service';
import { EntitiesService } from '../entities/entities.service';
import { EpisodesService } from '../episodes/episodes.service';
import { FaqService } from '../faq/faq.service';
import { GlossaryService } from '../glossary/glossary.service';
import { LayersService } from '../layers/layers.service';
import { RanksService } from '../ranks/ranks.service';
import { RelmapService } from '../relmap/relmap.service';

/** Monta tudo que uma pagina precisa em uma unica chamada. */
@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly episodes: EpisodesService,
    private readonly characters: CharactersService,
    private readonly entities: EntitiesService,
    private readonly ranks: RanksService,
    private readonly glossary: GlossaryService,
    private readonly faq: FaqService,
    private readonly layers: LayersService,
    private readonly relmap: RelmapService,
  ) {}

  async findOne(slug: string) {
    const page = await this.prisma.page.findUnique({
      where: { slug },
      include: { blocks: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!page) throw new NotFoundException(`Pagina "${slug}" nao existe`);

    const isHome = slug === 'home';
    const [uiRows, characterGroups, entityGroups, rankGroups, glossary, layers, episodes, spinoffs, faq, relmap] =
      await Promise.all([
        this.prisma.uiString.findMany(),
        this.characters.findAll(slug),
        this.entities.findAll(slug),
        this.ranks.findAll(slug),
        this.glossary.findAll(slug),
        this.layers.findAll(slug),
        isHome ? this.episodes.findAll() : [],
        isHome ? this.episodes.spinoffs() : [],
        isHome ? this.faq.findAll() : [],
        isHome ? this.relmap.findAll() : { nodes: [], edges: [] },
      ]);

    const { blocks, ...meta } = page;
    return {
      page: meta,
      blocks,
      ui: Object.fromEntries(uiRows.map((u) => [u.key, u.html])),
      episodes,
      spinoffs,
      characterGroups,
      entityGroups,
      rankGroups,
      glossary,
      faq,
      layerGroups: layers.layerGroups,
      camadaGroups: layers.camadaGroups,
      relmap,
    };
  }
}
