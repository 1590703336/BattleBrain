# Battle Engine API

This document details the real-time battle events. Active once `battle-start` is received.

## 1. Battle Flow

The battle is a 3-minute debate. Players exchange messages which are judged by AI for functionality (damage).

**Configuration:**
- **Duration:** 180 seconds (3 mins)
- **HP:** 100 per player
- **Message Limit:** 280 chars
- **Cooldown:** 3 seconds between messages

---

## 2. Sending Messages

### Emitters (Client → Server)

| Event | Payload | Description |
|---|---|---|
| `send-message` | `{ battleId: string, text: string }` | Send a debate argument. |

**Validation:**
- Text must not be empty.
- Text must be <= 280 chars.
- Must wait 3s since last message.

### Listeners (Server → Client)

#### `rate-limited`
Received if you send messages too fast or too long.

**Payload:**
```json
{
  "reason": "message_cooldown" | "message_too_long",
  "cooldownRemaining": 1500 // ms
}
```

---

## 3. Battle Events

#### `battle-message`
Received when ANY player (you or opponent) sends a successfully processed message. Contains AI analysis and updated HP state.

**Payload:**
```json
{
  "senderId": "u_alice",
  "message": "Pineapple adds a necessary acidity to the savory cheese!",
  "analysis": {
    "wit": 8,
    "relevance": 9,
    "toxicity": 1,
    "damage": 25,
    "strikeType": "good-strike" 
  },
  "state": {
    "u_alice": { "hp": 100 },
    "u_bob": { "hp": 75 }
  }
}
```

**Strike Types:**
- `neutral`: Normal message, 0 damage.
- `good-strike`: High Wit + Relevance. Deals damage to opponent.
- `toxic`: High Toxicity. Deals damage to self (recoil).

#### `battle-end`
Received when the battle finishes (Timeout, Knockout, or Forfeit).

**Payload:**
```json
{
  "winner": "u_alice", // User ID of winner (or null if draw)
  "reason": "knockout" | "timeout" | "forfeit",
  "finalState": {
    "u_alice": { "hp": 80, "messagesCount": 5 },
    "u_bob": { "hp": 0, "messagesCount": 4 }
  },
  "topic": "...",
  "duration": 45120 // ms
}
```

---

## 4. Forfeit

If a player disconnects (socket connection lost) during a battle, they automatically forfeit.
The opponent receives `battle-end` with `reason: "forfeit"` and is declared the winner.
