# BattleBrain Backend

AI-moderated real-time debate arena — the backend server powering Meme Battle Arena.

## Tech Stack

- **Node.js + Express** — HTTP server
- **Socket.IO** — real-time WebSocket communication
- **OpenAI (gpt-4o-mini)** — AI message analysis (wit, relevance, toxicity)
- **pino** — structured logging
- **async-mutex** — concurrency-safe battle state

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 3. Start dev server
npm run dev
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system design, file structure, and design decisions.

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
| `GET` | `/health` | Health check |

### Socket.IO Events

| Direction | Event | Description |
|-----------|-------|-------------|
| Client → Server | `join-queue` | Enter matchmaking queue |
| Client → Server | `send-message` | Send debate message |
| Server → Client | `waiting` | In queue, waiting for opponent |
| Server → Client | `battle-start` | Battle matched |
| Server → Client | `battle-message` | Message analyzed, HP updated |
| Server → Client | `battle-end` | Battle over |
| Server → Client | `rate-limited` | Message rejected (cooldown) |
