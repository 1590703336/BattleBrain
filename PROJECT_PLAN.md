# BattleBrain — Project Plan

Phased development roadmap with separate backend and frontend milestones.

---

## Phase 1 — Core MVP

> **Goal**: A working demo where two users can battle in real-time with AI moderation.

### Backend (Weeks 1–2)

| # | Task | Details |
|---|------|---------|
| 1 | **Project setup** | Node.js + Express + Socket.IO scaffold, ESLint, pino logging, env validation |
| 2 | **MongoDB integration** | Mongoose models for `User`, `Battle`, `Message`; connection pooling; indexes |
| 3 | **Matchmaking service** | Player queue, auto-pair when 2 waiting, bot fallback after 10s timeout |
| 4 | **AI message analysis** | GPT-oss 120b integration via OpenAI SDK; `analyze(message, topic)` → `{ wit, relevance, toxicity, damage, strikeType }`; JSON response format; keyword-based fallback |
| 5 | **Battle state machine** | `BattleService` class — HP tracking, mutex-locked state updates, timer-based battle end, victory condition checks |
| 6 | **Socket.IO events** | `join-queue`, `send-message` (client→server); `waiting`, `battle-start`, `battle-message`, `battle-end`, `rate-limited` (server→client) |
| 7 | **Rate limiting** | Per-player message cooldown (3s), max message length (280 chars) |
| 8 | **Health endpoint** | `GET /health` → `{ status, uptime, timestamp }` |
| 9 | **Bot opponent** | `BotService` — AI-generated witty responses on 5–10s intervals for solo/demo mode |
| 10 | **Battle persistence** | Save completed battles to MongoDB (participants, messages, scores, winner) |

### Frontend (Weeks 1–2)

| # | Task | Details |
|---|------|---------|
| 1 | **Project setup** | Vite 6 + React 19, TailwindCSS v4, Framer Motion, GSAP, React Router v7 |
| 2 | **Design system** | Color palette (dark theme with neon accents), typography (Inter/Outfit from Google Fonts), spacing tokens, glassmorphism card styles |
| 3 | **Landing page** | Hero section with animated title, "Start Battle" CTA, concept explanation, trending topics preview |
| 4 | **Socket.IO client service** | `SocketService` singleton — connect, disconnect, event listeners, reconnection logic |
| 5 | **Queue/waiting screen** | Matchmaking animation, opponent found transition |
| 6 | **Battle Arena page** | Two-column layout: HP bars at top, chat messages in middle, input at bottom; topic banner; countdown timer |
| 7 | **HealthBar component** | Animated HP bar (Framer Motion) with color transitions (green → yellow → red) |
| 8 | **ChatMessage component** | Message bubbles with strike type indicators (Good Strike = green glow, Toxic Strike = red pulse), AI scores (wit/relevance/toxicity) |
| 9 | **Battle end screen** | Winner/loser announcement, battle stats summary, "Play Again" button |
| 10 | **Responsive layout** | Mobile-first design, works on 375px–1440px+ |

---

## Phase 2 — Gamification & Polish

> **Goal**: Make it feel like a game, not just a chat app.

### Backend (Weeks 3–4)

| # | Task | Details |
|---|------|---------|
| 1 | **User profiles** | MongoDB `User` model expansion — display name, avatar, XP, level, win/loss record |
| 2 | **XP & leveling** | Award XP on battle completion (bonus for wins, wit scores); level thresholds |
| 3 | **Badge system** | Achievement badges: "First Blood", "Wit Master", "10-Win Streak", "Comeback King" |
| 4 | **Leaderboard API** | `GET /api/leaderboard` — top players by XP, wins, average wit score |
| 5 | **Topic expansion** | 20+ meme-based topics organized by category (Classic Petty, 2026 Meme Reset, Nihilist Penguin, Super Bowl Fallout) |
| 6 | **Match history API** | `GET /api/battles/:userId` — past battles with opponent, topic, result, messages |

### Frontend (Weeks 3–4)

