import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import { stockfishDuration, stockfishRunning } from '../../metrics/metrics';
import { join } from 'path';
import { existsSync } from 'fs';

interface StockfishResult {
  bestMove: string;
  ponder: string | null;
  score: { type: 'cp' | 'mate'; value: number } | null;
}

const STOCKFISH_PATHS = [
  join(process.cwd(), 'bin', 'stockfish'),
  '/usr/bin/stockfish',
  '/usr/local/bin/stockfish',
  '/opt/homebrew/bin/stockfish',
];

@Injectable()
export class StockfishService implements OnModuleDestroy {
  private readonly logger = new Logger(StockfishService.name);
  private stockfishPath: string | null = null;

  onModuleDestroy() {}

  private findStockfish(): string {
    if (this.stockfishPath) return this.stockfishPath;

    for (const path of STOCKFISH_PATHS) {
      if (existsSync(path)) {
        this.stockfishPath = path;
        this.logger.log(`Stockfish found at: ${path}`);
        return path;
      }
    }
    throw new Error(
      'Stockfish binary not found. Install it or place it at server/bin/stockfish',
    );
  }

  async evaluatePosition(fen: string, depth = 18): Promise<StockfishResult> {
    return this.timed('evaluate', () => new Promise((resolve, reject) => {
      let process: ChildProcess;
      try {
        process = spawn(this.findStockfish(), [], { stdio: 'pipe' });
      } catch (err) {
        reject(new Error(`Failed to spawn Stockfish: ${(err as Error).message}`));
        return;
      }

      let output = '';
      let score: { type: 'cp' | 'mate'; value: number } | null = null;
      let bestMove = '';
      let ponder: string | null = null;
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          process.kill();
          reject(new Error('Stockfish timed out'));
        }
      }, 10_000);

      process.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
        const lines = output.split('\n');
        output = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('info') && line.includes('score')) {
            const cpMatch = line.match(/score cp (-?\d+)/);
            const mateMatch = line.match(/score mate (-?\d+)/);
            if (cpMatch) score = { type: 'cp', value: parseInt(cpMatch[1], 10) };
            else if (mateMatch) score = { type: 'mate', value: parseInt(mateMatch[1], 10) };
          }

          if (line.startsWith('bestmove')) {
            const parts = line.trim().split(' ');
            bestMove = parts[1] ?? '';
            ponder = parts[3] ?? null;
            resolved = true;
            clearTimeout(timeout);
            process.kill();
            resolve({ bestMove, ponder, score });
          }
        }
      });

      process.stderr?.on('data', (data: Buffer) => {
        this.logger.warn(`Stockfish stderr: ${data.toString().trim()}`);
      });

      process.on('error', (err) => {
        clearTimeout(timeout);
        if (!resolved) reject(err);
      });

      const commands = [
        'uci',
        'isready',
        `position fen ${fen}`,
        `go depth ${depth}`,
      ].join('\n') + '\n';

      process.stdin?.write(commands);
    }));
  }

  /** Tracks in-flight count and duration of every engine call. */
  private async timed<T>(op: string, run: () => Promise<T>): Promise<T> {
    stockfishRunning.inc();
    const stop = stockfishDuration.startTimer({ op });
    try {
      return await run();
    } finally {
      stop();
      stockfishRunning.dec();
    }
  }

  async getBestMove(
    fen: string,
    skillLevel: number,
    moveTimeMs: number,
    depth?: number,
  ): Promise<string> {
    return this.timed('bestmove', () => new Promise((resolve, reject) => {
      let process: ChildProcess;
      try {
        process = spawn(this.findStockfish(), [], { stdio: 'pipe' });
      } catch (err) {
        reject(err);
        return;
      }

      let output = '';
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          process.kill();
          reject(new Error('Stockfish timed out'));
        }
      }, moveTimeMs + 5_000);

      process.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
        const lines = output.split('\n');
        output = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('bestmove')) {
            const move = line.trim().split(' ')[1] ?? '';
            resolved = true;
            clearTimeout(timeout);
            process.kill();
            resolve(move);
          }
        }
      });

      process.on('error', (err) => {
        clearTimeout(timeout);
        if (!resolved) reject(err);
      });

      const goCmd = depth
        ? `go depth ${depth}`
        : `go movetime ${moveTimeMs}`;

      const commands = [
        'uci',
        `setoption name Skill Level value ${skillLevel}`,
        'isready',
        `position fen ${fen}`,
        goCmd,
      ].join('\n') + '\n';

      process.stdin?.write(commands);
    }));
  }
}
