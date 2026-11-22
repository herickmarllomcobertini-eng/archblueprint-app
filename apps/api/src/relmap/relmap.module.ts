import { Module } from '@nestjs/common';
import { RelmapController } from './relmap.controller';
import { RelmapService } from './relmap.service';

@Module({ controllers: [RelmapController], providers: [RelmapService], exports: [RelmapService] })
export class RelmapModule {}
