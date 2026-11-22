import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EntitiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(page?: string) {
    return this.prisma.entityGroup.findMany({
      where: page ? { page } : undefined,
      include: { entities: { orderBy: { sortOrder: "asc" }, include: { tags: { orderBy: { sortOrder: "asc" } } } } },
    });
  }
}
