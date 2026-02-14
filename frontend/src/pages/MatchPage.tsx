import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import CardStack from '../components/match/CardStack';
import QueueScreen from '../components/match/QueueScreen';
import { useSocket } from '../hooks/useSocket';
import { useBattleStore } from '../stores/battleStore';
import { useMatchStore } from '../stores/matchStore';
import { BattleStartPayload, QueueWaitingPayload } from '../types/socket';

const candidatesSeed = [
  {
    id: 'c1',
    name: 'HyperNova',
    level: 16,
    humorStyle: 'Savage Irony',
    bio: 'Specialty: ultra-dry callbacks and fake-corporate roast format.',
  },
  {
    id: 'c2',
    name: 'PixelRuin',
    level: 12,
    humorStyle: 'Pun Burst',
    bio: 'Chains puns with escalating absurdity. High variance, high danger.',
  },
  {
    id: 'c3',
    name: 'LaughShard',
    level: 18,
    humorStyle: 'Deadpan Chaos',
    bio: 'Pretends calm. Then drops one-line devastation every 12 seconds.',
  },
  {
    id: 'c4',
    name: 'JokeVector',
    level: 14,
    humorStyle: 'Meme Sniper',
    bio: 'Meta meme references with precise timing and minimal mercy.',
  },
];

export default function MatchPage() {
  const navigate = useNavigate();
  const socket = useSocket(true);

  const [cards, setCards] = useState(candidatesSeed);
  const [phase, setPhase] = useState<'swipe' | 'queue'>('swipe');
  const [lockedCandidateName, setLockedCandidateName] = useState('');

  const { queueStatus, etaSec, statusText, setQueueStatus, setWaitingMeta, reset } = useMatchStore(
    useShallow((state) => ({
      queueStatus: state.queueStatus,
      etaSec: state.etaSec,
      statusText: state.statusText,
      setQueueStatus: state.setQueueStatus,
      setWaitingMeta: state.setWaitingMeta,
      reset: state.reset,
    }))
  );

  const { setQueueing, startBattle, resetCurrent } = useBattleStore(
    useShallow((state) => ({
      setQueueing: state.setQueueing,
      startBattle: state.startBattle,
      resetCurrent: state.resetCurrent,
    }))
  );

  useEffect(() => {
    if (phase !== 'queue') {
      return;
    }

    resetCurrent();
    setQueueing();
    setQueueStatus('searching');
    setWaitingMeta(2, `Locking on ${lockedCandidateName || 'opponent'} and scanning queue...`);

    const onWaiting = (payload: QueueWaitingPayload) => {
      setQueueStatus('searching');
      setWaitingMeta(payload.etaSec, `Queue position ${payload.position}. Negotiating battle slot...`);
    };

    const onBattleStart = (payload: BattleStartPayload) => {
      startBattle(payload);
      setQueueStatus('found');
      setWaitingMeta(0, `${payload.opponent.name} accepted. Teleporting into arena...`);
      window.setTimeout(() => navigate(`/battle/${payload.battleId}`), 520);
    };

    socket.on('waiting', onWaiting);
    socket.on('battle-start', onBattleStart);
    socket.emit('join-queue', { mode: 'quick' });

    return () => {
      socket.off('waiting', onWaiting);
      socket.off('battle-start', onBattleStart);
      socket.emit('leave-queue', {});
    };
  }, [
    lockedCandidateName,
    navigate,
    phase,
    resetCurrent,
    setQueueStatus,
    setQueueing,
    setWaitingMeta,
    socket,
    startBattle,
  ]);

  const onSwipe = (direction: 'left' | 'right', candidate: (typeof candidatesSeed)[number]) => {
    setCards((current) => current.filter((item) => item.id !== candidate.id));

    if (direction === 'right') {
      setLockedCandidateName(candidate.name);
      setPhase('queue');
    }
  };

  const fallbackName = useMemo(() => cards[0]?.name ?? 'Random Opponent', [cards]);

  const onQuickMatch = () => {
    setLockedCandidateName(fallbackName);
    setPhase('queue');
  };

  const onCancel = () => {
    socket.emit('leave-queue', {});
    reset();
    setPhase('swipe');
    setCards(candidatesSeed);
  };

  return (
    <section className="mx-auto max-w-3xl py-6 md:py-10">
      <AnimatePresence mode="wait">
        {phase === 'swipe' ? (
          <motion.div key="swipe" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <h1 className="mb-4 font-[var(--font-display)] text-3xl tracking-[0.08em] md:text-4xl">Swipe To Match</h1>
            <p className="mb-5 text-sm text-white/65 md:text-base">Right swipe to lock an opponent profile. Left swipe to skip and see the next.</p>
            <CardStack cards={cards} onSwipe={onSwipe} />
            <button
              type="button"
              onClick={onQuickMatch}
              className="mt-4 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Quick Match With {fallbackName}
            </button>
          </motion.div>
        ) : (
          <motion.div key="queue" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <QueueScreen
              queueStatus={queueStatus}
              etaSec={etaSec}
              statusText={statusText}
              onCancel={() => {
                onCancel();
                navigate('/');
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
