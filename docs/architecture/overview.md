# System Overview

ChessKernel is a self-hosted, real-time chess platform. All services run within a single Docker Compose stack. No external paid APIs are used.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser Client                          │
│              React 18 + Vite + TypeScript + Tailwind            │
└────────────────────────┬─────────────────┬──────────────────────┘
                         │ HTTP/REST        │ WebSocket (Socket.IO)
                         ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Nginx (Reverse Proxy)                    │
│              TLS termination, static assets, rate limit         │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NestJS API Server                            │
│                                                                  │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │   Auth   │ │   Users   │ │  Games   │ │   Matchmaking    │  │
│  └──────────┘ └───────────┘ └──────────┘ └──────────────────┘  │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Ratings  │ │ Analysis  │ │   Bots   │ │    Friends       │  │
│  └──────────┘ └───────────┘ └──────────┘ └──────────────────┘  │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐                        │
│  │Invitations│ │ Leaderboards│ │  Admin  │                      │
│  └──────────┘ └───────────┘ └──────────┘                        │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Socket.IO Gateway (WebSocket)                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────┬──────────────────┘
                        │                      │
              ┌─────────▼──────┐    ┌──────────▼──────┐
              │   PostgreSQL   │    │      Redis       │
              │  (persistent)  │    │  (cache/pubsub)  │
              └────────────────┘    └─────────────────┘
                        │
              ┌─────────▼──────┐
              │   Stockfish    │
              │ (local binary) │
              └────────────────┘
```

## Component Responsibilities

### Client
- Renders game board and UI
- Manages WebSocket connection lifecycle
- Optimistically updates local game state via chess.js
- Sends moves and receives authoritative server state

### Nginx
- Proxies REST requests to NestJS on `/api/*`
- Proxies WebSocket upgrades to NestJS on `/socket.io/*`
- Serves frontend static bundle
- Enforces rate limits per IP

### NestJS API
- Authoritative game state machine
- Validates all moves server-side via chess.js
- Issues and validates JWT tokens
- Orchestrates matchmaking queues via Redis
- Dispatches Stockfish analysis jobs
- Pushes real-time events through Socket.IO

### PostgreSQL
- Authoritative persistent store
- Stores users, games, moves, ratings, friends, invitations

### Redis
- Matchmaking queue state (Sorted Sets)
- Active game state cache (fast reads for reconnects)
- Socket room membership
- Pub/Sub for horizontal scaling of WebSocket servers

### Stockfish
- Local binary invoked by analysis service
- UCI protocol communication via child_process
- Used for bot games and post-game analysis

## Key Design Decisions

See [ADRs](../adr/) for detailed decision records.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Realtime transport | Socket.IO | Fallback support, rooms, namespaces |
| Rating system | Glicko-2 | Standard in competitive chess, handles inactivity |
| Chess validation | Server-side chess.js | Prevents cheating; client uses chess.js optimistically |
| Bot engine | Stockfish binary | Best open-source engine; WASM fallback for dev |
| Auth | JWT + refresh tokens | Stateless, works with horizontal scaling |
| ORM | Prisma | Type-safe, excellent migration tooling |
| Queue | Redis Sorted Sets | O(log n) insert/dequeue by rating |
