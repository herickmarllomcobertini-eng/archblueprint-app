import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelmapService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(_page?: string) {
    const [nodes, edges] = await Promise.all([
      this.prisma.relNode.findMany({ orderBy: { sortOrder: "asc" } }),
      this.prisma.relEdge.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);
    return { nodes, edges: edges.map((e) => ({ from: e.fromId, to: e.toId, label: e.label })) };
  }
}
