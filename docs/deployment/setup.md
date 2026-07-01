# Deployment Guide

## Prerequisites

| Tool | Min version |
|------|-------------|
| Docker | 24.x |
| Docker Compose | 2.x |
| Stockfish | 15+ (on host or installed in container) |
| Domain / DNS | Pointing to server IP |

---

## Quick Start (Production)

### 1. Clone & configure

```bash
git clone https://github.com/mateuseap/chesskernel.git
cd chesskernel

cp .env.example .env
```

Edit `.env`:

```env
# Server
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://chesskernel:CHANGE_ME@postgres:5432/chesskernel

# Redis
REDIS_URL=redis://redis:6379

# JWT — generate with: openssl rand -hex 64
JWT_SECRET=CHANGE_ME_64_BYTES_HEX
JWT_REFRESH_SECRET=CHANGE_ME_DIFFERENT_64_BYTES

# CORS — your frontend origin
ALLOWED_ORIGINS=https://chess.yourdomain.com

# Stockfish
STOCKFISH_PATH=/usr/games/stockfish

# Optional: initial admin account
ADMIN_EMAIL=admin@example.com
```

### 2. Start services

```bash
docker compose -f docker/docker-compose.prod.yml up -d
```

This starts:
- `postgres` — PostgreSQL 16
- `redis` — Redis 7
- `server` — NestJS API (port 3001 internally)
- `client` — Nginx serving the React bundle + reverse-proxying `/api` and `/socket.io`

### 3. Run migrations

```bash
docker compose -f docker/docker-compose.prod.yml exec server npx prisma migrate deploy
```

### 4. Verify

```bash
curl https://chess.yourdomain.com/api/leaderboards/blitz
# → {"games":[...]}
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | — | `production` |
| `PORT` | No | `3001` | NestJS listen port |
| `DATABASE_URL` | Yes | — | Prisma-compatible PostgreSQL URL |
| `REDIS_URL` | Yes | — | ioredis-compatible Redis URL |
| `JWT_SECRET` | Yes | — | Access token signing secret |
| `JWT_REFRESH_SECRET` | Yes | — | Refresh token signing secret |
| `JWT_EXPIRES_IN` | No | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token TTL |
| `ALLOWED_ORIGINS` | Yes | — | Comma-separated CORS origins |
| `STOCKFISH_PATH` | No | `stockfish` | Absolute path to Stockfish binary |
| `ANALYSIS_DEPTH` | No | `20` | Stockfish depth per move |
| `BCRYPT_ROUNDS` | No | `12` | bcrypt cost factor |

---

## Development Setup

```bash
# Install dependencies
pnpm install

# Copy env files
cp .env.example .env
cp server/.env.example server/.env

# Start PostgreSQL + Redis
docker compose -f docker/docker-compose.dev.yml up -d

# Apply DB migrations
pnpm --filter server db:migrate

# Start all packages with hot reload
pnpm dev
```

Frontend runs at `http://localhost:5173`, backend at `http://localhost:3001`.

### Stockfish (dev)

```bash
# Ubuntu/Debian
sudo apt install stockfish

# macOS
brew install stockfish
```

Set `STOCKFISH_PATH` in `server/.env` if the binary isn't on `$PATH`.

---

## Nginx Configuration

The production `client/` Dockerfile bundles Nginx. Key configuration:

```nginx
# Proxy REST API
location /api/ {
    proxy_pass http://server:3001/;
}

# Proxy WebSocket (Socket.IO)
location /socket.io/ {
    proxy_pass http://server:3001/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

# Serve React SPA
location / {
    try_files $uri $uri/ /index.html;
}
```

For TLS, terminate SSL at Nginx using Let's Encrypt / Certbot:

```bash
certbot --nginx -d chess.yourdomain.com
```

---

## Updating

```bash
git pull
docker compose -f docker/docker-compose.prod.yml build
docker compose -f docker/docker-compose.prod.yml up -d
docker compose -f docker/docker-compose.prod.yml exec server npx prisma migrate deploy
```

---

## Backup

```bash
# Dump PostgreSQL
docker compose -f docker/docker-compose.prod.yml exec postgres \
  pg_dump -U chesskernel chesskernel > backup-$(date +%Y%m%d).sql

# Restore
docker compose -f docker/docker-compose.prod.yml exec -T postgres \
  psql -U chesskernel chesskernel < backup-20260701.sql
```

---

## Health Checks

| URL | Expected |
|-----|----------|
| `GET /api/leaderboards/blitz` | 200 JSON array |
| Socket.IO `/` namespace | connects with valid JWT |

Docker Compose healthchecks are defined on `postgres` and `redis` services and the `server` service waits for them before starting.
