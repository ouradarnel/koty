import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  const jwtSecret = configService.get<string>('JWT_SECRET', '');
  const jwtRefreshSecret = configService.get<string>('JWT_REFRESH_SECRET', '');
  if (
    nodeEnv === 'production' &&
    (jwtSecret.includes('change-this-in-production') || jwtRefreshSecret.includes('change-this-in-production'))
  ) {
    throw new Error('JWT secrets must be replaced with strong secrets in production');
  }

  app.enableShutdownHooks();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    const requestId = String(req.header('x-request-id') || randomUUID());
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      const payload = {
        level: 'info',
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        ip: req.ip,
        userAgent: req.get('user-agent') ?? '',
      };
      logger.log(JSON.stringify(payload));
    });

    next();
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  const corsOriginRaw = configService.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  const allowedOrigins = corsOriginRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`API running on http://localhost:${port}/api`);
}

bootstrap();
