import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ResultCard from '../components/battle/ResultCard';
import { useBattleStore } from '../stores/battleStore';

export default function ResultPage() {
  const navigate = useNavigate();
  const { myHp, opponentHp, stats, reset } = useBattleStore((state) => ({
    myHp: state.myHp,
    opponentHp: state.opponentHp,
    stats: state.stats,
    reset: state.reset,
  }));

  const winner = useMemo<'me' | 'opponent' | 'draw'>(() => {
    if (myHp === opponentHp) {
      return 'draw';
    }
    return myHp > opponentHp ? 'me' : 'opponent';
  }, [myHp, opponentHp]);

  const onReplay = () => {
    reset();
    navigate('/battle/demo');
  };

  return (
    <section className="mx-auto max-w-3xl py-6 md:py-12">
      <ResultCard winner={winner} stats={stats} onReplay={onReplay} />
    </section>
  );
}
