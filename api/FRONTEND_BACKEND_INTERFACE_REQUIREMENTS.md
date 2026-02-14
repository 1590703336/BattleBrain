# BattleBrain Frontend Backend Interface Requirements

This document is the contract for frontend and backend integration.
Frontend currently supports mock mode and can switch to real backend using:

- `VITE_USE_MOCK_SOCKET=false`
- `VITE_USE_MOCK_API=false`

## 0. Data Ownership & Lifecycle

- Backend is source of truth for users, completed battles, records, leaderboard.
- Frontend keeps only transient runtime state for active battle/session UI.
- When a battle ends, backend must persist battle result and update user aggregates.
- Frontend should not be responsible for final DB writes of battle results.

## 1. Complete User Structure (Required)

Frontend profile and leaderboard require this full user model (fields can be split across APIs, but structure must be available):

```json
{
  "id": "u_123",
  "name": "NeoRoaster",
  "displayName": "NeoRoaster",
  "avatarUrl": "https://.../avatar.png",

  "level": 19,
  "xp": 8210,
  "levelInfo": {
    "currentLevelXp": 7800,
    "nextLevelXp": 8600,
    "levelProgressPct": 51
  },

  "stats": {
    "wins": 28,
    "losses": 17,
    "draws": 2,
    "totalBattles": 47,
    "winRate": 60,
    "messageCount": 913,
    "goodStrikes": 402,
    "toxicStrikes": 85,
    "totalDamageDealt": 10894,
    "totalDamageTaken": 10217,
    "avgWit": 71,
    "avgRelevance": 68,
    "avgToxicity": 24
  },

  "badges": [
    {
      "id": "badge_first_blood",
      "name": "First Blood",
      "tier": "bronze",
      "unlockedAt": "2026-02-14T18:20:00.000Z"
    }
  ],

  "createdAt": "2026-02-01T10:00:00.000Z",
  "updatedAt": "2026-02-14T18:20:00.000Z",
  "lastActiveAt": "2026-02-14T18:25:00.000Z"
}
```

Minimum fields actively used by frontend UI now:
- `id`, `name/displayName`, `level`, `xp`, `stats.winRate`, `levelInfo.levelProgressPct`, `badges[]`.

## 2. Real-time Battle (Socket.IO)

Namespace: default `/`  
Auth: JWT via handshake auth (`auth.token`) or cookie session.

### Client -> Server

1. `join-queue`
```json
{ "mode": "quick" }
```

2. `leave-queue`
```json
{}
```

3. `send-message`
```json
{ "battleId": "b_123", "text": "message up to 280 chars" }
```

### Server -> Client

1. `waiting`
```json
{ "queueId": "q_123", "position": 1, "etaSec": 2 }
```

2. `battle-start`
```json
{
  "battleId": "b_123",
  "topic": "If your ex texted at 2AM, what is your opening line?",
  "opponent": { "id": "u_2", "name": "HaloHex", "level": 14 },
  "durationSec": 90
}
```

3. `battle-message`
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
  "snapshot": { "myHp": 100, "opponentHp": 86, "timer": 81 }
}
```

4. `battle-tick`
```json
{ "myHp": 92, "opponentHp": 73, "timer": 57 }
```

5. `battle-end`
```json
{
  "battleId": "b_123",
  "winner": "me",
  "reason": "hp-zero",
  "finalState": { "myHp": 36, "opponentHp": 0, "timer": 21 }
}
```

6. `rate-limited`
```json
{ "retryAfterMs": 1200 }
```

## 3. Records API (Result Page)

### `GET /api/battles/:userId?limit=20`

Each record must include all frontend-required fields:

```json
[
  {
    "id": "hist_1",
    "battleId": "b_123",
    "topic": "...",
    "winner": "me",
    "finishedAt": "2026-02-14T18:23:18.000Z",

    "opponent": {
      "id": "u_2",
      "name": "HaloHex",
      "level": 14
    },

    "stats": {
      "myDamage": 102,
      "opponentDamage": 77,
      "messageCount": 15,
      "goodStrikes": 8,
      "toxicStrikes": 2
    },

    "meta": {
      "durationSec": 69,
      "endReason": "hp-zero"
    }
  }
]
```

UI-required (explicit):
- time (`finishedAt`)
- topic
- opponent name + level
- DMG (`myDamage/opponentDamage`)
- msg (`messageCount`)
- good (`goodStrikes`)
- toxic (`toxicStrikes`)

Also required for correctness/sorting/detail:
- `id`, `battleId`, `winner`, `meta.durationSec`, `meta.endReason`

## 4. Profile API

### `GET /api/users/me`
Return full User structure from section 1.

### Optional `GET /api/users/:id`
For future profile viewing/opponent cards.

## 5. Leaderboard API

### `GET /api/leaderboard?limit=100`

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

## 6. Aggressive Computation (recompute every request/event)

These should be calculated aggressively (实时/每次调用动态计算或刷新缓存):
- `queue.position`, `queue.etaSec`
- live battle snapshot: `myHp`, `opponentHp`, `timer`
- per-message score payload: `wit`, `relevance`, `toxicity`, `damage`, `strikeType`
- profile derived fields: `stats.winRate`, `levelInfo.levelProgressPct`
- leaderboard `rank` ordering

## 7. Database-Persisted Fields

Must be persisted in DB:
- User core identity/profile: `id`, `name`, `avatarUrl`, `level`, `xp`, badge inventory
- User aggregate stats: wins/losses/draws, totals, averages
- Battle entities: `battleId`, participants, topic, timestamps, winner, endReason
- Battle records shown in Result/Profile history
- Message log for completed battle (at least text + score + damage + ts)

## 8. Frontend-Temporary State (do NOT trust as source of truth)

Temporary client-side state only:
- in-progress queue UI state (`searching/found`, local status text)
- in-progress battle UI state (`draft`, combo, cooldowns, buffs, damage bursts, toasts)
- local animation/sound state (`audio unlocked`, transient FX)
- current route guards

Rule:
- During a live match, frontend can hold temporary battle state for rendering.
- After `battle-end`, backend persistence is authoritative and frontend should refresh from APIs.

## 9. Battle Completion Write Path

Expected backend flow when a battle ends:
1. Finalize winner + final snapshot.
2. Persist battle + messages + computed stats.
3. Update user aggregates (xp, level, wins/losses/draws, totals).
4. Update/refresh leaderboard ranking basis.
5. Emit `battle-end` to clients.

Frontend then:
- shows end modal,
- navigates to records,
- fetches records/profile from backend.

## 10. Error & Validation Expectations

- Reject message length > 280.
- Rate limit violations -> `rate-limited` with retry ms.
- Unknown/expired `battleId` -> recoverable error event or disconnect from battle room.
- Reconnect should support state rehydration (latest snapshot + recent messages).

## 11. Compatibility Notes

Frontend files bound to this contract:
- `frontend/src/types/socket.ts`
- `frontend/src/services/SocketService.ts`
- `frontend/src/pages/MatchPage.tsx`
- `frontend/src/pages/BattlePage.tsx`
- `frontend/src/pages/ResultPage.tsx`
- `frontend/src/pages/ProfilePage.tsx`
- `frontend/src/pages/LeaderboardPage.tsx`

When backend is ready, disable mock mode and keep payloads aligned with this spec.
