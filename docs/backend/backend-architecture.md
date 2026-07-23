# Backend Architecture

## Module Map

```
server/src/
├── app.module.ts          # Root module: wires everything together
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

```mermaid
flowchart TD
    HTTP["HTTP Request"]
    Pipe["Global Validation Pipe\n(class-validator + class-transformer)"]
    JWT["JwtAuthGuard\n(validates Bearer token, attaches user)"]
    Ctrl["Controller\n(delegates to Service)"]
    Svc["Service\n(business logic)"]
    DB["Prisma / PostgreSQL"]
    Cache["Redis\n(cache layer)"]
    Resp["JSON Response"]

    HTTP --> Pipe --> JWT --> Ctrl --> Svc
    Svc --> DB
    Svc --> Cache
    Svc --> Resp
```

```mermaid
flowchart TD
    WS["WebSocket Event"]
    WSGuard["WsAuthGuard\n(validates handshake token)"]
    GW["Gateway @SubscribeMessage handler"]
    State["GameStateService\n(Redis read/write)"]
    Games["GamesService\n(Prisma)"]
    Emit["socket.emit / socket.to(room).emit"]

    WS --> WSGuard --> GW --> State
    GW --> Games
    State --> Emit
    Games --> Emit
```

## Auth Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as NestJS
    participant DB as PostgreSQL

    C->>API: POST /auth/register
    API->>API: hash password (bcrypt, 12 rounds)
    API->>DB: create user + default ratings
    API-->>C: access_token (15m) + refresh_token (7d)

    C->>API: POST /auth/login
    API->>API: verify password hash
    API->>DB: store refresh_token hash
    API-->>C: access_token + refresh_token (HttpOnly cookie)

    C->>API: POST /auth/refresh
    API->>DB: verify token hash not revoked
    API->>DB: revoke old token, issue new pair
    API-->>C: new access_token + refresh_token

    C->>API: POST /auth/logout
    API->>DB: revoke refresh token
    API-->>C: 200 OK
```

Access token: JWT signed with `JWT_SECRET`, 15-minute TTL.  
Refresh token: opaque random bytes, stored as SHA-256 hash in `refresh_tokens`.

## Game State Machine

```mermaid
stateDiagram-v2
    [*] --> WAITING : game created
    WAITING --> ACTIVE : both players connect (clock starts)
    ACTIVE --> ACTIVE : valid move played
    ACTIVE --> ENDED : checkmate
    ACTIVE --> ENDED : stalemate / insufficient material
    ACTIVE --> ENDED : clock reaches 0
    ACTIVE --> ENDED : resignation (game:resign)
    ACTIVE --> ENDED : draw agreement
    ACTIVE --> ABANDONED : disconnect > 60 s grace period
    ENDED --> [*]
    ABANDONED --> [*]
```

Active game state is cached in Redis (`game:{id}`) for O(1) reconnect. PostgreSQL is authoritative; Redis is repopulated from DB on cache miss.

## Matchmaking

```mermaid
flowchart LR
    Join["Player joins queue\nZADD queue:{tc} rating userId"]
    Worker["Worker (500ms poll)\nZRANGEBYSCORE ±200 ELO"]
    Match{"Match\nfound?"}
    CreateGame["Create game record\nZREM both players"]
    Expand["Expand range ±50\nevery 10 s (max ±400)"]

    Join --> Worker --> Match
    Match -- yes --> CreateGame
    Match -- no --> Expand --> Worker
```

## Analysis Pipeline

```mermaid
flowchart TD
    Req["POST /analysis {gameId}"]
    Create["Create game_analysis\n(status: pending)"]
    Worker["AnalysisWorker (async)"]
    Loop["For each move in game_moves"]
    SetPos["Stockfish: position fen"]
    Go["Stockfish: go depth 20"]
    Parse["Parse info lines\n→ eval + best_move"]
    Classify["Classify move\n(cp delta vs best)"]
    Save["Save move_analysis"]
    Done["Update game_analysis\n(status: completed)"]
    Emit["Emit analysisComplete\n(Socket.IO)"]

    Req --> Create --> Worker --> Loop
    Loop --> SetPos --> Go --> Parse --> Classify --> Save --> Loop
    Loop -- done --> Done --> Emit
```

Move classification thresholds (centipawn eval drop from best move):

| Classification | CP Drop |
|----------------|---------|
| Brilliant | sub-optimal but tactically sharp (heuristic) |
| Best / Excellent | 0-10 |
| Good | 10-25 |
| Inaccuracy | 25-100 |
| Mistake | 100-300 |
| Blunder | >300 |
| Book | matches opening book |

## Rating System (Glicko-2)

After each ranked game:
1. Fetch `user_ratings` for both players (rating, φ, σ)
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
