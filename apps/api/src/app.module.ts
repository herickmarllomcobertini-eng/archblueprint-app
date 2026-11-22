import { Module } from '@nestjs/common';
import { CharactersModule } from './characters/characters.module';
import { EntitiesModule } from './entities/entities.module';
import { EpisodesModule } from './episodes/episodes.module';
import { FaqModule } from './faq/faq.module';
import { GlossaryModule } from './glossary/glossary.module';
import { LayersModule } from './layers/layers.module';
import { MediaModule } from './media/media.module';
import { PagesModule } from './pages/pages.module';
import { PrismaModule } from './prisma/prisma.module';
import { RanksModule } from './ranks/ranks.module';
import { RelmapModule } from './relmap/relmap.module';

@Module({
  imports: [
    PrismaModule, PagesModule, EpisodesModule, CharactersModule, EntitiesModule, RanksModule,
    GlossaryModule, FaqModule, LayersModule, RelmapModule, MediaModule,
  ],
})
export class AppModule {}
