import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import { pageMotion } from './utils/motion';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const MatchPage = lazy(() => import('./pages/MatchPage'));
const BattlePage = lazy(() => import('./pages/BattlePage'));
const ResultPage = lazy(() => import('./pages/ResultPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));

function RouteFallback() {
  return (
    <div className="panel flex min-h-[260px] items-center justify-center">
      <span className="text-sm uppercase tracking-[0.12em] text-white/65">Loading Arena...</span>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={pageMotion.initial}
        animate={pageMotion.animate}
        exit={pageMotion.exit}
        transition={pageMotion.transition}
      >
        <Suspense fallback={<RouteFallback />}>
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/match" element={<MatchPage />} />
            <Route path="/battle" element={<Navigate to="/match" replace />} />
            <Route path="/battle/:id" element={<BattlePage />} />
            <Route path="/result" element={<Navigate to="/result/demo" replace />} />
            <Route path="/result/:id" element={<ResultPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AppShell>
      <AnimatedRoutes />
    </AppShell>
  );
}
