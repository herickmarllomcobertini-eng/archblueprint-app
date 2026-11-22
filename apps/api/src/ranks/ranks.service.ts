import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RanksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(page?: string) {
    return this.prisma.rankGroup.findMany({
      where: page ? { page } : undefined,
      include: { ranks: { orderBy: { sortOrder: "asc" } } },
    });
  }
}
