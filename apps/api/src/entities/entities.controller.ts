import { Controller, Get, Query } from '@nestjs/common';
import { EntitiesService } from './entities.service';

@Controller('entities')
export class EntitiesController {
  constructor(private readonly service: EntitiesService) {}

  @Get()
  findAll(@Query('page') page?: string) {
    return this.service.findAll(page);
  }
}
