import { Controller, Get, Query } from '@nestjs/common';
import { GlossaryService } from './glossary.service';

@Controller('glossary')
export class GlossaryController {
  constructor(private readonly service: GlossaryService) {}

  @Get()
  findAll(@Query('page') page?: string) {
    return this.service.findAll(page);
  }
}
