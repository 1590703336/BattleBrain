# BattleBrain Backend — API Documentation

Complete reference for frontend developers. All examples use `localhost:3000` as the base URL.

---

## Table of Contents

- [Connection Setup](#connection-setup)
- [Authentication](#authentication)
- [HTTP Endpoints](#http-endpoints)
- [Socket.IO Events — Client → Server](#socketio-events--client--server)
- [Socket.IO Events — Server → Client](#socketio-events--server--client)
- [Error Handling](#error-handling)
- [Type Reference](#type-reference)

---

## Connection Setup

### Installing the Client

```bash
npm install socket.io-client
```

### Connecting with Auth

Every Socket.IO connection **must** include a JWT token. Unauthenticated connections are rejected.

```javascript
import { io } from 'socket.io-client';

// Use the token from login/signup response
const token = localStorage.getItem('token');

const socket = io('http://localhost:3000', {
  auth: {
    token: token
  }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('Connection failed:', err.message);
  // Common reasons: invalid/expired token, server down
});
```

---

## Authentication

The backend uses **JWT + bcrypt** for authentication. Users sign up and log in via HTTP endpoints, receive a JWT token, and pass that token when connecting via Socket.IO.

### Signup

**Request:**
```javascript
const response = await fetch('http://localhost:3000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'player@example.com',
    password: 'securepassword123',
    displayName: 'WittyWarrior42'
  })
});

const data = await response.json();
// Store the token
localStorage.setItem('token', data.token);
```

**Request Body:**
```json
{
  "email": "player@example.com",
  "password": "securepassword123",
  "displayName": "WittyWarrior42"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | `string` | Yes | User's email (must be unique) |
| `password` | `string` | Yes | Password (min 6 characters) |
| `displayName` | `string` | Yes | Public display name |

**Response `201 Created`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65a1b2c3d4e5f6a7b8c9d0e1",
    "email": "player@example.com",
    "displayName": "WittyWarrior42",
    "avatarUrl": "",
    "bio": "",
    "stats": {
      "totalBattles": 0,
      "wins": 0,
      "losses": 0,
      "avgWitScore": 0,
      "winStreak": 0
    }
  }
}
```

**Error Responses:**
- `400` — Missing fields or invalid email format
- `409` — Email already in use

---

### Login

**Request:**
```javascript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'player@example.com',
    password: 'securepassword123'
  })
});

const data = await response.json();
localStorage.setItem('token', data.token);
```

**Request Body:**
```json
{
  "email": "player@example.com",
  "password": "securepassword123"
}
```

**Response `200 OK`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65a1b2c3d4e5f6a7b8c9d0e1",
    "email": "player@example.com",
    "displayName": "WittyWarrior42",
    "avatarUrl": "https://example.com/avatar.png",
    "bio": "Professional debater.",
    "stats": {
      "totalBattles": 47,
      "wins": 31,
      "losses": 16,
      "avgWitScore": 7.2,
      "winStreak": 4
    }
  }
}
```

**Error Responses:**
- `400` — Missing fields
- `401` — Invalid email or password

---

## HTTP Endpoints

### `GET /health`

Health check endpoint. No authentication required.

**Request:**
```
GET http://localhost:3000/health
```

**Response `200 OK`:**
```json
{
  "status": "ok",
  "uptime": 3542,
  "timestamp": "2026-02-14T06:30:00.000Z"
}
```

---

### `POST /api/auth/signup`

Create a new account. See [Signup](#signup) above for full details.

---

### `POST /api/auth/login`

Log in to an existing account. See [Login](#login) above for full details.

---

## Socket.IO Events — Client → Server

### Presence

---

#### `go-online`

Mark yourself as online. Call this right after connecting. Triggers the server to broadcast your presence to other users.

**Emit:**
```javascript
socket.emit('go-online');
```

**Payload:** None

**Server Response:** The server broadcasts `user-online` to all other connected clients (see [user-online](#user-online)).

---

#### `heartbeat`

Keep your online presence alive. Send this **every 30 seconds**. If the server doesn't receive a heartbeat within 60 seconds, it marks you as offline.

**Emit:**
```javascript
// Set up a heartbeat interval after connecting
setInterval(() => {
  socket.emit('heartbeat');
}, 30000);
```

**Payload:** None

**Server Response:** None (silent acknowledgment).

---

### Swipe & Matchmaking

---

#### `get-cards`

Request a deck of online users to swipe through. Returns users who are currently online, excluding yourself and anyone you've already swiped on in this session.

**Emit:**
```javascript
socket.emit('get-cards');
```

**Payload:** None

**Server Response Event:** [`online-users`](#online-users)

**Example Response:**
```json
[
  {
    "id": "65a1b2c3d4e5f6a7b8c9d0e1",
    "displayName": "WittyWarrior42",
    "avatarUrl": "https://example.com/avatar1.png",
    "bio": "Professional debater. Pineapple on pizza apologist.",
    "stats": {
      "totalBattles": 47,
      "wins": 31,
      "losses": 16,
      "avgWitScore": 7.2,
      "winStreak": 4
    }
  },
  {
    "id": "72b3c4d5e6f7a8b9c0d1e2f3",
    "displayName": "MemeLord99",
    "avatarUrl": "https://example.com/avatar2.png",
    "bio": "GIF is pronounced with a hard G. Fight me.",
    "stats": {
      "totalBattles": 12,
      "wins": 8,
      "losses": 4,
      "avgWitScore": 6.8,
      "winStreak": 2
    }
  }
]
```

---

#### `swipe-right`

Send a battle request to a user. If the target user has also swiped right on you (mutual match), a battle starts automatically.

**Emit:**
```javascript
socket.emit('swipe-right', {
  targetId: '65a1b2c3d4e5f6a7b8c9d0e1'
});
```

**Payload:**
```json
{
  "targetId": "65a1b2c3d4e5f6a7b8c9d0e1"
}
```

**Server Response Events:**
- To the **target user**: [`battle-request`](#battle-request)
- If **mutual match**: [`battle-start`](#battle-start) to both users

---

#### `swipe-left`

Skip a user. They won't appear in your card deck again this session.

**Emit:**
```javascript
socket.emit('swipe-left', {
  targetId: '65a1b2c3d4e5f6a7b8c9d0e1'
});
```

**Payload:**
```json
{
  "targetId": "65a1b2c3d4e5f6a7b8c9d0e1"
}
```

**Server Response:** None.

---

#### `accept-battle`

Accept an incoming battle request. Starts the battle immediately.

**Emit:**
```javascript
socket.emit('accept-battle', {
  requestId: 'req_1707868800000'
});
```

**Payload:**
```json
{
  "requestId": "req_1707868800000"
}
```

**Server Response Event:** [`battle-start`](#battle-start) — sent to both you and the requester.

---

#### `decline-battle`

Decline an incoming battle request.

**Emit:**
```javascript
socket.emit('decline-battle', {
  requestId: 'req_1707868800000'
});
```

**Payload:**
```json
{
  "requestId": "req_1707868800000"
}
```

**Server Response Event:** [`battle-request-declined`](#battle-request-declined) — sent to the original requester.

---

#### `join-queue`

Enter the random matchmaking queue. You'll be paired with the next available player. If no opponent is found within 10 seconds and bot mode is enabled, you'll be matched against an AI bot.

**Emit:**
```javascript
socket.emit('join-queue');
```

**Payload:** None

**Server Response Events:**
1. [`waiting`](#waiting) — immediately, while in queue
2. [`battle-start`](#battle-start) — when matched with opponent or bot

---

### Battle

---

#### `send-message`

Send a debate message during an active battle. Message is analyzed by AI for wit, relevance, and toxicity. HP is updated based on the analysis.

**Emit:**
```javascript
socket.emit('send-message', {
  battleId: currentBattleId,
  text: 'Your argument has fewer layers than a sheet of paper'
});
```

**Payload:** `{ battleId: string, text: string }` where `text` is max 280 characters

**Server Response Events:**
- [`battle-message`](#battle-message) — sent to both players with analysis results
- [`rate-limited`](#rate-limited) — if you're sending too fast (3s cooldown)
- [`battle-end`](#battle-end) — if this message causes HP to reach 0

**Rate Limiting:**
- Minimum 3 seconds between messages
- Maximum 280 characters per message
- Violating either sends a `rate-limited` event instead of processing

---

## Socket.IO Events — Server → Client

### Presence Events

---

#### `online-users`

Received after emitting `get-cards`. Contains a shuffled deck of online users you can swipe on.

**Listen:**
```javascript
socket.on('online-users', (cards) => {
  console.log(`${cards.length} users to swipe on`);
  // Render the card deck in your UI
});
```

**Payload:**
```json
[
  {
    "id": "65a1b2c3d4e5f6a7b8c9d0e1",
    "displayName": "WittyWarrior42",
    "avatarUrl": "https://example.com/avatar.png",
    "bio": "Professional debater.",
    "stats": {
      "totalBattles": 47,
      "wins": 31,
      "losses": 16,
      "avgWitScore": 7.2,
      "winStreak": 4
    }
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | User's MongoDB ObjectId |
| `displayName` | `string` | Display name |
| `avatarUrl` | `string` | Profile picture URL (may be empty) |
| `bio` | `string` | User bio (max 200 chars) |
| `stats.totalBattles` | `number` | Total battles played |
| `stats.wins` | `number` | Total wins |
| `stats.losses` | `number` | Total losses |
| `stats.avgWitScore` | `number` | Average wit score (0–100) |
| `stats.winStreak` | `number` | Current win streak |

---

#### `user-online`

Broadcast when a user comes online. Use this to dynamically add cards to the swipe deck.

**Listen:**
```javascript
socket.on('user-online', (user) => {
  console.log(`${user.displayName} is now online`);
});
```

**Payload:**
```json
{
  "id": "65a1b2c3d4e5f6a7b8c9d0e1",
  "displayName": "WittyWarrior42",
  "avatarUrl": "https://example.com/avatar.png"
}
```

---

#### `user-offline`

Broadcast when a user goes offline. Remove their card from the swipe deck.

**Listen:**
```javascript
socket.on('user-offline', (data) => {
  console.log(`User ${data.id} went offline`);
  // Remove from card deck
});
```

**Payload:**
```json
{
  "id": "65a1b2c3d4e5f6a7b8c9d0e1"
}
```

---

### Battle Request Events

---

#### `battle-request`

Received when another user swipes right on you (sends you a battle challenge).

**Listen:**
```javascript
socket.on('battle-request', (request) => {
  console.log(`${request.from.displayName} wants to battle about "${request.topic}"`);
  // Show accept/decline UI
});
```

**Payload:**
```json
{
  "requestId": "req_1707868800000",
  "from": {
    "id": "65a1b2c3d4e5f6a7b8c9d0e1",
    "displayName": "WittyWarrior42",
    "avatarUrl": "https://example.com/avatar.png",
    "stats": {
      "totalBattles": 47,
      "wins": 31,
      "losses": 16,
      "avgWitScore": 7.2
    }
  },
  "topic": "Pineapple on pizza is a crime"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `requestId` | `string` | Unique ID — pass to `accept-battle` or `decline-battle` |
| `from` | `object` | Profile of the user challenging you |
| `from.id` | `string` | Challenger's user ID |
| `from.displayName` | `string` | Challenger's display name |
| `from.avatarUrl` | `string` | Challenger's avatar |
| `from.stats` | `object` | Challenger's battle stats |
| `topic` | `string` | The debate topic for this battle |

---

#### `battle-request-declined`

Received when someone declines your battle request.

**Listen:**
```javascript
socket.on('battle-request-declined', (data) => {
  console.log(`Request ${data.requestId} was declined by ${data.by}`);
});
```

**Payload:**
```json
{
  "requestId": "req_1707868800000",
  "by": "72b3c4d5e6f7a8b9c0d1e2f3"
}
```

---

### Queue Events

---

#### `waiting`

Received after emitting `join-queue`. Indicates you're in the matchmaking queue.

**Listen:**
```javascript
socket.on('waiting', (payload) => {
  console.log('In queue... waiting for opponent', payload.position, payload.etaSec);
  // Show loading/searching UI
});
```

**Payload:**
```json
{
  "queueId": "q_67af0_1739530534022",
  "position": 1,
  "etaSec": 10
}
```

---

### Battle Events

---

#### `battle-start`

Received when a battle begins — either from swipe match, accepted battle request, or queue matchmaking.

**Listen:**
```javascript
socket.on('battle-start', (data) => {
  console.log(`Battle started! Topic: "${data.topic}"`);
  console.log(`Opponent: ${data.opponent.displayName}`);
  console.log(`Time limit: ${data.duration / 1000}s`);
  // Navigate to battle arena screen
});
```

**Payload:**
```json
{
  "battleId": "battle_1707868800000",
  "topic": "Cats are better than dogs",
  "opponent": {
    "id": "65a1b2c3d4e5f6a7b8c9d0e1",
    "displayName": "WittyWarrior42",
    "avatarUrl": "https://example.com/avatar.png"
  },
  "duration": 180000,
  "startTime": 1707868800000
}
```

| Field | Type | Description |
|-------|------|-------------|
| `battleId` | `string` | Unique battle ID |
| `topic` | `string` | The debate topic |
| `opponent.id` | `string` | Opponent's user ID |
| `opponent.displayName` | `string` | Opponent's display name |
| `opponent.avatarUrl` | `string` | Opponent's avatar |
| `duration` | `number` | Battle time limit in milliseconds (default: 180000 = 3min) |
| `startTime` | `number` | Unix timestamp when battle started — use for countdown timer |

---

#### `battle-message`

Received after any player sends a message. Contains the AI analysis and updated HP for both players. Use this to:
1. Display the message in chat
2. Update both HP bars
3. Show strike animations based on `strikeType`

**Listen:**
```javascript
socket.on('battle-message', (data) => {
  const isMe = data.senderId === myUserId;

  // Add message to chat
  addMessage({
    text: data.message,
    sender: data.senderId,
    isMe: isMe,
    analysis: data.analysis
  });

  // Update HP bars
  setMyHp(data.state[myUserId].hp);
  setOpponentHp(data.state[opponentId].hp);

  // Trigger animation based on strike type
  if (data.analysis.strikeType === 'good') {
    playStrikeAnimation();
  } else if (data.analysis.strikeType === 'toxic') {
    playToxicAnimation();
  }
});
```

**Payload:**
```json
{
  "senderId": "65a1b2c3d4e5f6a7b8c9d0e1",
  "message": "Your argument has fewer layers than a sheet of paper",
  "analysis": {
    "wit": 82,
    "relevance": 77,
    "toxicity": 10,
    "damage": 80,
    "strikeType": "good",
    "damageTarget": "opponent"
  },
  "state": {
    "65a1b2c3d4e5f6a7b8c9d0e1": { "hp": 100 },
    "72b3c4d5e6f7a8b9c0d1e2f3": { "hp": 75 }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `senderId` | `string` | ID of the player who sent the message |
| `message` | `string` | The message text |
| `analysis.wit` | `number` | Wit/humor score (0–100) |
| `analysis.relevance` | `number` | Topic relevance score (0–100) |
| `analysis.toxicity` | `number` | Toxicity score (0–100, higher = more toxic) |
| `analysis.damage` | `number` | HP damage dealt (always non-negative) |
| `analysis.strikeType` | `string` | One of: `"good"`, `"toxic"`, `"neutral"` |
| `analysis.damageTarget` | `string \| null` | `"opponent"` / `"me"` / `null` |
| `state` | `object` | Current HP for all players, keyed by user ID |
| `state[id].hp` | `number` | Current HP (starts at 100, battle ends at 0) |

**`strikeType` meanings:**

| Type | Condition | Effect |
|------|-----------|--------|
| `good` | `wit >= 40` and `relevance >= 40` (and not toxic) | Opponent loses HP by weighted score |
| `toxic` | `toxicity >= 60` | **Sender** loses HP by `round(toxicity * 0.2)` |
| `neutral` | Everything else | No HP change |

---

#### `battle-end`

Received when the battle is over — either a player hit 0 HP or the timer expired.

**Listen:**
```javascript
socket.on('battle-end', (data) => {
  const iWon = data.winner === myUserId;
  console.log(iWon ? 'You win!' : 'You lose!');

  // Show winner screen with final stats
  showWinnerScreen({
    winner: data.winner,
    finalState: data.finalState,
    reason: data.reason
  });
});
```

**Payload:**
```json
{
  "winner": "65a1b2c3d4e5f6a7b8c9d0e1",
  "finalState": {
    "65a1b2c3d4e5f6a7b8c9d0e1": { "hp": 45, "messagesCount": 8 },
    "72b3c4d5e6f7a8b9c0d1e2f3": { "hp": 0, "messagesCount": 6 }
  },
  "reason": "knockout",
  "topic": "Cats are better than dogs",
  "duration": 142000
}
```

| Field | Type | Description |
|-------|------|-------------|
| `winner` | `string` | ID of the winning player |
| `finalState` | `object` | Final HP and message count for each player |
| `finalState[id].hp` | `number` | Final HP |
| `finalState[id].messagesCount` | `number` | Number of messages sent |
| `reason` | `string` | `"knockout"` (HP hit 0) or `"timeout"` (timer expired, winner = higher HP) |
| `topic` | `string` | The debate topic |
| `duration` | `number` | Actual battle duration in milliseconds |

---

#### `rate-limited`

Received when your message is rejected for sending too fast or exceeding the character limit.

**Listen:**
```javascript
socket.on('rate-limited', (data) => {
  console.log(`Slow down! Wait ${data.cooldownRemaining}ms`);
  // Show cooldown indicator in UI
  // Optionally disable the send button for the remaining time
});
```

**Payload:**
```json
{
  "cooldownRemaining": 2100,
  "reason": "message_cooldown"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `cooldownRemaining` | `number` | Milliseconds until you can send again |
| `reason` | `string` | `"message_cooldown"` (too fast) or `"message_too_long"` (> 280 chars) |

---

## Error Handling

### Socket Connection Errors

```javascript
socket.on('connect_error', (err) => {
  if (err.message === 'auth_invalid_token') {
    // Token expired or invalid — log out and redirect to login
    localStorage.removeItem('token');
    redirectToLogin();
  } else if (err.message === 'auth_token_missing') {
    // No token provided — redirect to login
    redirectToLogin();
  } else {
    console.error('Connection error:', err.message);
  }
});
```

### HTTP Error Responses

All HTTP errors return this format:

```json
{
  "error": {
    "message": "Human-readable error description",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

| Status | Code | Meaning |
|--------|------|---------|
| `400` | `VALIDATION_ERROR` | Invalid input (e.g., missing fields) |
| `401` | `AUTH_ERROR` | Invalid or missing authentication |
| `404` | `NOT_FOUND` | Resource doesn't exist |
| `409` | `CONFLICT` | Resource already exists (e.g., email taken) |
| `429` | `RATE_LIMITED` | Too many requests |
| `500` | `INTERNAL_ERROR` | Server error |

---

## Type Reference

### `UserCard`

Returned in `online-users` and used across swipe events.

```typescript
interface UserCard {
  id: string;            // MongoDB ObjectId
  displayName: string;
  avatarUrl: string;
  bio: string;
  stats: {
    totalBattles: number;
    wins: number;
    losses: number;
    avgWitScore: number;    // 0-100
    winStreak: number;
  };
}
```

### `MessageAnalysis`

Returned in `battle-message` events.

```typescript
interface MessageAnalysis {
  wit: number;           // 0-100
  relevance: number;     // 0-100
  toxicity: number;      // 0-100
  damage: number;        // non-negative damage value
  strikeType: 'good' | 'toxic' | 'neutral';
  damageTarget: 'me' | 'opponent' | null;
}
```

### `BattleState`

Player HP state, keyed by user ID.

```typescript
interface BattleState {
  [id: string]: {
    hp: number;            // 0-100
    messagesCount?: number; // only in battle-end
  };
}
```

### `BattleRequest`

Incoming battle challenge from another user.

```typescript
interface BattleRequest {
  requestId: string;
  from: {
    id: string;
    displayName: string;
    avatarUrl: string;
    stats: {
      totalBattles: number;
      wins: number;
      losses: number;
      avgWitScore: number;
    };
  };
  topic: string;
}
```

### `AuthResponse`

Returned from `/api/auth/signup` and `/api/auth/login`.

```typescript
interface AuthResponse {
  token: string;          // JWT token — store in localStorage
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string;
    bio: string;
    stats: {
      totalBattles: number;
      wins: number;
      losses: number;
      avgWitScore: number;
      winStreak: number;
    };
  };
}
```

---

## Quick Reference Cheat Sheet

### Full Lifecycle

```
1. POST /api/auth/signup or /api/auth/login → get JWT token
2. Connect to Socket.IO with JWT token
3. Emit 'go-online'
4. Start heartbeat interval (every 30s)
5. Emit 'get-cards' → receive 'online-users'
6. Swipe right/left on cards
7. Receive 'battle-request' OR mutual match → 'battle-start'
8. Send messages with 'send-message' → receive 'battle-message'
9. Battle ends → receive 'battle-end'
10. Back to step 5 (get new cards)
```

### All Events At a Glance

| Direction | Event | When |
|-----------|-------|------|
| → | `go-online` | After connect |
| → | `heartbeat` | Every 30s |
| → | `get-cards` | To load swipe deck |
| → | `swipe-right` | Challenge a user |
| → | `swipe-left` | Skip a user |
| → | `accept-battle` | Accept challenge |
| → | `decline-battle` | Decline challenge |
| → | `join-queue` | Random matchmaking |
| → | `send-message` | During battle |
| ← | `online-users` | Card deck response |
| ← | `user-online` | Someone came online |
| ← | `user-offline` | Someone went offline |
| ← | `battle-request` | Incoming challenge |
| ← | `battle-request-declined` | Challenge declined |
| ← | `waiting` | In queue |
| ← | `battle-start` | Battle begins |
| ← | `battle-message` | Message analyzed |
| ← | `battle-end` | Battle over |
| ← | `rate-limited` | Too fast |
