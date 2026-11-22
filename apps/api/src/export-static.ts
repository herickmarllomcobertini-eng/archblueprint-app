/**
 * Exporta o conteudo do SQLite para arquivos estaticos (modo de hospedagem gratuita, ex.: Vercel):
 *   apps/web/public/data/<pagina>.json   (o mesmo JSON que a API entrega em /api/pages/<pagina>)
 *   apps/web/public/media/**             (as imagens .avif)
 * Depois disso o site roda sem servidor: so arquivos.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { cpSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { AppModule } from './app.module';
import { PagesService } from './pages/pages.service';
import { PrismaService } from './prisma/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService, { strict: false });
  const pages = app.get(PagesService, { strict: false });

  const publicDir = resolve(process.cwd(), process.env.WEB_PUBLIC ?? '../web/public');
  const dataDir = join(publicDir, 'data');
  mkdirSync(dataDir, { recursive: true });

  const slugs = (await prisma.page.findMany({ select: { slug: true } })).map((p) => p.slug);
  for (const slug of slugs) {
    const payload = await pages.findOne(slug);
    writeFileSync(join(dataDir, `${slug}.json`), JSON.stringify(payload));
    console.log(`exportado: data/${slug}.json`);
  }

  cpSync(join(process.cwd(), 'storage/media'), join(publicDir, 'media'), { recursive: true });
  console.log('exportado: media/');
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
