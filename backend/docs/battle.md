# Battle Engine API

Real-time battle protocol used after `battle-start`.

## 1. Core Config

- Duration: `BATTLE_DURATION_MS` (currently 180s)
- HP: `100` per player
- Message length: `<= 280`
- Cooldown: `MESSAGE_COOLDOWN_MS` (currently 3s)

## 2. Client -> Server

| Event | Payload |
|---|---|
| `send-message` | `{ battleId: string, text: string }` |
| `surrender-battle` | `{ battleId: string }` |

## 3. Server -> Client

### `rate-limited`

```json
{
  "reason": "message_cooldown",
  "cooldownRemaining": 1700
}
```

Or for length violation:

```json
{
  "reason": "message_too_long"
}
```

### `battle-message`

```json
{
  "battleId": "battle_1739530_09aa8f2c",
  "senderId": "67af0...",
  "message": "Pineapple adds balance to salty cheese.",
  "analysis": {
    "wit": 82,
    "relevance": 90,
    "toxicity": 11,
    "damage": 86,
    "strikeType": "good",
    "damageTarget": "opponent"
  },
  "state": {
    "67af0...": { "hp": 100 },
    "67af1...": { "hp": 74 }
  }
}
```

`strikeType` values:
- `good`
- `toxic`
- `neutral`

Scoring and HP rules (percentage-based):
- `wit`, `relevance`, `toxicity` are `0-100`.
- `toxic`: when `toxicity >= 60`, damage = `toxicity` and target = sender (`damageTarget: "me"`).
- `good`: when `wit >= 50` and `relevance >= 50` (and not toxic), damage = `round(wit * 0.55 + relevance * 0.45)` and target = opponent.
- `neutral`: otherwise, `damage = 0`, `damageTarget = null`.

### `battle-end`

Per-player payload:

```json
{
  "battleId": "battle_1739530_09aa8f2c",
  "winner": "me",
  "reason": "hp-zero",
  "finalState": {
    "myHp": 52,
    "opponentHp": 0,
    "timer": 0
  },
  "winnerId": "67af0...",
  "topic": "Pineapple on pizza is a crime",
  "duration": 46213,
  "legacyFinalState": {
    "67af0...": { "hp": 52, "messagesCount": 6 },
    "67af1...": { "hp": 0, "messagesCount": 5 }
  }
}
```

`reason` values:
- `hp-zero`
- `timeout`
- `surrender`

## 4. Persistence

On `battle-end`, backend persists:
- embedded `records[]` entries in each user document
- updated aggregate stats (`wins/losses/draws`, strike counts, damage, averages)
- progression updates (`xp`, `level`)

New writes go to `records` (not legacy `battles`).
