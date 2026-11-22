import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GlossaryService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(page?: string) {
    return this.prisma.glossaryTerm.findMany({ where: page ? { page } : undefined, orderBy: { sortOrder: "asc" } });
  }
}
