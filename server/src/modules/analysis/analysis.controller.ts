import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class RequestAnalysisDto {
  @ApiProperty()
  @IsString()
  gameId: string;
}

@ApiTags('analysis')
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async requestAnalysis(@Body() dto: RequestAnalysisDto) {
    return this.analysisService.requestAnalysis(dto.gameId);
  }

  @Get(':gameId')
  async getAnalysis(@Param('gameId') gameId: string) {
    return this.analysisService.getAnalysis(gameId);
  }
}
