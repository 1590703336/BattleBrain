# Backend Work Division

To parallelize development, the remaining backend work is divided into two track: **Real-time Game Logic** and **User & Data API**.

---

## 🟢 Team A: Game Engine (Real-time)
**Focus:** Socket.IO, matchmaking, battle state, AI integration.
**Key Tech:** Socket.IO, OpenAI/OpenRouter API, In-memory state.

### 1. Matchmaking System
- **File:** `src/services/MatchmakingService.js`
- **Logic:**
  - Queue management (add/remove players).
  - Pairing logic (random or ELO-based).
  - Timeout handling (bot fallback).
- **Socket Events:** `queue_join`, `queue_leave`, `match_found`.

### 2. Battle Engine
- **File:** `src/services/BattleService.js`
- **Logic:**
  - State management (turn timers, round tracking).
  - Message handling (broadcast to room).
  - Timer synchronization.
- **Socket Events:** `battle_start`, `message_send`, `battle_end`.

### 3. AI Judge Integration
- **File:** `src/services/AIService.js`
- **Logic:**
  - Send debate transcript to LLM (OpenRouter).
  - Parse JSON response (winner, scores, reasoning).
  - Fallback logic for API failures.

### 4. Bot Logic (Optional/Parallel)
- **File:** `src/services/BotService.js`
- **Logic:**
  - AI persona generation.
  - Auto-reply simulation with delays.

**👉 Output:** Working real-time debates that can be played via WebSocket.

---

## 🔵 Team B: Data & REST API (Persistence)
**Focus:** User profiles, history, leaderboards, stats.
**Key Tech:** Express, MongoDB Aggregations.

### 1. User Profile API
- **File:** `src/controllers/UserController.js`
- **Endpoints:**
  - `GET /api/users/me` — Get own full profile.
  - `GET /api/users/:id` — Get public profile (scrubbed).
  - `PATCH /api/users/me` — Update avatar, bio, display name.

### 2. Battle History API
- **File:** `src/controllers/UserController.js` (or `BattleController`)
- **Endpoints:**
  - `GET /api/users/:id/records` — Get paginated battle history.
  - Since records are embedded in User, this queries the `records` array.

### 3. Leaderboard System
- **File:** `src/controllers/LeaderboardController.js`
- **Endpoints:**
  - `GET /api/leaderboard` — Top users by wins/wit.
- **Logic:**
  - MongoDB aggregation or simple sort on `stats.wins`.
  - Caching strategy (if scale requires it).

### 4. Docs & Formatting
- **Task:** Ensure all endpoints have corresponding `.md` files in `docs/` following the Auth example.
- **Task:** Verify API consistency (error codes, response envelopes).

**👉 Output:** Full REST API for the frontend to display profiles, history, and rankings.

---

## Shared Responsibilities
- **Integration:** Team A calls Team B's `User.save()` when a battle ends to persist the record.
- **Types/Constants:** Both teams update `src/config/constants.js` if game rules change.
