import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StockfishService } from './stockfish.service';
import { Chess } from 'chess.js';

const ANALYSIS_DEPTH = 18;
const BLUNDER_THRESHOLD = -200;
const MISTAKE_THRESHOLD = -100;
const INACCURACY_THRESHOLD = -50;

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockfish: StockfishService,
  ) {}

  async requestAnalysis(gameId: string): Promise<{ analysisId: string }> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { moves: { orderBy: { moveNumber: 'asc' } } },
    });
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);

    const existing = await this.prisma.gameAnalysis.findUnique({ where: { gameId } });
    if (existing) return { analysisId: existing.id };

    const analysis = await this.prisma.gameAnalysis.create({
      data: { gameId, status: 'pending' },
    });

    this.runAnalysis(analysis.id, game.id, game.moves).catch((err) => {
      this.logger.error(`Analysis ${analysis.id} failed: ${err.message}`);
      this.prisma.gameAnalysis
        .update({ where: { id: analysis.id }, data: { status: 'failed' } })
        .catch(() => {});
    });

    return { analysisId: analysis.id };
  }

  async getAnalysis(gameId: string) {
    const analysis = await this.prisma.gameAnalysis.findUnique({
      where: { gameId },
      include: { moveAnalyses: { orderBy: { moveNumber: 'asc' } } },
    });
    if (!analysis) throw new NotFoundException('Analysis not found');
    return analysis;
  }

  private async runAnalysis(
    analysisId: string,
    gameId: string,
    moves: Array<{ moveNumber: number; color: string; san: string; fenAfter: string }>,
  ): Promise<void> {
    await this.prisma.gameAnalysis.update({
      where: { id: analysisId },
      data: { status: 'processing', depth: ANALYSIS_DEPTH },
    });

    const chess = new Chess();
    let previousEval: number | null = null;

    const moveResults = [];

    for (const move of moves) {
      const fenBefore = chess.fen();
      chess.move(move.san);

      const result = await this.stockfish.evaluatePosition(chess.fen(), ANALYSIS_DEPTH);

      const currentEval = result.score?.type === 'cp'
        ? result.score.value
        : result.score?.type === 'mate'
          ? (result.score.value > 0 ? 10000 : -10000)
          : 0;

      const classification = this.classifyMove(
        previousEval,
        currentEval,
        move.color as 'white' | 'black',
        move.moveNumber === 1 && move.color === 'white',
      );

      moveResults.push({
        analysisId,
        moveNumber: move.moveNumber,
        color: move.color,
        evalCentipawns: result.score?.type === 'cp' ? result.score.value : null,
        mateIn: result.score?.type === 'mate' ? result.score.value : null,
        bestMoveUci: result.bestMove,
        classification,
      });

      previousEval = currentEval;
    }

    await this.prisma.$transaction([
      this.prisma.moveAnalysis.createMany({ data: moveResults }),
      this.prisma.gameAnalysis.update({
        where: { id: analysisId },
        data: { status: 'completed', completedAt: new Date() },
      }),
    ]);
  }

  private classifyMove(
    prevEval: number | null,
    currEval: number,
    color: 'white' | 'black',
    isBook: boolean,
  ): string {
    if (isBook) return 'book';
    if (prevEval === null) return 'good';

    const evalDelta = color === 'white'
      ? currEval - prevEval
      : prevEval - currEval;

    if (evalDelta >= 0) return 'best';
    if (evalDelta >= INACCURACY_THRESHOLD) return 'good';
    if (evalDelta >= MISTAKE_THRESHOLD) return 'inaccuracy';
    if (evalDelta >= BLUNDER_THRESHOLD) return 'mistake';
    return 'blunder';
  }
}
