# BattleBrain Frontend Backend Interface Requirements

This document defines the backend interfaces required by the current frontend implementation.
Frontend is currently running with mock socket/API data and will switch to backend by toggling:

- `VITE_USE_MOCK_SOCKET=false`
- `VITE_USE_MOCK_API=false`

## 1. Real-time Battle (Socket.IO)

Namespace: default `/`
Auth: JWT via handshake auth (`auth.token`) or cookie session (backend choice, frontend can adapt).

### Client -> Server events

1. `join-queue`
- payload:
```json
{ "mode": "quick" }
```

2. `leave-queue`
- payload:
```json
{}
```

3. `send-message`
- payload:
```json
{ "battleId": "b_123", "text": "message up to 280 chars" }
```

### Server -> Client events

1. `waiting`
- payload:
```json
{
  "queueId": "q_123",
  "position": 1,
  "etaSec": 2
}
```

2. `battle-start`
- payload:
```json
{
  "battleId": "b_123",
  "topic": "If your ex texted at 2AM, what is your opening line?",
  "opponent": { "id": "u_2", "name": "HaloHex", "level": 14 },
  "durationSec": 90
}
```

3. `battle-message`
- payload:
```json
{
  "message": {
    "id": "m_1",
    "role": "me",
    "text": "...",
    "strikeType": "good",
    "damage": 14,
    "damageTarget": "opponent",
    "scores": { "wit": 88, "relevance": 81, "toxicity": 12 },
    "ts": 1739500000000
  },
  "snapshot": {
    "myHp": 100,
    "opponentHp": 86,
    "timer": 81
  }
}
```

4. `battle-tick`
- payload:
```json
{ "myHp": 92, "opponentHp": 73, "timer": 57 }
```

5. `battle-end`
- payload:
```json
{
  "battleId": "b_123",
  "winner": "me",
  "reason": "hp-zero",
  "finalState": { "myHp": 36, "opponentHp": 0, "timer": 21 }
}
```

6. `rate-limited`
- payload:
```json
{ "retryAfterMs": 1200 }
```

## 2. Queue / Waiting Flow Requirements

Flow expected by frontend:
1. User enters `/match` -> frontend emits `join-queue`.
2. Backend emits `waiting` at least once.
3. Backend emits `battle-start` when matched.
4. Frontend navigates to `/battle/:battleId`.

Queue cancel:
- Frontend emits `leave-queue` when user cancels or exits `/match`.

## 3. Records API (Result page)

### `GET /api/battles/:userId?limit=20`

Response:
```json
[
  {
    "id": "hist_1",
    "battleId": "b_123",
    "topic": "...",
    "winner": "me",
    "stats": {
      "myDamage": 102,
      "opponentDamage": 77,
      "messageCount": 15,
      "goodStrikes": 8,
      "toxicStrikes": 2
    },
    "finishedAt": "2026-02-14T18:23:18.000Z",
    "opponent": {
      "id": "u_2",
      "name": "HaloHex",
      "level": 14
    }
  }
]
```

Notes:
- `winner` enum: `me | opponent | draw`
- `finishedAt` must be ISO8601 string.
- Sort order can be either backend-side or frontend-side; frontend currently sorts descending by time.

## 4. Optional Health Check (already used)

### `GET /health`

Response:
```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2026-02-14T18:25:00.000Z"
}
```

## 5. Error and Validation Expectations

- Message length > 280 should be rejected server-side.
- Cooldown violations should emit `rate-limited` with retry ms.
- Unknown `battleId` in `send-message` should emit a recoverable error event (or silently ignore).
- Disconnect/reconnect should rehydrate battle state (recommended): send latest snapshot + recent messages.

## 6. Leaderboard API (Phase 2 frontend uses this now)

### `GET /api/leaderboard`

Response:
```json
[
  {
    "rank": 1,
    "id": "u_17",
    "name": "VoltJester",
    "level": 22,
    "xp": 9120,
    "winRate": 72
  }
]
```

Notes:
- Sorted by `xp` descending.
- `winRate` is integer percentage.

## 7. Compatibility Notes

Frontend files bound to this contract:
- `frontend/src/types/socket.ts`
- `frontend/src/services/SocketService.ts`
- `frontend/src/pages/MatchPage.tsx`
- `frontend/src/pages/BattlePage.tsx`
- `frontend/src/pages/ResultPage.tsx`

When backend is ready, switch mock off via env and keep payloads aligned with this spec.
