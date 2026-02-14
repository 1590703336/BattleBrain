# User API

Base URL: `http://localhost:3000`

This document follows frontend contract in:
- `api/FRONTEND_BACKEND_INTERFACE_REQUIREMENTS.md`

---

## 1. Get My Profile

**Endpoint:** `GET /api/users/me`

Headers:
- `Authorization: Bearer <jwt>`

Response (200):
```json
{
  "user": {
    "id": "...",
    "email": "warrior@example.com",
    "name": "NeoRoaster",
    "displayName": "NeoRoaster",
    "avatarUrl": "",
    "bio": "",
    "level": 1,
    "xp": 0,
    "levelInfo": {
      "currentLevelXp": 0,
      "nextLevelXp": 220,
      "levelProgressPct": 0
    },
    "stats": {
      "wins": 0,
      "losses": 0,
      "draws": 0,
      "totalBattles": 0,
      "winRate": 0,
      "messageCount": 0,
      "goodStrikes": 0,
      "toxicStrikes": 0,
      "totalDamageDealt": 0,
      "totalDamageTaken": 0,
      "avgWit": 0,
      "avgRelevance": 0,
      "avgToxicity": 0
    },
    "badges": [],
    "createdAt": "2026-02-14T12:00:00.000Z",
    "updatedAt": "2026-02-14T12:00:00.000Z",
    "lastActiveAt": "2026-02-14T12:00:00.000Z"
  }
}
```

---

## 2. Get Public Profile

**Endpoint:** `GET /api/users/:id`

Headers:
- `Authorization: Bearer <jwt>`

Response (200):
```json
{ "user": { "id": "...", "name": "NeoRoaster", "displayName": "NeoRoaster", "level": 1, "xp": 0, "stats": { "winRate": 0 } } }
```

Notes:
- Public profile does not include `email`.

---

## 3. Update My Profile

**Endpoint:** `PATCH /api/users/me`

Headers:
- `Authorization: Bearer <jwt>`

Request body (any subset):
```json
{
  "displayName": "NewName",
  "avatarUrl": "https://...",
  "bio": "bio text"
}
```

Response (200):
```json
{ "user": { "id": "...", "displayName": "NewName" } }
```

Validation:
- `displayName`: string, non-empty, max 30 chars
- `avatarUrl`: string, max 2048 chars
- `bio`: string, max 200 chars

---

## 4. Battle History

Primary endpoint used by frontend records page:
- `GET /api/users/:userId/records?limit=20`

Also available under users resource:
- `GET /api/users/:userId/battles?limit=20`
- `GET /api/battles/:userId?limit=20`

Headers:
- `Authorization: Bearer <jwt>`

Response (200):
```json
[
  {
    "id": "hist_1",
    "battleId": "b_123",
    "topic": "...",
    "winner": "me",
    "finishedAt": "2026-02-14T18:23:18.000Z",
    "opponent": { "id": "u_2", "name": "HaloHex", "level": 14 },
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

Persistence note:
- User documents persist match history in `records` (embedded subdocuments).
- New battle writes are stored in `records`.
- `battles` route alias exists for compatibility, but backend source-of-truth is `records`.

---

## 5. Leaderboard

**Endpoint:** `GET /api/leaderboard?limit=100`

Response (200):
```json
[
  { "rank": 1, "id": "u_17", "name": "VoltJester", "level": 22, "xp": 9120, "winRate": 72 }
]
```

---

## 6. Auth Compatibility

- `GET /api/auth/me` is also available and returns `{ "user": ... }`.
- `POST /api/auth/signup` and `POST /api/auth/login` return:
  - `token`
  - `tokenType` (`Bearer`)
  - `expiresIn` (seconds)
  - `user` (full profile payload)
