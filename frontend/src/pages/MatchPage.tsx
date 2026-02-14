import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import QueueScreen from '../components/match/QueueScreen';
import { useSocket } from '../hooks/useSocket';
import { useBattleStore } from '../stores/battleStore';
import { useMatchStore } from '../stores/matchStore';
import { BattleStartPayload, QueueWaitingPayload } from '../types/socket';

export default function MatchPage() {
  const navigate = useNavigate();
  const socket = useSocket(true);

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
    resetCurrent();
    setQueueing();
    setQueueStatus('searching');
    setWaitingMeta(2, 'Scanning arena for an opponent with matching chaos level...');

    const onWaiting = (payload: QueueWaitingPayload) => {
      setQueueStatus('searching');
      setWaitingMeta(payload.etaSec, `Queue position ${payload.position}. Warming up neon arena...`);
    };

    const onBattleStart = (payload: BattleStartPayload) => {
      startBattle(payload);
      setQueueStatus('found');
      setWaitingMeta(0, `${payload.opponent.name} joined. Syncing battle state...`);
      window.setTimeout(() => navigate(`/battle/${payload.battleId}`), 640);
    };

    socket.on('waiting', onWaiting);
    socket.on('battle-start', onBattleStart);
    socket.emit('join-queue', { mode: 'quick' });

    return () => {
      socket.off('waiting', onWaiting);
      socket.off('battle-start', onBattleStart);
      socket.emit('leave-queue', {});
    };
  }, [navigate, resetCurrent, setQueueStatus, setQueueing, setWaitingMeta, socket, startBattle]);

  const onCancel = () => {
    socket.emit('leave-queue', {});
    reset();
    navigate('/');
  };

  return (
    <section className="mx-auto max-w-3xl py-6 md:py-10">
      <QueueScreen queueStatus={queueStatus} etaSec={etaSec} statusText={statusText} onCancel={onCancel} />
    </section>
  );
}
