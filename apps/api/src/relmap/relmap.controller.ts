import { Controller, Get, Query } from '@nestjs/common';
import { RelmapService } from './relmap.service';

@Controller('relmap')
export class RelmapController {
  constructor(private readonly service: RelmapService) {}

  @Get()
  findAll(@Query('page') page?: string) {
    return this.service.findAll(page);
  }
}
