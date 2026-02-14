# BattleBrain Backend Architecture

## Overview

Backend stack:
- Node.js + Express
- Socket.IO (real-time matchmaking/battle/presence)
- MongoDB + Mongoose
- OpenRouter (GPT-oss-120b) for battle message scoring

Core behavior:
- Auth session via JWT (`/api/auth/signup`, `/api/auth/login`, `/api/auth/me`)
- Swipe matchmaking with request/accept/decline and timeout
- Queue matchmaking with backend-calculated `position` + `etaSec`
- Battle lifecycle + record persistence in `User.records[]`

## Runtime Layers

### 1. Config

`backend/src/config/env.js`
- Validates required env vars at boot.
- Required:
  - `OPENROUTER_API_KEY`
  - `MONGODB_URI`
  - `JWT_SECRET`

`backend/src/config/constants.js`
- Battle HP/duration/message constraints
- Presence timeout
- Queue timeout
- Swipe request timeout and AI delay

### 2. Services

`AuthService`
- Signup/login/token verification.
- Returns frontend-ready session payload.

`UserService`
- Profile read/update.
- History read from `records`.

`PresenceService`
- In-memory online map + heartbeat timestamps.
- Stale cleanup triggers:
  - queue removal
  - battle forfeit
  - swipe-request cleanup
  - `user-offline` broadcast

`SwipeService`
- Builds swipe deck (online users + 5 AI-backed real users).
- Handles request creation/accept/decline/timeout.

`MatchmakingService`
- Queue join/leave.
- Computes and emits `waiting { queueId, position, etaSec }`.
- Human match pairing + bot fallback.

`BattleService`
- Active battle state machine.
- Message analysis (`wit/relevance/toxicity`) and strike resolution.
- Emits `battle-message` and `battle-end`.
- Persists records + aggregate stats + XP/level updates.

### 3. Socket Handlers

`backend/src/socket/index.js`
- Socket bootstrap + auth middleware.

Handlers:
- `presenceHandler.js`
- `swipeHandler.js`
- `queueHandler.js`
- `battleHandler.js`

Handlers are thin: validate payloads, call services, emit results.

## Data Model Notes

User is the main persisted aggregate:
- profile/auth fields
- progression (`level`, `xp`)
- aggregates (`stats`)
- history (`records[]`)

New battle history writes are to `records`.

## Main Socket Protocol

Client -> Server:
- `get-cards`, `swipe-right`, `swipe-left`
- `accept-battle`, `decline-battle`
- `join-queue`, `leave-queue`
- `send-message`
- `heartbeat`

Server -> Client:
- `online-users`
- `battle-request`, `battle-request-declined`, `battle-request-timeout`
- `waiting`, `battle-start`, `battle-message`, `battle-end`
- `rate-limited`
- `user-online`, `user-offline`
