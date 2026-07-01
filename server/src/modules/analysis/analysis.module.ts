import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { StockfishService } from './stockfish.service';

@Module({
  controllers: [AnalysisController],
  providers: [AnalysisService, StockfishService],
  exports: [AnalysisService, StockfishService],
})
export class AnalysisModule {}
