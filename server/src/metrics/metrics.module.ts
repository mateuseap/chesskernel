import { Controller, Get, Header, Module } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Injectable } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PrismaService } from '../database/prisma.service';
import { gamesActive, registry } from './metrics';

@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics(): Promise<string> {
    return registry.metrics();
  }
}

@Injectable()
export class MetricsSampler {
  constructor(private readonly prisma: PrismaService) {}

  /** One tiny indexed count every 30s keeps the gauge honest across restarts. */
  @Interval(30_000)
  async sampleActiveGames(): Promise<void> {
    try {
      gamesActive.set(await this.prisma.game.count({ where: { status: 'active' } }));
    } catch {
      // Sampling must never crash the app; the next tick retries.
    }
  }
}

@Module({
  imports: [DatabaseModule],
  controllers: [MetricsController],
  providers: [MetricsSampler],
})
export class MetricsModule {}
