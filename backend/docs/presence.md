# Presence API

Presence tracks online users and heartbeat freshness.

## 1. Connection Auth

Socket handshake must include JWT:

```js
io("http://localhost:3000", {
  auth: { token: "<jwt>" },
  transports: ["websocket"]
})
```

Possible auth errors:
- `auth_token_missing`
- `auth_invalid_token`

## 2. Presence Events

### Client -> Server

| Event | Payload | Notes |
|---|---|---|
| `heartbeat` | `{}` | Send every 30s |
| `go-online` | `{}` | Optional manual refresh |
| `go-offline` | `{}` | Optional explicit offline |

Notes:
- User is auto-marked online on socket connect.
- Frontend should still send heartbeat every 30 seconds.

### Server -> Client

#### `user-online`

```json
{
  "id": "67af0...",
  "displayName": "Alice",
  "avatarUrl": "",
  "level": 10
}
```

#### `user-offline`

```json
{
  "id": "67af0...",
  "reason": "heartbeat_timeout"
}
```

`reason` examples:
- `disconnect`
- `manual_offline`
- `heartbeat_timeout`

## 3. Heartbeat Timeout Behavior

If no heartbeat is received within `PRESENCE_TIMEOUT_MS`:
- user is removed from online list
- user is removed from queue
- active battle is forfeited (`battle-end` with surrender semantics)
- pending swipe requests are cleaned and requester receives timeout when relevant

Recommended client logic:
1. Emit `heartbeat` every 30s.
2. Reconnect automatically on network changes.
