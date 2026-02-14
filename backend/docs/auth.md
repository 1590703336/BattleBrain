# Authentication API

Base URL: `http://localhost:3000/api/auth`

Authentication is handled via JWT tokens. The token is returned upon successful signup or login and must be included in the `Authorization` header (`Bearer <token>`) for protected routes and in the Socket.IO handshake auth.

---

## 1. Sign Up

Create a new user account.

**Endpoint:** `POST /signup`

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | `string` | Yes | Valid email address (unique) |
| `password` | `string` | Yes | Password (min 6 characters) |
| `displayName` | `string` | Yes | Public display name (max 30 chars) |

**Example Input:**
```json
{
  "email": "warrior@example.com",
  "password": "securepassword123",
  "displayName": "WittyWarrior"
}
```

### Response (201 Created)

Returns the JWT token and the created user object (excluding sensitive data like password).

**Example Output:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65a1b2c3d4e5f6a7b8c9d0e1",
    "email": "warrior@example.com",
    "displayName": "WittyWarrior",
    "avatarUrl": "",
    "bio": "",
    "battles": [],
    "stats": {
      "totalBattles": 0,
      "wins": 0,
      "losses": 0,
      "winRate": 0
    },
    "createdAt": "2026-02-14T10:00:00.000Z",
    "updatedAt": "2026-02-14T10:00:00.000Z"
  }
}
```

### Error Responses

- **400 Bad Request**: Missing fields or invalid password length.
  ```json
  {
    "error": "Password must be at least 6 characters",
    "code": "VALIDATION_ERROR"
  }
  ```
- **409 Conflict**: Email already registered.
  ```json
  {
    "error": "Email already in use",
    "code": "CONFLICT"
  }
  ```

---

## 2. Login

Authenticate an existing user.

**Endpoint:** `POST /login`

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | `string` | Yes | User's email |
| `password` | `string` | Yes | User's password |

**Example Input:**
```json
{
  "email": "warrior@example.com",
  "password": "securepassword123"
}
```

### Response (200 OK)

Returns the JWT token and the user object.

**Example Output:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65a1b2c3d4e5f6a7b8c9d0e1",
    "email": "warrior@example.com",
    "displayName": "WittyWarrior",
    "avatarUrl": "https://example.com/avatar.png",
    "bio": "I debate for fun.",
    "battles": [
      {
        "opponentName": "MemeLord",
        "topic": "Cats vs Dogs",
        "result": "win",
        "messageCount": 12,
        "duration": 150000,
        "playedAt": "2026-02-13T12:00:00.000Z"
      }
    ],
    "stats": {
      "totalBattles": 1,
      "wins": 1,
      "losses": 0,
      "winRate": 100
    },
    "createdAt": "2026-02-14T10:00:00.000Z",
    "updatedAt": "2026-02-14T12:00:00.000Z"
  }
}
```

### Error Responses

- **400 Bad Request**: Missing email or password.
- **401 Unauthorized**: Invalid email or password.
  ```json
  {
    "error": "Invalid email or password",
    "code": "AUTH_ERROR"
  }
  ```
