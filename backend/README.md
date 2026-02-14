# BattleBrain Backend

AI-moderated real-time debate arena — the backend server powering Meme Battle Arena.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Runtime | Node.js |
| HTTP Framework | Express |
| WebSockets | Socket.IO |
| AI Model | GPT-oss 120b via OpenRouter (evaluate wit, relevance & toxicity) |
| Database | MongoDB via Mongoose (users, records, stats, XP) |
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

See [backend/docs](./docs/README.md) for detailed API documentation by feature.

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
| `join-queue` | `{ mode: "quick" }` | Enter quick queue |
| `leave-queue` | `{}` | Leave queue |
| `get-cards` | `{}` | Load swipe cards |
| `swipe-right` | `{ targetId }` | Send challenge request |
| `swipe-left` | `{ targetId }` | Skip card |
| `accept-battle` | `{ requestId }` | Accept incoming challenge |
| `decline-battle` | `{ requestId }` | Decline incoming challenge |
| `send-message` | `{ battleId, text }` | Send battle message |
| `heartbeat` | `{}` | Keep presence alive |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `online-users` | `MatchCandidate[]` | Swipe deck users (human + AI) |
| `waiting` | `{ queueId, position, etaSec }` | Waiting/ETA update |
| `battle-request` | `{ requestId, from, topic, expiresInSec }` | Incoming swipe challenge |
| `battle-request-declined` | `{ requestId, by }` | Challenge declined |
| `battle-request-timeout` | `{ requestId?, targetId?, reason }` | Timeout or offline |
| `battle-start` | `{ id, battleId, topic, players, durationSec }` | Battle matched |
| `battle-message` | `{ senderId, message, analysis, state }` | Message analyzed, HP updated |
| `battle-end` | `{ battleId, winner, reason, finalState }` | Battle is over |
| `rate-limited` | `{ reason, cooldownRemaining? }` | Message rejected |
