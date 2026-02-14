# Authentication API

Base URL: `http://localhost:3000/api/auth`

This document is aligned with frontend requirements in:
- `api/FRONTEND_BACKEND_INTERFACE_REQUIREMENTS.md`

Authentication uses JWT Bearer tokens for HTTP and Socket.IO handshake auth.

---

## 1. Auth Session Contract (Required)

All successful auth endpoints should return a session payload with:

```json
{
  "token": "<jwt>",
  "tokenType": "Bearer",
  "expiresIn": 604800,
  "user": {
    "id": "u_123",
    "email": "warrior@example.com",
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
}
```

Notes:
- `name` and `displayName` should both be present for compatibility.
- `levelInfo.levelProgressPct` and `stats.winRate` are derived values and should be returned precomputed.
- Backend remains source of truth for all `user` stats and progression fields.

---

## 2. Sign Up

Create a new user account.

**Endpoint:** `POST /signup`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `string` | Yes | Unique email |
| `password` | `string` | Yes | Password (min 6 chars) |
| `displayName` | `string` | Yes | Public name (max 30 chars) |

### Example Request

```json
{
  "email": "warrior@example.com",
  "password": "securepassword123",
  "displayName": "WittyWarrior"
}
```

### Response (201)

Returns full auth session contract (section 1).

### Error Responses

- `400 VALIDATION_ERROR`
```json
{ "error": "Password must be at least 6 characters", "code": "VALIDATION_ERROR" }
```
- `409 CONFLICT`
```json
{ "error": "Email already in use", "code": "CONFLICT" }
```

---

## 3. Login

Authenticate an existing user.

**Endpoint:** `POST /login`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `string` | Yes | User email |
| `password` | `string` | Yes | User password |

### Example Request

```json
{
  "email": "warrior@example.com",
  "password": "securepassword123"
}
```

### Response (200)

Returns full auth session contract (section 1).

### Error Responses

- `400 VALIDATION_ERROR`
- `401 AUTH_ERROR`
```json
{ "error": "Invalid email or password", "code": "AUTH_ERROR" }
```

---

## 4. Get Current Authenticated User (Required for frontend boot)

Fetch current logged-in user profile for app/session initialization.

**Endpoint:** `GET /me`

Headers:
- `Authorization: Bearer <jwt>`

### Response (200)

```json
{
  "user": {
    "id": "u_123",
    "email": "warrior@example.com",
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
    "badges": [],
    "createdAt": "2026-02-01T10:00:00.000Z",
    "updatedAt": "2026-02-14T18:20:00.000Z",
    "lastActiveAt": "2026-02-14T18:25:00.000Z"
  }
}
```

### Error Responses

- `401 AUTH_ERROR`
```json
{ "error": "Invalid or expired token", "code": "AUTH_ERROR" }
```

---

## 5. Logout (optional in stateless JWT mode)

If implemented with token deny-list or session table.

**Endpoint:** `POST /logout`

Headers:
- `Authorization: Bearer <jwt>`

Response (200):
```json
{ "ok": true }
```

---

## 6. Token Usage

### HTTP
Use `Authorization: Bearer <token>` for protected endpoints.

### Socket.IO
Use handshake auth token:

```js
io(BACKEND_URL, {
  auth: { token: '<jwt>' }
})
```

Server should reject missing/invalid token with:
- `auth_token_missing`
- `auth_invalid_token`

---

## 7. Computation vs Persistence Responsibilities

### Aggressive/derived per request (compute on read)
- `stats.winRate`
- `levelInfo.levelProgressPct`
- `levelInfo.currentLevelXp`
- `levelInfo.nextLevelXp`

### Persisted in database
- Identity/profile: `id`, `email`, `name/displayName`, `avatarUrl`
- Progression: `level`, `xp`, badges
- Aggregates: `wins`, `losses`, `draws`, totals, averages
- Timestamps: `createdAt`, `updatedAt`, `lastActiveAt`

### Frontend temporary only
- In-progress match UI state (queue status, local animation flags, combo, cooldowns)
- Live battle rendering state before final persistence

After `battle-end`, backend should persist battle + update user aggregates; frontend should refresh profile/records from backend.

---

## 8. Compatibility Notes

Frontend pages depending on this auth/user payload:
- `frontend/src/pages/ProfilePage.tsx`
- `frontend/src/pages/LeaderboardPage.tsx`
- `frontend/src/pages/ResultPage.tsx`
- `frontend/src/stores/userStore.ts` (currently mock-backed, should switch to `/api/auth/me`)
