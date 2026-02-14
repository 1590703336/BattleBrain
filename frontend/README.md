# BattleBrain Frontend

React SPA powering the Battle Arena demo UI — landing, real-time battle arena, and result screen with layered animation.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 19 (Vite 6) |
| Styling | TailwindCSS v4 |
| UI Animations | Framer Motion |
| Game Animations | GSAP (GreenSock) |
| State | Zustand |
| Routing | React Router v7 |
| Real-Time | Socket.IO Client |
| Audio | Howler.js (optional) |
| Fonts | Orbitron, Manrope (Google Fonts) |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev        # → http://localhost:5173
```

> **Note**: The backend must be running at `http://localhost:3000` for local dev (or set `VITE_API_BASE_URL`, `VITE_SOCKET_URL`, `VITE_SOCKET_PATH` in `.env`).

## Architecture

See [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) for the full system design, component hierarchy, animation system, and design decisions.

## Implemented in this iteration

- `Landing` page with animated hero, CTA, and topic cards.
- `Auth` pages:
  - `/login`
  - `/signup`
  - JWT session persistence in localStorage
- `Battle` page with:
  - HP bars
  - live message list
  - timer
  - strike effects (Framer Motion + GSAP)
  - stress test trigger (`10x Stress`)
- `Result` page with winner state and battle stats.
- Design tokens and motion tokens:
  - `src/styles/tokens.css`
  - `src/utils/motion.ts`
- Socket event types:
  - `src/types/socket.ts`

## Additional docs

- Visual baseline: [DESIGN_BASELINE.md](./DESIGN_BASELINE.md)
- QA checklist: [QA_CHECKLIST.md](./QA_CHECKLIST.md)

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run frontend auth unit tests (Node test runner) |
| `npm run lint` | Run TypeScript static checks |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_BASE_PATH` | `/` | Frontend routing/build base path |
| `VITE_API_BASE_URL` | `http://localhost:3000` | API request base URL |
| `VITE_SOCKET_URL` | `http://localhost:3000` | Socket.IO server origin |
| `VITE_SOCKET_PATH` | `/socket.io` | Socket.IO path |
| `VITE_APP_NAME` | `BattleBrain` | App display name |
| `VITE_USE_MOCK_SOCKET` | `true` | Use frontend mock battle socket flow until backend socket is ready |
| `VITE_USE_MOCK_API` | `false` | Set to `true` to use hardcoded records API data |
