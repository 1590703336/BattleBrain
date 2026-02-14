import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import ResultCard from '../components/battle/ResultCard';
import Badge from '../components/common/Badge';
import Card from '../components/common/Card';
import { useBattleStore } from '../stores/battleStore';

export default function ResultPage() {
  const navigate = useNavigate();
  const { myHp, opponentHp, stats, reset, history } = useBattleStore(
    useShallow((state) => ({
      myHp: state.myHp,
      opponentHp: state.opponentHp,
      stats: state.stats,
      reset: state.reset,
      history: state.history,
    }))
  );

  const winner = useMemo<'me' | 'opponent' | 'draw'>(() => {
    if (history[0]) {
      return history[0].winner;
    }
    if (myHp === opponentHp) {
      return 'draw';
    }
    return myHp > opponentHp ? 'me' : 'opponent';
  }, [history, myHp, opponentHp]);

  const displayStats = history[0]?.stats ?? stats;

  const onReplay = () => {
    reset();
    navigate('/battle/demo');
  };

  return (
    <section className="mx-auto max-w-4xl space-y-4 py-6 md:space-y-5 md:py-12">
      <ResultCard winner={winner} stats={displayStats} onReplay={onReplay} />

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-[var(--font-display)] text-lg tracking-[0.08em]">Recent Battles</h3>
          <Badge text={`${history.length} saved`} tone="cyan" />
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-white/60">No battle records yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((item) => (
              <li key={item.id} className="rounded-xl border border-white/12 bg-black/20 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
                  <span>{new Date(item.finishedAt).toLocaleString()}</span>
                  <span className="uppercase tracking-[0.08em]">{item.winner}</span>
                </div>
                <p className="mt-1 text-sm text-white/90">{item.topic}</p>
                <p className="mt-1 text-xs text-white/65">
                  DMG {item.stats.myDamage}/{item.stats.opponentDamage} · Msg {item.stats.messageCount} · Good {item.stats.goodStrikes} · Toxic {item.stats.toxicStrikes}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
