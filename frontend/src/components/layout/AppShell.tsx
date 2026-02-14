import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-bg-ink)] text-[var(--color-text-primary)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,var(--color-neon-cyan)_0%,transparent_70%)] opacity-30 blur-2xl" />
        <div className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-[radial-gradient(circle,var(--color-neon-lime)_0%,transparent_70%)] opacity-20 blur-2xl" />
        <div className="grid-noise absolute inset-0 opacity-35" />
      </div>

      <header className="relative z-10 border-b border-white/10 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <Link to="/" className="font-[var(--font-display)] text-xl tracking-[0.12em] text-[var(--color-neon-cyan)]">
            BATTLEBRAIN
          </Link>
          <nav className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-sm">
            <Link
              to="/"
              className={`rounded-full px-3 py-1.5 transition ${
                location.pathname === '/' ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              Home
            </Link>
            <Link
              to="/battle/demo"
              className={`rounded-full px-3 py-1.5 transition ${
                location.pathname.startsWith('/battle') ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              Arena
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-8 pt-6 md:px-8 md:pb-12 md:pt-10">{children}</main>
    </div>
  );
}
