import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EpisodesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(_page?: string) {
    return this.prisma.episode.findMany({ orderBy: { sortOrder: "asc" } });
  }

  spinoffs() {
    return this.prisma.spinoff.findMany({ orderBy: { sortOrder: "asc" } });
  }
}
