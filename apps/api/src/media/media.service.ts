import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(_page?: string) {
    return this.prisma.media.findMany({ orderBy: { id: "asc" } });
  }
}
