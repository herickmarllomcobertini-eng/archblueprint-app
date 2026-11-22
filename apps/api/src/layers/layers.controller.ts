import { Controller, Get, Query } from '@nestjs/common';
import { LayersService } from './layers.service';

@Controller('layers')
export class LayersController {
  constructor(private readonly service: LayersService) {}

  @Get()
  findAll(@Query('page') page?: string) {
    return this.service.findAll(page);
  }
}
