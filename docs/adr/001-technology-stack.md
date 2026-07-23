# ADR-001: Technology Stack Selection

**Status:** Accepted  
**Date:** 2026-07-01

## Context

ChessKernel must be fully self-hosted with no paid third-party dependencies. The platform requires real-time communication, strong TypeScript support, and the ability to integrate a native chess engine.

## Decisions

### Backend: NestJS over Express/Fastify

NestJS provides dependency injection, module isolation, built-in WebSocket gateway, Swagger integration, and class-validator, all of which map directly to our feature set. The structure enforces the modular architecture we require.

### ORM: Prisma over TypeORM/Drizzle

Prisma's type-safe client, excellent migration tooling, and schema-first approach reduce runtime errors. TypeORM has well-known N+1 issues and weaker type inference.

### Realtime: Socket.IO over raw WebSocket

Socket.IO provides rooms, namespaces, automatic reconnection, and a Redis adapter for horizontal scaling, all needed without additional infrastructure.

### Chess Rules: chess.js (no alternatives)

chess.js is the standard JavaScript chess library. It runs identically on client and server, enabling optimistic updates client-side and authoritative validation server-side.

### Chess Engine: Stockfish binary over cloud API

Stockfish is the strongest open-source engine. Running it as a local binary costs nothing, has no latency penalty beyond local IPC, and eliminates any external dependency.

### Rating: Glicko-2 over Elo

Glicko-2 handles rating uncertainty (RD) and accounts for player inactivity. It is the standard in competitive online chess (Lichess uses Glicko-2).

### State Cache: Redis over in-memory

Redis enables horizontal scaling of WebSocket servers via pub/sub, persists queue state across server restarts, and provides TTL-based cache expiry.

## Consequences

- All team members must know TypeScript (enforced by monorepo)
- Stockfish binary must be provisioned per deployment environment
- Redis is a required infrastructure dependency in all environments