| # | Task | Details |
|---|------|---------|
| 1 | **Swipe-to-match UI** | Tinder-style card stack (opponent profiles with humor style, level); swipe left/right with Framer Motion gestures |
| 2 | **Strike animations** | GSAP timelines: screen shake on damage, damage numbers floating up, burst particles on Good Strikes, red flash on Toxic Strikes |
| 3 | **Combo system UI** | Consecutive Good Strike counter with escalating visual effects |
| 4 | **Sound effects** | Howler.js — strike sounds, HP low warning, victory/defeat fanfare, typing indicator |
| 5 | **Profile page** | User stats, badges grid, match history list, level progress bar |
| 6 | **Leaderboard page** | Top players table with rank, avatar, XP, win rate |
| 7 | **Arena themes** | Different background gradients/particles per topic category |
| 8 | **Power-up UI** | Meme Attack, Pun Attack, Dodge — cooldown buttons with GSAP animations |

---

## Phase 3 — Safety & Social

> **Goal**: Make it safe, persistent, and shareable.

### Backend (Weeks 5–6)

| # | Task | Details |
|---|------|---------|
| 1 | **Authentication** | Firebase Auth or Supabase — email/password, Google OAuth, guest-to-account upgrade |
| 2 | **Persistent profiles** | Link auth identity to MongoDB user document; session management |
| 3 | **Advanced AI moderation** | Fine-tune GPT-oss 120b prompts for edge cases; persistent offense tracking; escalating penalties |
| 4 | **Reporting system** | `POST /api/reports` — flag users/messages; admin review queue |
| 5 | **Anonymous mode** | Optional — hide display name, use generated handle |
| 6 | **Epic Roast Clips API** | Generate shareable battle summaries with top messages and scores |

### Frontend (Weeks 5–6)

| # | Task | Details |
|---|------|---------|
| 1 | **Auth flow** | Login/signup modals, Google OAuth button, guest mode |
| 2 | **Settings page** | Toggle anonymous mode, notification preferences, account management |
| 3 | **Report UI** | Flag button on messages, report confirmation modal |
| 4 | **Share flow** | "Share Epic Roast" button → generates image/link for social media |
| 5 | **Onboarding tour** | First-time user walkthrough (Framer Motion step-by-step overlay) |

---

## Phase 4 — Scale & Advanced Features

> **Goal**: Grow the platform with competitive and social features.

### Backend (Weeks 7+)

| # | Task | Details |
|---|------|---------|
| 1 | **Seasonal tournaments** | Tournament bracket system, scheduled events, prize distribution |
| 2 | **2v2 team battles** | Multi-room Socket.IO, team HP pooling, team matchmaking |
| 3 | **Voice battles** | WebRTC integration — real-time speech-to-text + AI scoring |
| 4 | **WebSocket clustering** | Redis adapter for Socket.IO horizontal scaling |
| 5 | **Database sharding** | MongoDB sharding strategy for high-volume match data |
| 6 | **Analytics pipeline** | Track engagement metrics, battle completion rates, toxicity trends |

### Frontend (Weeks 7+)

| # | Task | Details |
|---|------|---------|
| 1 | **Tournament bracket UI** | Interactive bracket visualization, live updates |
| 2 | **Team battle arena** | 2v2 layout — dual chat streams, combined HP bars |
| 3 | **Voice battle mode** | Microphone controls, real-time transcription display |
| 4 | **Custom avatars** | Avatar creator/selector with unlockable cosmetics |
| 5 | **Custom arena skins** | Unlockable arena backgrounds and themes |
| 6 | **Daily challenges** | Challenge cards with rewards, streak tracking |
| 7 | **Community feed** | "Roast of the Week" highlights, trending battles |

---

## Risk Mitigation

| Risk | Mitigation Strategy |
|------|---------------------|
| **AI latency** | Keyword-based fallback analysis, optimistic UI updates, streaming responses |
| **Toxicity bypass** | Multi-layer detection (AI + keyword + pattern), escalating penalties, human review queue |
| **WebSocket scaling** | Redis adapter, connection pooling, horizontal scaling plan |
| **User retention** | Daily challenges, leaderboards, seasonal resets, badge collection |
| **API costs** | Rate limiting, message cooldowns, GPT-oss 120b (cost-effective vs GPT-4) |
| **MongoDB performance** | Proper indexing, connection pooling, read replicas for leaderboards |
