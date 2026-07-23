# Frontend Architecture

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 |
| Build | Vite 5 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v3 |
| State | Zustand |
| Server state | TanStack Query v5 |
| Routing | React Router v6 |
| WebSocket | Socket.IO client |
| Chess logic | chess.js |
| Board UI | react-chessboard |
| i18n | react-i18next |
| HTTP | axios |

## Application Structure

```
client/src/
├── app/
│   ├── globals.css          # Tailwind base + custom animations
│   └── router.tsx           # Route definitions
├── components/
│   ├── chess/
│   │   ├── ChessBoard.tsx   # Board + arrow SVG overlay + badges
│   │   ├── MaterialCount.tsx # Captured pieces + advantage display
│   │   └── PieceIcon.tsx    # Cburnett SVG piece components
│   ├── layout/
│   │   └── Navbar.tsx
│   └── ui/                  # shadcn/ui primitives
├── hooks/
│   └── useSocket.ts         # Socket.IO connection lifecycle
├── i18n/
│   ├── i18n.ts              # i18next init
│   └── locales/
│       ├── en.json
│       ├── pt.json
│       └── es.json
├── pages/
│   ├── AnalysisPage.tsx     # Post-game Stockfish analysis
│   ├── GamePage.tsx         # Live game board
│   ├── HomePage.tsx         # Landing page
│   ├── LeaderboardPage.tsx
│   ├── LoginPage.tsx
│   ├── PlayPage.tsx         # Matchmaking / bot game setup
│   ├── ProfilePage.tsx
│   └── RegisterPage.tsx
├── queries/                 # TanStack Query hooks (api calls)
├── services/
│   └── api.ts               # axios instance
└── stores/
    ├── auth.store.ts        # JWT + user identity
    └── game.store.ts        # Active game state
```

## Data Flow

```mermaid
flowchart TD
    subgraph Client
        Router["React Router"]
        Pages["Pages"]
        Components["Components"]
        Zustand["Zustand Stores\n(auth, game)"]
        TQ["TanStack Query\n(server state cache)"]
        SocketHook["useSocket\n(Socket.IO)"]
        Axios["axios\n(REST)"]
    end

    subgraph Server
        REST["REST API /api/*"]
        WS["Socket.IO"]
    end

    Router --> Pages --> Components
    Components --> Zustand
    Components --> TQ
    TQ --> Axios --> REST
    SocketHook --> WS
    WS -- events --> Zustand
```

## State Management Split

| State type | Tool | Rationale |
|-----------|------|-----------|
| Auth (user, token) | Zustand | Persisted, shared globally |
| Active game (fen, clocks, moves) | Zustand | Updated by Socket.IO events |
| Server data (profiles, history) | TanStack Query | Cache, refetch, deduplication |
| UI-local (modals, hover) | useState | No need to share |

## Chess Board Component

```mermaid
flowchart TD
    GamePage --> ChessBoard
    ChessBoard --> ReactChessboard["react-chessboard\n(piece rendering)"]
    ChessBoard --> ArrowLayer["ArrowLayer SVG\n(viewBox 0 0 8 8)\narrow paths"]
    ChessBoard --> ClassificationBadge["ClassificationBadge SVG\n(viewBox 0 0 8 8)\nbadge circle + icon"]
    ChessBoard --> MaterialCount
    MaterialCount --> PieceIcon["PieceIcon\n(Cburnett SVG)"]
```

Key design decisions:
- Arrow and badge SVGs share the same `viewBox="0 0 8 8"` coordinate space as the board grid, so square positions map directly without percentage calculations.
- `ClassificationBadge` is a standalone SVG overlay, independent of `ArrowLayer`, so badges always render even when there are no arrows on the board.
- `MaterialCount` renders captured piece icons using inline SVG paths (Cburnett set, CC BY-SA 3.0) instead of unicode characters, giving pixel-perfect sizing.

## Analysis Page Layout

```mermaid
flowchart LR
    subgraph AnalysisPage
        EvalBar["Eval Bar\n(vertical, 20px wide)\nwhite/black %, score label"]
        Board["ChessBoard\n(read-only, arrow for best move)"]
        Sidebar["Sidebar\n─────────────\nAnalysis panel\n(request / progress / results)\n─────────────\nMoves list\n(classified, scrollable)"]
    end

    EvalBar --- Board --- Sidebar
```

## Real-Time Game Flow (Client Side)

```mermaid
sequenceDiagram
    participant UI as GamePage
    participant Store as game.store
    participant Socket as Socket.IO
    participant Server

    UI->>Socket: connect(gameId, token)
    Server-->>Socket: gameStart(fen, color, clock)
    Socket-->>Store: setGame(...)

    UI->>UI: user drags piece
    UI->>UI: chess.js validates (optimistic)
    UI->>Socket: game:move {from, to}
    Server-->>Socket: game:move:broadcast {fen, clock}
    Socket-->>Store: applyMove(fen, clock)

    Server-->>Socket: game:over {result}
    Socket-->>Store: setGameOver(result)
    UI->>UI: show result overlay
```

## i18n

Supported locales: `en`, `pt`, `es`. Locale is stored in localStorage and applied on mount. All user-visible strings must use `t('namespace.key')`; never hardcode text in JSX.

Translation files live at `client/src/i18n/locales/{locale}.json`.
