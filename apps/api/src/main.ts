import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? true });

  // imagens .avif migradas do base64
  app.useStaticAssets(join(process.cwd(), 'storage/media'), {
    prefix: '/media/',
    maxAge: '30d',
    immutable: true,
  });

  // producao: a API serve o build do front (uma unica porta)
  const webDist = resolve(process.cwd(), process.env.WEB_DIST ?? '../web/dist');
  if (existsSync(join(webDist, 'index.html'))) {
    app.useStaticAssets(webDist, { index: false });
    app.use((req: any, res: any, next: () => void) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/media')) return next();
      res.sendFile(join(webDist, 'index.html'));
    });
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API em http://localhost:${port}/api`);
}
bootstrap();
