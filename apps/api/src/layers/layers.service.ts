import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LayersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page?: string) {
    const [layerGroups, camadaGroups] = await Promise.all([
      this.prisma.layerGroup.findMany({
        where: page ? { page } : undefined,
        orderBy: { sortOrder: "asc" },
        include: { layers: { orderBy: { sortOrder: "asc" } } },
      }),
      this.prisma.camadaGroup.findMany({
        where: page ? { page } : undefined,
        include: { camadas: { orderBy: { sortOrder: "asc" } } },
      }),
    ]);
    return { layerGroups, camadaGroups };
  }
}
