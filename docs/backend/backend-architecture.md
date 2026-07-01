# Backend Architecture

## Module Map

```
server/src/
├── app.module.ts          # Root module — wires everything together
├── main.ts                # Bootstrap: NestJS app, Prisma hooks, validation pipe
├── common/                # Guards, decorators, interceptors, filters
│   ├── guards/            # JwtAuthGuard, WsAuthGuard
│   ├── decorators/        # @CurrentUser(), @Public()
│   └── filters/           # AllExceptionsFilter (WS + HTTP)
├── config/                # ConfigModule wrappers (env validation)
├── database/              # Prisma service (singleton, lifecycle hooks)
├── modules/
│   ├── auth/              # JWT issue/refresh/revoke, bcrypt hashing
│   ├── users/             # Profile read/update, search
│   ├── games/             # Game lookup, history
│   ├── matchmaking/       # ELO queue (Redis Sorted Sets), bot game spawn
│   ├── analysis/          # Stockfish UCI dispatcher, move classification
│   ├── friends/           # Friend requests, accept, list
│   ├── invitations/       # Token-based game invites
│   ├── leaderboards/      # Top-N by time control
│   ├── notifications/     # In-app notification store
│   └── ratings/           # Glicko-2 update (called on game end)
└── websocket/
    ├── game.gateway.ts    # All in-game Socket.IO events
    └── queue.gateway.ts   # Matchmaking events
```

## Request Lifecycle

```
HTTP Request
  ↓
NestJS Global Pipe (class-validator + class-transformer)
  ↓
JwtAuthGuard  →  validates Bearer token, attaches user to request
  ↓
Controller  →  delegates to Service
  ↓
Service  →  Prisma (DB) + Redis (cache)  →  returns DTO
  ↓
Response (JSON)
```

```
WebSocket Event
  ↓
WsAuthGuard  →  validates token from socket handshake auth
  ↓
Gateway @SubscribeMessage handler
  ↓
GameStateService (Redis read/write)  +  GamesService (Prisma)
  ↓
socket.emit / socket.to(room).emit
```

## Auth Flow

```
POST /auth/register
  → hash password (bcrypt, 12 rounds)
  → create user + default ratings
  → return access token (15 min) + refresh token (7 days)

POST /auth/login
  → verify password hash
  → store refresh token hash in refresh_tokens table
  → return access token + refresh token (HttpOnly cookie)

POST /auth/refresh
  → verify refresh token signature + expiry
  → check token hash exists in DB and not revoked
  → rotate: revoke old, issue new pair

POST /auth/logout
  → revoke refresh token in DB
```

Access token: JWT signed with `JWT_SECRET`, 15-minute TTL.
Refresh token: opaque random bytes, stored as SHA-256 hash.

## Game State Machine

States: `waiting → active → ended | abandoned`

Transitions are authoritative on the server only:

| Event | From | To | Notes |
|-------|------|-----|-------|
| Both players connect | waiting | active | Starts clock |
| Move played | active | active | Validates via chess.js |
| Checkmate / stalemate | active | ended | Computed by chess.js |
| Clock reaches 0 | active | ended | Server clock authority |
| Resignation | active | ended | socket `game:resign` |
| Draw agreement | active | ended | Both sides must agree |
| Player disconnects | active | active | Grace period (60s), then forfeit |

Active game state is cached in Redis (`game:{id}`) for O(1) reconnect. PostgreSQL is the authoritative store — Redis is repopulated from DB on cache miss.

## Matchmaking

Uses a Redis Sorted Set per time control (`queue:{timeControl}`):
- Score = player rating
- `ZADD` on join, `ZREM` on leave/match
- Matching: dequeue pair within ±200 ELO window using `ZRANGEBYSCORE`
- Bot games bypass the queue and directly spawn a game record

## Analysis Pipeline

```
POST /analysis { gameId }
  → create game_analysis record (status: pending)
  → spawn AnalysisWorker (NestJS queue or direct async)

AnalysisWorker:
  for each move in game_moves:
    → set position in Stockfish (UCI: "position fen <fen>")
    → "go depth 20"
    → parse info lines → extract eval + best move
    → classify move (compare played move vs best move, eval delta)
    → save to move_analysis

  → update game_analysis status: completed
```

Move classification thresholds (centipawn eval drop from best move):
- Brilliant: engine says sub-optimal but tactically sharp (heuristic)
- Best / Excellent: 0–10 cp below best
- Good: 10–25 cp below best
- Inaccuracy: 25–100 cp below best
- Mistake: 100–300 cp below best
- Blunder: >300 cp below best
- Book: move matches opening book

## Rating System (Glicko-2)

After each ranked game:
1. Fetch `user_ratings` for both players (rating φ σ)
2. Run Glicko-2 update: single-game period
3. Clamp φ between 30 and 350
4. Write new rating values + `games_played++`

Bot games do not affect ratings.

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@nestjs/core` | DI, module system, lifecycle |
| `@nestjs/jwt` | JWT sign/verify |
| `@nestjs/websockets` + `socket.io` | WebSocket gateway |
| `@prisma/client` | Type-safe DB client |
| `ioredis` | Redis client |
| `chess.js` | Server-side move validation |
| `bcrypt` | Password hashing |
| `class-validator` / `class-transformer` | DTO validation pipeline |
| `zod` | Config env validation |
