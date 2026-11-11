import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as querystring from 'querystring';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.APP_URL || true, credentials: true });
  // Enable body parsing except for multipart (handled manually in files upload)
  const instance = app.getHttpAdapter().getInstance();
  instance.use((req: any, _res: any, next: any) => {
    const ct = String(req.headers['content-type'] || '');
    if (ct.includes('multipart/form-data')) return next();
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(Buffer.from(c)));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) { req.body = {}; return next(); }
      try {
        if (ct.includes('application/json')) req.body = JSON.parse(raw);
        else if (ct.includes('application/x-www-form-urlencoded')) req.body = querystring.parse(raw);
        else req.body = raw;
      } catch {
        req.body = {};
      }
      next();
    });
    req.on('error', next);
  });
  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`API listening on ${port}`);
}
bootstrap();
