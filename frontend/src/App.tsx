import { AnimatePresence, motion } from 'framer-motion';
import { Route, Routes, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import BattlePage from './pages/BattlePage';
import LandingPage from './pages/LandingPage';
import ResultPage from './pages/ResultPage';
import { pageMotion } from './utils/motion';

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
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/battle/:id" element={<BattlePage />} />
          <Route path="/result/:id" element={<ResultPage />} />
        </Routes>
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
