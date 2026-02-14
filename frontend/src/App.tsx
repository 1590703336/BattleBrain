import { AnimatePresence, motion } from 'framer-motion';
import { ReactElement, lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import { ApiService } from './services/ApiService';
import { useUserStore } from './stores/userStore';
import { pageMotion } from './utils/motion';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
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

function ProtectedRoute({ children }: { children: ReactElement }) {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AnimatedRoutes() {
  const location = useLocation();
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);

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
            <Route path="/login" element={isAuthenticated ? <Navigate to="/match" replace /> : <LoginPage />} />
            <Route path="/signup" element={isAuthenticated ? <Navigate to="/match" replace /> : <SignupPage />} />
            <Route
              path="/match"
              element={
                <ProtectedRoute>
                  <MatchPage />
                </ProtectedRoute>
              }
            />
            <Route path="/battle" element={<Navigate to="/match" replace />} />
            <Route
              path="/battle/:id"
              element={
                <ProtectedRoute>
                  <BattlePage />
                </ProtectedRoute>
              }
            />
            <Route path="/result" element={<Navigate to="/result/demo" replace />} />
            <Route
              path="/result/:id"
              element={
                <ProtectedRoute>
                  <ResultPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const token = useUserStore((state) => state.token);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const setProfile = useUserStore((state) => state.setProfile);
  const logout = useUserStore((state) => state.logout);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    ApiService.getMe()
      .then((payload) => {
        if (active) {
          setProfile(payload.user);
        }
      })
      .catch(() => {
        if (active) {
          logout();
        }
      });

    return () => {
      active = false;
    };
  }, [logout, setProfile, token]);

  return (
    <AppShell>
      <AnimatedRoutes />
    </AppShell>
  );
}
