import { Module } from '@nestjs/common';
import { CharactersModule } from '../characters/characters.module';
import { EntitiesModule } from '../entities/entities.module';
import { EpisodesModule } from '../episodes/episodes.module';
import { FaqModule } from '../faq/faq.module';
import { GlossaryModule } from '../glossary/glossary.module';
import { LayersModule } from '../layers/layers.module';
import { RanksModule } from '../ranks/ranks.module';
import { RelmapModule } from '../relmap/relmap.module';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({
  imports: [EpisodesModule, CharactersModule, EntitiesModule, RanksModule, GlossaryModule, FaqModule, LayersModule, RelmapModule],
  controllers: [PagesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
