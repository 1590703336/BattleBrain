# Presence & Connection API

This document details the Socket.IO connection handling and presence system (online/offline status).

## 1. Connection

### Client Setup
Connect to the base URL (e.g., `http://localhost:3000`) with the JWT in the `auth` object.

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: {
    token: "eyJhbGciOi..." // JWT from login
  },
  transports: ["websocket"] // Recommended
});
```

### Connection Events

| Event | Direction | Description |
|---|---|---|
| `connect` | Client → Server | Triggered when connection is established |
| `connect_error` | Server → Client | Fired on auth failure or network issues |
| `disconnect` | Server ↔ Client | Fired when connection is lost |

**Error Handling Example:**
```javascript
socket.on("connect_error", (err) => {
  console.error("Connection failed:", err.message);
  // err.message will be "auth_token_missing" or "auth_invalid_token" if auth fails
});
```

---

## 2. Presence System

Manage user online status. Note: You must manually emit `go-online` after connecting to be visible to others.

### Emitters (Client → Server)

| Event | Payload | Description |
|---|---|---|
| `go-online` | `null` | Mark self as online and broadcast to others |
| `go-offline` | `null` | Mark self as offline (also triggered by disconnect) |
| `heartbeat` | `null` | Send every 30s to keep presence active |

### Listeners (Server → Client)

These events allow you to track who else is online.

#### `online-users`
Received immediately after `go-online`. detailed list of all currently online users.

**Payload:** `User[]` (Array of user objects)
```json
[
  {
    "id": "u_1",
    "displayName": "Alice",
    "avatarUrl": "...",
    "level": 5
  },
  {
    "id": "u_2",
    "displayName": "Bob",
    ...
  }
]
```

#### `user-online`
Broadcast when another user goes online. Use this to update your local list.

**Payload:** `User`
```json
{
  "id": "u_3",
  "displayName": "Charlie",
  ...
}
```

#### `user-offline`
Broadcast when a user disconnects or goes offline.

**Payload:** `{ userId: string }`
```json
{
  "userId": "u_3"
}
```

---

## 3. Best Practices

1. **Heartbeat:** Implement a `setInterval` loop to emit `heartbeat` every 30 seconds to prevent growing stale. 
   *(Backend wipes inactive users after 60s)*.
2. **Reconnection:** Socket.IO handles reconnection automatically, but you should re-emit `go-online` on the `connect` event.

```javascript
socket.on('connect', () => {
    socket.emit('go-online');
});
```
