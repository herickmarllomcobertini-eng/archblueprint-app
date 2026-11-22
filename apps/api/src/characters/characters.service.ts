import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(page?: string) {
    return this.prisma.characterGroup.findMany({
      where: page ? { page } : undefined,
      orderBy: { sortOrder: "asc" },
      include: { characters: { orderBy: { sortOrder: "asc" }, include: { parts: { orderBy: { sortOrder: "asc" } } } } },
    });
  }
}
