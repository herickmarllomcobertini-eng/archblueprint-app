import { Controller, Get, Query } from '@nestjs/common';
import { FaqService } from './faq.service';

@Controller('faq')
export class FaqController {
  constructor(private readonly service: FaqService) {}

  @Get()
  findAll(@Query('page') page?: string) {
    return this.service.findAll(page);
  }
}
