import { Injectable } from '@nestjs/common';
import { GameStateService } from './game-state.service';

interface ClockTimeoutHandle {
  gameId: string;
  timeout: NodeJS.Timeout;
  color: 'white' | 'black';
}

@Injectable()
export class ClockService {
  private readonly activeTimeouts = new Map<string, ClockTimeoutHandle>();

  constructor(private readonly gameStateService: GameStateService) {}

  scheduleTimeout(
    gameId: string,
    color: 'white' | 'black',
    remainingMs: number,
    onTimeout: (gameId: string, losingColor: 'white' | 'black') => void,
  ): void {
    this.cancelTimeout(gameId);

    const timeout = setTimeout(() => {
      this.activeTimeouts.delete(gameId);
      onTimeout(gameId, color);
    }, remainingMs + 500);

    this.activeTimeouts.set(gameId, { gameId, timeout, color });
  }

  cancelTimeout(gameId: string): void {
    const handle = this.activeTimeouts.get(gameId);
    if (handle) {
      clearTimeout(handle.timeout);
      this.activeTimeouts.delete(gameId);
    }
  }

  hasActiveTimeout(gameId: string): boolean {
    return this.activeTimeouts.has(gameId);
  }
}
