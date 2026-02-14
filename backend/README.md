# BattleBrain Backend

AI-moderated real-time debate arena — the backend server powering Meme Battle Arena.

## Tech Stack

- **Node.js + Express** — HTTP server
- **Socket.IO** — real-time WebSocket communication
- **MongoDB + Mongoose** — data persistence (user profiles, battle history)
- **JWT + bcrypt** — authentication (signup, login, token verification)
- **OpenAI (gpt-4o-mini)** — AI message analysis (wit, relevance, toxicity)
- **pino** — structured logging
- **async-mutex** — concurrency-safe battle state

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env — add your OPENAI_API_KEY, MONGODB_URI, and JWT_SECRET

# 3. Start dev server
npm run dev
```

## Features

- **User Accounts** — JWT auth with bcrypt password hashing (signup, login)
- **Tinder-Style Matching** — browse online users as swipeable cards, send battle requests
- **Quick Match Queue** — random matchmaking with bot fallback for solo play
- **Real-Time Battles** — Socket.IO powered debate arena with HP mechanics
- **AI Moderation** — every message scored for wit, relevance, and toxicity by GPT-4o-mini
- **Presence Tracking** — live online/offline status with heartbeat system

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design, diagrams, data models, design decisions
- [API.md](./API.md) — full API reference for frontend developers with example inputs/outputs

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start dev server with hot reload (nodemon) |
| `npm run lint` | Run ESLint on `src/` |

## API Overview

### HTTP

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/signup` | Create account — returns JWT |
| `POST` | `/api/auth/login` | Log in — returns JWT |
| `GET` | `/health` | Health check |

### Socket.IO Events

| Direction | Event | Description |
|-----------|-------|-------------|
| Client → Server | `go-online` | Mark self as online |
| Client → Server | `heartbeat` | Keep presence alive |
| Client → Server | `get-cards` | Request swipe deck |
| Client → Server | `swipe-right` | Send battle request |
| Client → Server | `swipe-left` | Skip user |
| Client → Server | `accept-battle` | Accept battle request |
| Client → Server | `decline-battle` | Decline battle request |
| Client → Server | `join-queue` | Enter random matchmaking |
| Client → Server | `send-message` | Send debate message |
| Server → Client | `online-users` | Card deck of online users |
| Server → Client | `user-online` | User came online |
| Server → Client | `user-offline` | User went offline |
| Server → Client | `battle-request` | Incoming battle request |
| Server → Client | `battle-start` | Battle matched |
| Server → Client | `battle-message` | Message analyzed, HP updated |
| Server → Client | `battle-end` | Battle over |
| Server → Client | `rate-limited` | Message rejected (cooldown) |
