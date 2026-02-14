# 🧠 BattleBrain — Meme Battle Arena

A real-time, gamified AI-moderated debate platform where users match Tinder-style and enter a **Battle Arena**. An AI Moderator assigns petty, meme-based debate topics. Witty, on-topic arguments ("Good Strikes") reduce opponent HP — toxic messages penalize the sender.

> **"Pokémon battles for debates."** — Wit is your weapon.

---

## 🎮 Core Concept

| Mechanic | Description |
|----------|-------------|
| **Matching** | Swipe-left / swipe-right to find an opponent |
| **Battle Arena** | Real-time 1v1 chat room with HP bars and a countdown timer |
| **Good Strike** | Witty, on-topic message → opponent loses HP |
| **Toxic Strike** | Slur, personal attack → **you** lose HP |
| **AI Moderator** | Scores every message for wit, relevance, and toxicity in real-time |
| **Battle Brain** | Meme-based topics: "Is cereal a soup?", "Android green bubbles vs. Apple Dynamic Island", 2026 Meme Reset nostalgia, Nihilist Penguin, Super Bowl fallout |

---

## 🏗️ Architecture

```
BattleBrain/
├── backend/              # Node.js + Express + Socket.IO server
│   ├── src/              # Layered architecture (config → services → handlers)
│   ├── BACKEND_ARCHITECTURE.md
│   └── README.md
├── frontend/             # React + Vite SPA
│   ├── src/              # Components, pages, hooks, services
│   ├── FRONTEND_ARCHITECTURE.md
│   └── README.md
├── PROJECT_PLAN.md       # Phased development roadmap
└── README.md             # ← You are here
```

---

## 🛠️ Tech Stack

### Frontend
| Category | Technology |
|----------|-----------|
| Framework | React 19 (Vite 6) |
| Styling | TailwindCSS v4 |
| UI Animations | Framer Motion |
| Game Animations | GSAP (GreenSock) |
| Real-Time | Socket.IO Client |
| Routing | React Router v7 |
| State | Zustand |

### Backend
| Category | Technology |
|----------|-----------|
| Runtime | Node.js + Express |
| WebSockets | Socket.IO |
| AI Model | GPT-oss 120b (wit, relevance, toxicity scoring) |
| Database | MongoDB (users, matches, stats, XP) |
| Logging | pino + pino-pretty |
| Concurrency | async-mutex |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- MongoDB instance (local or Atlas)
- OpenAI-compatible API key (for GPT-oss 120b)

### Backend
```bash
cd backend
npm install
cp .env.example .env       # Add your OPENAI_API_KEY + MONGODB_URI
npm run dev                 # → http://localhost:3000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                 # → http://localhost:5173
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Backend Architecture](./backend/BACKEND_ARCHITECTURE.md) | Layered design, services, Socket.IO events |
| [Frontend Architecture](./frontend/FRONTEND_ARCHITECTURE.md) | Component hierarchy, animation system, state management |
| [Project Plan](./PROJECT_PLAN.md) | Phased roadmap with separate backend & frontend milestones |

---

## 🎯 Feature Roadmap

| Phase | Focus | Key Features |
|-------|-------|-------------|
| **1 — MVP** | Core gameplay | Landing page, quick match, battle arena, HP system, AI scoring |
| **2 — Gamification** | Polish & depth | Swipe matching, strike animations, sound effects, badges, XP |
| **3 — Safety & Social** | Trust & sharing | User auth, persistent profiles, match history, reporting |
| **4 — Scale** | Growth | Tournaments, 2v2 battles, voice battles, custom avatars |

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT
