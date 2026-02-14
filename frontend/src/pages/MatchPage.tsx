import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import CardStack from '../components/match/CardStack';
import QueueScreen from '../components/match/QueueScreen';
import Toast from '../components/common/Toast';
import { useSocket } from '../hooks/useSocket';
import { useBattleStore } from '../stores/battleStore';
import { useMatchStore } from '../stores/matchStore';
import { BattleRequestPayload, BattleStartPayload, MatchCandidate, QueueWaitingPayload } from '../types/socket';

export default function MatchPage() {
  const navigate = useNavigate();
  const socket = useSocket(true);

  const [cards, setCards] = useState<MatchCandidate[]>([]);
  const [phase, setPhase] = useState<'swipe' | 'queue'>('swipe');
  const [lockedCandidateName, setLockedCandidateName] = useState('');
  const [incomingRequest, setIncomingRequest] = useState<BattleRequestPayload | null>(null);
  const [toast, setToast] = useState('');

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

  const refreshCards = () => {
    socket.emit('get-cards', {});
  };

  useEffect(() => {
    const onCards = (payload: MatchCandidate[]) => {
      setCards(payload);
    };

    const onWaiting = (payload: QueueWaitingPayload) => {
      setPhase('queue');
      setQueueStatus('searching');
      setWaitingMeta(payload.etaSec, `Queue position ${payload.position}. Matching players and generating topic...`);
    };

    const onBattleStart = (payload: BattleStartPayload) => {
      startBattle(payload);
      setIncomingRequest(null);
      setQueueStatus('found');
      setWaitingMeta(0, `${payload.opponent.name} accepted. Teleporting into arena...`);
      window.setTimeout(() => navigate(`/battle/${payload.battleId}`), 520);
    };

    const onBattleRequest = (payload: BattleRequestPayload) => {
      setIncomingRequest(payload);
    };

    const onDeclined = () => {
      setPhase('swipe');
      setQueueStatus('idle');
      setWaitingMeta(0, 'Challenge declined. Pick another target.');
      setToast('Opponent declined your challenge.');
      refreshCards();
    };

    const onTimeout = (payload: { reason: string }) => {
      setPhase('swipe');
      setQueueStatus('idle');
      setWaitingMeta(0, 'Request timed out. Pick another target.');
      setToast(payload.reason === 'offline' ? 'Target went offline.' : 'Request timed out.');
      refreshCards();
    };

    socket.on('online-users', onCards);
    socket.on('waiting', onWaiting);
    socket.on('battle-start', onBattleStart);
    socket.on('battle-request', onBattleRequest);
    socket.on('battle-request-declined', onDeclined);
    socket.on('battle-request-timeout', onTimeout);

    resetCurrent();
    reset();
    refreshCards();

    return () => {
      socket.off('online-users', onCards);
      socket.off('waiting', onWaiting);
      socket.off('battle-start', onBattleStart);
      socket.off('battle-request', onBattleRequest);
      socket.off('battle-request-declined', onDeclined);
      socket.off('battle-request-timeout', onTimeout);
    };
  }, [
    navigate,
    reset,
    resetCurrent,
    setQueueStatus,
    setWaitingMeta,
    socket,
    startBattle,
  ]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const onSwipe = (direction: 'left' | 'right', candidate: MatchCandidate) => {
    setCards((current) => current.filter((item) => item.id !== candidate.id));

    if (direction === 'left') {
      socket.emit('swipe-left', { targetId: candidate.id });
      return;
    }

    setIncomingRequest(null);
    setLockedCandidateName(candidate.name);
    setPhase('queue');
    setQueueing();
    setQueueStatus('searching');
    setWaitingMeta(
      candidate.isAi ? 2 : 12,
      candidate.isAi
        ? `Locking on ${candidate.name}. Generating battle topic...`
        : `Challenge sent to ${candidate.name}. Waiting for response...`
    );
    socket.emit('swipe-right', { targetId: candidate.id });
  };

  const fallbackName = useMemo(() => cards[0]?.name ?? 'Random Opponent', [cards]);

  const onQuickMatch = () => {
    const firstCard = cards[0];
    if (!firstCard) {
      setToast('No cards available right now. Refreshing...');
      refreshCards();
      return;
    }

    onSwipe('right', firstCard);
  };

  const onCancel = () => {
    socket.emit('leave-queue', {});
    reset();
    setPhase('swipe');
    setIncomingRequest(null);
    setLockedCandidateName('');
    refreshCards();
  };

  const acceptIncomingRequest = () => {
    if (!incomingRequest) {
      return;
    }

    setIncomingRequest(null);
    setLockedCandidateName(incomingRequest.from.displayName || incomingRequest.from.name);
    setPhase('queue');
    setQueueing();
    setQueueStatus('searching');
    setWaitingMeta(2, `Accepting ${incomingRequest.from.displayName || incomingRequest.from.name}...`);
    socket.emit('accept-battle', { requestId: incomingRequest.requestId });
  };

  const declineIncomingRequest = () => {
    if (!incomingRequest) {
      return;
    }
    socket.emit('decline-battle', { requestId: incomingRequest.requestId });
    setIncomingRequest(null);
    setToast('Challenge declined.');
  };

  return (
    <section className="mx-auto max-w-3xl py-6 md:py-10">
      <AnimatePresence mode="wait">
        {phase === 'swipe' ? (
          <motion.div key="swipe" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <h1 className="mb-4 font-[var(--font-display)] text-3xl tracking-[0.08em] md:text-4xl">Swipe To Match</h1>
            <p className="mb-5 text-sm text-white/65 md:text-base">Swipe right to challenge. Swipe left to skip this card.</p>
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
              statusText={statusText || `Locking on ${lockedCandidateName || 'opponent'}...`}
              onCancel={() => {
                onCancel();
                navigate('/');
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {incomingRequest ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center bg-black/60 px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="panel w-full max-w-md p-6"
            >
              <h2 className="font-[var(--font-display)] text-2xl tracking-[0.08em]">Incoming Challenge</h2>
              <p className="mt-2 text-sm text-white/75">
                {incomingRequest.from.displayName || incomingRequest.from.name} wants to battle.
              </p>
              <p className="mt-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/75">
                Topic will be generated after match lock-in.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={declineIncomingRequest}
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={acceptIncomingRequest}
                  className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/20"
                >
                  Accept
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Toast message={toast} visible={Boolean(toast)} />
    </section>
  );
}
