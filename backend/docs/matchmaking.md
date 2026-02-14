# Matchmaking API

This document covers two matchmaking flows:
- `Swipe Mode` (card-based, request/accept/decline)
- `Queue Mode` (quick queue with ETA and bot fallback)

## 1. Swipe Mode

### Client -> Server

| Event | Payload | Description |
|---|---|---|
| `get-cards` | `{}` | Load swipe deck |
| `swipe-right` | `{ targetId: string }` | Send challenge request to target |
| `swipe-left` | `{ targetId: string }` | Skip card |
| `accept-battle` | `{ requestId: string }` | Accept incoming challenge |
| `decline-battle` | `{ requestId: string }` | Decline incoming challenge |

### Server -> Client

#### `online-users`

Response to `get-cards`.

```json
[
  {
    "id": "67af0...",
    "displayName": "HyperNova",
    "name": "HyperNova",
    "avatarUrl": "",
    "level": 16,
    "bio": "Specialty: ultra-dry callbacks...",
    "humorStyle": "Savage Irony",
    "isAi": true
  }
]
```

Notes:
- Backend always ensures 5 AI-backed real users exist for swipe deck.
- Human online users are also included.

#### `battle-request`

Sent to target user after `swipe-right` (for human target).

```json
{
  "requestId": "req_1739530_8adf1c2b",
  "from": {
    "id": "67af0...",
    "displayName": "Alice",
    "name": "Alice",
    "avatarUrl": "",
    "level": 10
  },
  "topic": "Pineapple on pizza is a crime",
  "expiresInSec": 15
}
```

#### `battle-request-declined`

Sent to requester when target declines.

```json
{
  "requestId": "req_1739530_8adf1c2b",
  "by": "67af1..."
}
```

#### `battle-request-timeout`

Sent when request expires or target is offline.

```json
{
  "requestId": "req_1739530_8adf1c2b",
  "targetId": "67af1...",
  "reason": "timeout"
}
```

`reason` can be:
- `timeout`
- `offline`

#### AI Swipe Match

If target card is AI (`isAi: true`):
- requester receives `waiting` while match topic is generated
- backend emits `battle-start` right after topic generation completes

## 2. Queue Mode

### Client -> Server

| Event | Payload | Description |
|---|---|---|
| `join-queue` | `{ mode: "quick" }` | Enter quick queue |
| `leave-queue` | `{}` | Leave queue |

### Server -> Client

#### `waiting`

```json
{
  "queueId": "q_67af0_1739530534022",
  "position": 1,
  "etaSec": 10
}
```

`position` and `etaSec` are computed by backend.

#### `battle-start`

Sent when matched (human/human or bot fallback).

### Queue Bot Fallback

If not matched within `BOT_MATCH_TIMEOUT_MS`, backend auto-matches with queue AI user.
