# ChessKernel

A production-grade, fully self-hosted online chess platform.

## Overview

ChessKernel is an open-source chess platform built for real-time multiplayer gameplay, inspired by Chess.com and Lichess. It is 100% self-hostable with no paid third-party dependencies.

## Features

- **Real-time Multiplayer** — WebSocket-powered live chess games
- **Matchmaking** — ELO-based queue with time control variants
- **Rating System** — Glicko-2 implementation
- **Bot Games** — Play against Stockfish (all difficulty levels)
- **Game Analysis** — Post-game analysis powered by local Stockfish
- **Friend System** — Add friends, see online status
- **Invitation System** — Challenge friends or share game links
- **Leaderboards** — Global and time-control-specific rankings
- **Spectator Mode** — Watch live games in real time
- **Match History** — Full game history with PGN export

## Tech Stack

| Layer      | Technology                                     |
|------------|------------------------------------------------|
| Frontend   | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Backend    | NestJS, TypeScript, Prisma ORM                 |
| Database   | PostgreSQL                                     |
| Cache      | Redis                                          |
| Realtime   | Socket.IO                                      |
| Chess      | chess.js + Stockfish (local binary/WASM)       |
| DevOps     | Docker, Docker Compose, Nginx, GitHub Actions  |

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- pnpm 8+

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/chesskernel.git
cd chesskernel

# Install dependencies
pnpm install

# Copy environment files
cp .env.example .env
cp client/.env.example client/.env
cp server/.env.example server/.env

# Start infrastructure (PostgreSQL + Redis)
docker compose -f docker/docker-compose.dev.yml up -d

# Run database migrations
pnpm --filter server db:migrate

# Start development servers
pnpm dev
```

### Production Deployment

```bash
docker compose -f docker/docker-compose.prod.yml up -d
```

## Repository Structure

```
chesskernel/
├── client/          # React frontend
├── server/          # NestJS backend
├── shared/          # Shared types and DTOs
├── docker/          # Docker configurations
├── scripts/         # Utility scripts
├── docs/            # Architecture and API documentation
└── .github/         # CI/CD workflows
```

## Documentation

See [docs/](./docs/) for:
- [System Overview](./docs/architecture/overview.md)
- [Backend Architecture](./docs/backend/backend-architecture.md)
- [Database Schema](./docs/database/database-schema.md)
- [API Contracts](./docs/api/api-contracts.md)
- [Deployment Guide](./docs/deployment/setup.md)

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and follow the [Git Workflow](./docs/development/git-workflow.md).

## License

MIT — see [LICENSE](./LICENSE)
