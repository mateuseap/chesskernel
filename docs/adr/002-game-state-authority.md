# ADR-002: Server-Side Game State Authority

**Status:** Accepted  
**Date:** 2026-07-01

## Context

In a real-time chess game, moves must be validated to prevent cheating. The question is whether the client or server is the authoritative source of truth for game state.

## Decision

The **server is the sole authority** for game state. The client uses chess.js for optimistic UI updates only.

### Flow

1. Client validates move locally with chess.js (instant UI feedback)
2. Client sends move to server via WebSocket
3. Server validates move with chess.js (authoritative)
4. If invalid: server sends `move:rejected` event; client reverts
5. If valid: server persists move, broadcasts to all room participants

### Clock Management

The server manages both clocks. Clock state is stored in Redis with millisecond precision. The client displays the server-provided remaining time on each move receipt, and only interpolates locally between server updates.

## Consequences

- Every move requires a round-trip, with no purely local game progression
- Server must handle move validation at WebSocket message rate
- Reconnecting clients receive full game state from Redis/DB
- Spectators see the same authoritative state as players
