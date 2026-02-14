# BattleBrain Backend

AI-moderated real-time debate arena — the backend server powering Meme Battle Arena.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Runtime | Node.js |
| HTTP Framework | Express |
| WebSockets | Socket.IO |
| AI Model | GPT-oss 120b via OpenRouter (evaluate wit, relevance & toxicity) |
| Database | MongoDB via Mongoose (users, battles, stats, XP) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Logging | pino + pino-pretty |
| Concurrency | async-mutex |
| Linting | ESLint |
| Dev Server | nodemon |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY, MONGODB_URI, and JWT_SECRET

# 3. Start dev server
npm run dev
```

## Architecture

See [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) for the full system design, file structure, and design decisions.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start dev server with hot reload (nodemon) |
| `npm run lint` | Run ESLint on `src/` |

## API

### HTTP

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/signup` | Create account — returns JWT token + user |
| `POST` | `/api/auth/login` | Log in — returns JWT token + user |
| `GET` | `/health` | Health check — returns `{ status, uptime, timestamp }` |

### Socket.IO Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-queue` | — | Enter the matchmaking queue |
| `send-message` | `string` (message text) | Send a debate message during battle |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `waiting` | — | Player is in queue, waiting for opponent |
| `battle-start` | `{ battleId, topic, opponent }` | Battle matched, topic assigned |
| `battle-message` | `{ senderId, message, analysis, state }` | Message analyzed, HP updated |
| `battle-end` | `{ winner, finalState }` | Battle is over |
| `rate-limited` | `{ cooldownRemaining }` | Message rejected (too fast) |
