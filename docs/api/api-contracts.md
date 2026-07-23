# API Contracts

Base URL: `https://<host>/api`

All endpoints return JSON. Authenticated endpoints require:
```
Authorization: Bearer <access_token>
```

---

## Auth

### `POST /auth/register`
Create a new account.

**Body**
```json
{ "username": "alice", "email": "alice@example.com", "password": "s3cr3t!" }
```
**Response 201**
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<opaque>",
  "user": { "id": "<uuid>", "username": "alice", "email": "alice@example.com" }
}
```

---

### `POST /auth/login`
**Body**
```json
{ "email": "alice@example.com", "password": "s3cr3t!" }
```
**Response 200**: same shape as register.

---

### `POST /auth/refresh`
Rotate token pair. Send current refresh token.

**Body**
```json
{ "refreshToken": "<opaque>" }
```
**Response 200**: new `accessToken` + `refreshToken`.

---

### `POST /auth/logout` 🔒
Revoke current refresh token.

**Response 204**: no body.

---

## Users

### `GET /users/search?q=<query>` 🔒
Search users by username prefix.

**Response 200**
```json
[{ "id": "...", "username": "alice", "avatarUrl": null }]
```

---

### `GET /users/:username` 🔒
Public profile.

**Response 200**
```json
{
  "id": "...",
  "username": "alice",
  "avatarUrl": null,
  "bio": null,
  "country": "BR",
  "createdAt": "2026-07-01T00:00:00Z",
  "ratings": {
    "bullet":     { "rating": 1200, "gamesPlayed": 0 },
    "blitz":      { "rating": 1350, "gamesPlayed": 42 },
    "rapid":      { "rating": 1400, "gamesPlayed": 18 },
    "classical":  { "rating": 1200, "gamesPlayed": 0 }
  }
}
```

---

### `PUT /users/me` 🔒
Update own profile.

**Body** (all fields optional)
```json
{ "bio": "Chess enthusiast", "avatarUrl": "https://...", "country": "BR" }
```
**Response 200**: updated user object.

---

## Games

### `GET /games/me/history` 🔒
Paginated game history for the authenticated user.

**Query params:** `page=1&limit=20&timeControl=blitz`

**Response 200**
```json
{
  "games": [
    {
      "id": "...",
      "white": { "id": "...", "username": "alice" },
      "black": { "id": "...", "username": "bob" },
      "timeControl": "blitz",
      "result": "white",
      "termination": "checkmate",
      "whiteRatingDelta": 12,
      "blackRatingDelta": -12,
      "startedAt": "2026-07-01T10:00:00Z",
      "endedAt": "2026-07-01T10:05:30Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### `GET /games/user/:userId` 🔒
Same shape as above, for any user ID.

---

### `GET /games/:id` 🔒
Full game detail including moves.

**Response 200**
```json
{
  "id": "...",
  "white": { "id": "...", "username": "alice" },
  "black": { "id": "...", "username": "bob" },
  "timeControl": "blitz",
  "initialTimeMs": 180000,
  "incrementMs": 2000,
  "status": "ended",
  "result": "white",
  "termination": "checkmate",
  "pgn": "1. e4 e5 2. ...",
  "isBotGame": false,
  "startedAt": "...",
  "endedAt": "...",
  "moves": [
    {
      "moveNumber": 1, "color": "white",
      "san": "e4", "uci": "e2e4",
      "fenAfter": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      "timeLeftMs": 178000
    }
  ]
}
```

---

## Matchmaking

### `POST /matchmaking/bot` 🔒
Start a game against Stockfish immediately.

**Body**
```json
{ "timeControl": "blitz", "initialTimeMs": 180000, "incrementMs": 2000, "difficulty": "medium" }
```
`difficulty`: `easy | medium | hard | max`

**Response 201**
```json
{ "gameId": "<uuid>" }
```

---

## Analysis

### `POST /analysis` 🔒
Request Stockfish analysis for a completed game.

**Body**
```json
{ "gameId": "<uuid>" }
```
**Response 201**
```json
{ "id": "<uuid>", "status": "pending" }
```

---

### `GET /analysis/:gameId` 🔒
Fetch analysis results.

**Response 200**
```json
{
  "id": "...",
  "gameId": "...",
  "status": "completed",
  "depth": 20,
  "moveAnalyses": [
    {
      "moveNumber": 1,
      "color": "white",
      "evalCentipawns": 30,
      "mateIn": null,
      "bestMoveUci": "e2e4",
      "classification": "best"
    }
  ]
}
```

`status`: `pending | processing | completed | failed`

---

## Friends

### `GET /friends` 🔒
List accepted friends.

**Response 200**
```json
[{ "id": "...", "username": "bob", "avatarUrl": null, "isOnline": true }]
```

---

### `GET /friends/requests` 🔒
Incoming pending friend requests.

---

### `POST /friends/request` 🔒
Send a friend request.

**Body**
```json
{ "username": "bob" }
```
**Response 201**: friendship record.

---

### `POST /friends/:id/accept` 🔒
Accept a pending request.

**Response 200**: updated friendship.

---

### `DELETE /friends/:id` 🔒
Remove friend or cancel request.

**Response 204**

---

## Invitations

### `POST /invitations` 🔒
Create an open invite (generates a shareable token).

**Body**
```json
{
  "timeControl": "rapid",
  "initialTimeMs": 600000,
  "incrementMs": 0,
  "colorPreference": "random"
}
```
**Response 201**
```json
{ "token": "<64-char-token>", "expiresAt": "..." }
```

---

### `GET /invitations/:token`
Get invite details (public, no auth required).

---

### `POST /invitations/:token/accept` 🔒
Accept and start the game.

**Response 200**
```json
{ "gameId": "<uuid>" }
```

---

## Leaderboards

### `GET /leaderboards/:timeControl`
`timeControl`: `bullet | blitz | rapid | classical`

**Query:** `limit=50`

**Response 200**
```json
[
  { "rank": 1, "username": "alice", "rating": 2100, "gamesPlayed": 300 }
]
```

---

## Notifications

### `GET /notifications` 🔒
List latest 50 notifications.

**Response 200**
```json
[
  {
    "id": "...",
    "type": "friend_request",
    "payload": { "fromUsername": "bob" },
    "read": false,
    "createdAt": "..."
  }
]
```

---

### `PUT /notifications/read-all` 🔒
Mark all as read. **Response 204**

### `PUT /notifications/:id/read` 🔒
Mark one as read. **Response 200**

---

## WebSocket Events (Socket.IO)

Connect to `/` namespace with handshake auth:
```js
io('https://<host>', { auth: { token: '<access_token>' } })
```

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `queue:join` | `{ timeControl, initialTimeMs, incrementMs }` | Join matchmaking queue |
| `queue:leave` | `{}` | Leave queue |
| `game:spectate` | `{ gameId }` | Join game room (player or spectator) |
| `game:leave` | `{ gameId }` | Leave game room |
| `game:move` | `{ gameId, from, to, promotion? }` | Submit a move |
| `game:resign` | `{ gameId }` | Resign |
| `game:draw:offer` | `{ gameId }` | Offer a draw |
| `game:draw:accept` | `{ gameId }` | Accept draw offer |
| `game:draw:decline` | `{ gameId }` | Decline draw offer |
| `user:heartbeat` | `{}` | Keep online status alive (every 30s) |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `queue:matched` | `{ gameId }` | Match found, navigate to game |
| `game:start` | `{ gameId, white, black, timeControl, ... }` | Game started |
| `game:move:broadcast` | `{ move, fen, clock }` | Opponent played a move |
| `game:move:rejected` | `{ reason }` | Server rejected your move |
| `game:clock` | `{ white, black, activeColor, lastUpdatedAt }` | Clock sync |
| `game:over` | `{ result, termination, winner, whiteRatingDelta, blackRatingDelta }` | Game ended |
| `game:draw:offered` | `{ byColor }` | Opponent offered a draw |
| `game:draw:declined` | `{}` | Draw offer declined |

---

## Error Format

All HTTP errors use:
```json
{ "statusCode": 400, "message": "Validation failed", "error": "Bad Request" }
```
