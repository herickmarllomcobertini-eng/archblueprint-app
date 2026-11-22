import { Controller, Get, Query } from '@nestjs/common';
import { RanksService } from './ranks.service';

@Controller('ranks')
export class RanksController {
  constructor(private readonly service: RanksService) {}

  @Get()
  findAll(@Query('page') page?: string) {
    return this.service.findAll(page);
  }
}
