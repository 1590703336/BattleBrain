# Matchmaking API

This document details the matchmaking systems: **Swipe Mode** (Tinder-style) and **Queue Mode** (Traditional matchmaking).

## 1. Swipe Mode

Browse online users and request battles.

### Emitters (Client → Server)

| Event | Payload | Description |
|---|---|---|
| `get-cards` | `null` | Request a deck of potential opponents (online users you haven't swiped on) |
| `swipe-right` | `{ targetId: string }` | "Like" / Request battle with user |
| `swipe-left` | `{ targetId: string }` | "Pass" / Skip user |

### Listeners (Server → Client)

#### `online-users`
Response to `get-cards`. Returns a shuffled list of `User` objects.

#### `battle-request`
Received when someone swipes right on you (and you haven't swiped them yet).

**Payload:**
```json
{
  "requestId": "req_123...",
  "from": {
    "id": "u_target",
    "displayName": "Alice",
    "avatarUrl": "...",
    "level": 10
  },
  "topic": "Pineapple on pizza is a crime"
}
```

#### `battle-start`
Received when a match is successfully made (Mutual swipe or accepted request).

**Payload:**
```json
{
  "id": "battle_xyz...",
  "topic": "Pineapple on pizza is a crime",
  "startTime": 1700000000000,
  "duration": 180000,
  "players": {
    "u_my_id": { "hp": 100, "user": {...} },
    "u_opponent_id": { "hp": 100, "user": {...} }
  }
}
```
*Note: This event redirects the user to the Battle Screen.*

---

## 2. Request Handling

Respond to incoming `battle-request` events.

### Emitters

| Event | Payload | Description |
|---|---|---|
| `accept-battle` | `{ requestId: string }` | Accept the challenge. Triggers `battle-start` for both. |
| `decline-battle` | `{ requestId: string }` | Decline the challenge. |

### Listeners

#### `battle-request-declined`
Received if the person you swiped right on declines your request.

**Payload:**
```json
{
  "requestId": "req_123...",
  "by": "u_user_who_declined"
}
```

---

## 3. Queue Mode

Automatic matchmaking pool.

### Emitters

| Event | Payload | Description |
|---|---|---|
| `join-queue` | `null` | specific queue handling? Currently just joins the detailed global pool. |
| `leave-queue` | `null` | Remove self from queue. |

### Listeners

- You will strictly receive `battle-start` when matched.
- No interaction required; just show a "Searching..." spinner until `battle-start`.
