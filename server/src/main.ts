import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const clientOrigin = configService.get<string>('CLIENT_ORIGIN', 'http://localhost:5173');
  const isProduction = configService.get<string>('app.nodeEnv') === 'production';

  // Security response headers. The API returns JSON only, so the default
  // Content-Security-Policy (which targets HTML) is disabled to avoid
  // interfering with the Swagger UI that is served in non-production.
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  app.setGlobalPrefix('api', { exclude: ['metrics'] }); // /metrics is cluster-internal (not proxied by nginx)

  app.enableCors({
    origin: clientOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger exposes the full API surface and schemas; keep it out of
  // production to avoid handing that map to an attacker.
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ChessKernel API')
      .setDescription('ChessKernel REST API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
  console.log(`ChessKernel server running on http://localhost:${port}`);
  if (!isProduction) {
    console.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }
}

bootstrap();
