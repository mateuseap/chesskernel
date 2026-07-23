/**
 * Prometheus metrics, hand-picked for a 1 vCPU host: what is being used
 * (games, sockets) and what can degrade it (Stockfish work). No default
 * process metrics: the scrape must stay tiny.
 */
import { Gauge, Histogram, Registry } from 'prom-client';

export const registry = new Registry();

export const gamesActive = new Gauge({
  name: 'chesskernel_games_active',
  help: 'Games currently in active status',
  registers: [registry],
});

export const socketConnections = new Gauge({
  name: 'chesskernel_socket_connections',
  help: 'Socket.IO clients currently connected',
  registers: [registry],
});

export const stockfishRunning = new Gauge({
  name: 'chesskernel_stockfish_running',
  help: 'Stockfish evaluations currently in flight',
  registers: [registry],
});

export const stockfishDuration = new Histogram({
  name: 'chesskernel_stockfish_duration_seconds',
  help: 'Stockfish call duration by operation',
  labelNames: ['op'],
  buckets: [0.25, 1, 3, 10, 30],
  registers: [registry],
});
