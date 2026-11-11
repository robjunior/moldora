import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.APP_URL || true, credentials: true });
  // Enable body parsing except for multipart (handled manually in files upload)
  const instance = app.getHttpAdapter().getInstance();
  instance.use((req: any, res: any, next: any) => {
    const ct = req.headers['content-type'] || '';
    if (ct.includes('multipart/form-data')) return next();
    const express = require('express');
    express.json({ limit: '2mb' })(req, res, (err: any) => {
      if (err) return next(err);
      express.urlencoded({ extended: true, limit: '2mb' })(req, res, next);
    });
  });
  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`API listening on ${port}`);
}
bootstrap();
