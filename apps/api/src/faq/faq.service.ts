import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(_page?: string) {
    return this.prisma.faqItem.findMany({ orderBy: { sortOrder: "asc" } });
  }
}
