import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import Badge from '../components/common/Badge';
import Card from '../components/common/Card';
import { useBattleStore } from '../stores/battleStore';
import { useUserStore } from '../stores/userStore';

export default function ProfilePage() {
  const { id, displayName, level, xp, wins, losses, badges } = useUserStore(
    useShallow((state) => ({
      id: state.id,
      displayName: state.displayName,
      level: state.level,
      xp: state.xp,
      wins: state.wins,
      losses: state.losses,
      badges: state.badges,
    }))
  );

  const history = useBattleStore((state) => state.history);

  const winRate = useMemo(() => {
    const total = wins + losses;
    if (total === 0) {
      return 0;
    }
    return Math.round((wins / total) * 100);
  }, [wins, losses]);

  const nextLevelXp = (level + 1) * 220;
  const progress = Math.min(100, Math.round((xp / nextLevelXp) * 100));

  return (
    <section className="mx-auto max-w-5xl space-y-4 md:space-y-5">
      <Card>
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h1 className="font-[var(--font-display)] text-3xl tracking-[0.08em]">{displayName}</h1>
            <p className="mt-1 text-sm text-white/65">Arena ID: {id}</p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <Stat title="Level" value={level} />
              <Stat title="XP" value={xp} />
              <Stat title="Win Rate" value={`${winRate}%`} />
            </div>

            <div className="mt-4 rounded-xl border border-white/12 bg-black/25 p-3">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.1em] text-white/65">
                <span>Level Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-neon-cyan),var(--color-neon-lime))]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/12 bg-black/20 p-4">
            <p className="text-sm font-semibold">Badges</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge key={badge} text={badge} tone="lime" />
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-[var(--font-display)] text-lg tracking-[0.08em]">Recent Matches</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-white/60">No local matches yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {history.slice(0, 8).map((item) => (
              <li key={item.id} className="rounded-xl border border-white/12 bg-black/20 px-3 py-2">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>{new Date(item.finishedAt).toLocaleString()}</span>
                  <span className="uppercase">{item.winner}</span>
                </div>
                <p className="mt-1 text-sm">{item.topic}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/12 bg-black/25 p-3">
      <div className="text-xs uppercase tracking-[0.08em] text-white/55">{title}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
