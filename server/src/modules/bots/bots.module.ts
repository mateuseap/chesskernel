import { Module } from '@nestjs/common';
import { BotsService } from './bots.service';
import { AnalysisModule } from '../analysis/analysis.module';
import { GamesModule } from '../games/games.module';

@Module({
  imports: [AnalysisModule, GamesModule],
  providers: [BotsService],
  exports: [BotsService],
})
export class BotsModule {}
