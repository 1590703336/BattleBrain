import { AnimatePresence, motion } from 'framer-motion';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import ChatMessage from '../components/battle/ChatMessage';
import HealthBar from '../components/battle/HealthBar';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Toast from '../components/common/Toast';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import { useSocket } from '../hooks/useSocket';
import { useStrikeAnimation } from '../hooks/useStrikeAnimation';
import { useBattleStore } from '../stores/battleStore';
import { BattleEndPayload, BattleMessagePayload, BattleStateSnapshot } from '../types/socket';
import { MAX_HP } from '../utils/constants';

interface DamageBurst {
  id: string;
  value: number;
  target: 'me' | 'opponent';
  tone: 'good' | 'toxic' | 'neutral';
}

export default function BattlePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const socket = useSocket(true);
  const reducedMotion = useReducedMotionPreference();

  const {
    status,
    battleId,
    topic,
    opponent,
    myHp,
    opponentHp,
    messages,
    timer,
    stats,
    ingestMessage,
    setSnapshot,
    endBattle,
    saveCurrentResult,
    resetCurrent,
  } = useBattleStore(
    useShallow((state) => ({
      status: state.status,
      battleId: state.battleId,
      topic: state.topic,
      opponent: state.opponent,
      myHp: state.myHp,
      opponentHp: state.opponentHp,
      messages: state.messages,
      timer: state.timer,
      stats: state.stats,
      ingestMessage: state.ingestMessage,
      setSnapshot: state.setSnapshot,
      endBattle: state.endBattle,
      saveCurrentResult: state.saveCurrentResult,
      resetCurrent: state.resetCurrent,
    }))
  );

  const [draft, setDraft] = useState('');
  const [damageBursts, setDamageBursts] = useState<DamageBurst[]>([]);
  const [toast, setToast] = useState('');

  const arenaRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { triggerStrike } = useStrikeAnimation(arenaRef, reducedMotion);

  useEffect(() => {
    if (status === 'idle' || status === 'queueing' || !battleId || battleId !== id) {
      navigate('/match', { replace: true });
    }
  }, [status, battleId, id, navigate]);

  useEffect(() => {
    const onMessage = (payload: BattleMessagePayload) => {
      ingestMessage(payload);

      const { message } = payload;
      if (message.damage > 0 && message.damageTarget) {
        setDamageBursts((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            value: message.damage,
            target: message.damageTarget as 'me' | 'opponent',
            tone: message.strikeType,
          },
        ]);
        triggerStrike(message.strikeType === 'toxic' ? 'toxic' : 'good');
      }
    };

    const onTick = (payload: BattleStateSnapshot) => {
      setSnapshot(payload);
    };

    const onEnd = (payload: BattleEndPayload) => {
      endBattle(payload);
      saveCurrentResult({ winner: payload.winner });
    };

    const onRateLimited = (payload: { retryAfterMs: number }) => {
      setToast(`Cooldown active: retry in ${Math.ceil(payload.retryAfterMs / 1000)}s.`);
    };

    socket.on('battle-message', onMessage);
    socket.on('battle-tick', onTick);
    socket.on('battle-end', onEnd);
    socket.on('rate-limited', onRateLimited);

    return () => {
      socket.off('battle-message', onMessage);
      socket.off('battle-tick', onTick);
      socket.off('battle-end', onEnd);
      socket.off('rate-limited', onRateLimited);
    };
  }, [socket, ingestMessage, setSnapshot, endBattle, saveCurrentResult, triggerStrike]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [messages, reducedMotion]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = window.setTimeout(() => setToast(''), 1600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (damageBursts.length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setDamageBursts((current) => current.slice(1));
    }, reducedMotion ? 120 : 520);

    return () => window.clearTimeout(timeout);
  }, [damageBursts, reducedMotion]);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !battleId || status !== 'active') {
      return;
    }

    socket.emit('send-message', {
      battleId,
      text: draft.trim().slice(0, 280),
    });
    setDraft('');
  };

  const timerLabel = useMemo(() => {
    const min = Math.floor(timer / 60);
    const sec = timer % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }, [timer]);

  const showEndModal = status === 'ended';
  const endTitle = myHp > opponentHp ? 'You Win' : myHp < opponentHp ? 'You Lose' : 'Draw';
  const endTone = myHp > opponentHp ? 'text-lime-200' : myHp < opponentHp ? 'text-rose-200' : 'text-cyan-100';

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl tracking-[0.08em] md:text-3xl">Battle Arena</h1>
          <p className="muted mt-1 text-sm">
            Opponent: {opponent.name} · Lv.{opponent.level}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge text={`Timer ${timerLabel}`} tone={timer <= 15 ? 'rose' : 'cyan'} />
          <Badge text={status === 'ended' ? 'Ended' : 'Live'} tone={status === 'ended' ? 'rose' : 'lime'} />
        </div>
      </div>

      <Card className="relative overflow-hidden p-3 md:p-5">
        <p className="font-semibold text-white/85">Topic</p>
        <p className="mt-1 text-sm text-[var(--color-neon-cyan)] md:text-base">{topic}</p>
      </Card>

      <Card className="relative overflow-hidden">
        <div ref={arenaRef} className="scanline relative rounded-2xl border border-white/12 p-3 md:p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <HealthBar value={myHp} max={MAX_HP} state="me" />
            <HealthBar value={opponentHp} max={MAX_HP} state="opponent" />
          </div>

          <div ref={scrollRef} className="mt-4 h-[42vh] space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 md:h-[46vh]">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-white/45">Battle started. Fire your first line.</p>
            ) : (
              messages.map((message) => <ChatMessage key={message.id} {...message} />)
            )}
          </div>

          <AnimatePresence>
            {damageBursts.map((burst) => (
              <motion.div
                key={burst.id}
                initial={{ opacity: 0, y: 8, scale: 0.82 }}
                animate={{ opacity: 1, y: -34, scale: 1 }}
                exit={{ opacity: 0, y: -56, scale: 1.05 }}
                transition={{ duration: reducedMotion ? 0.1 : 0.5 }}
                className={`pointer-events-none absolute z-[var(--z-overlay)] text-2xl font-black ${
                  burst.tone === 'toxic' ? 'text-rose-300' : burst.tone === 'good' ? 'text-lime-300' : 'text-cyan-200'
                } ${burst.target === 'me' ? 'left-12 top-28' : 'right-12 top-28'}`}
              >
                -{burst.value}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <form onSubmit={handleSend} className="mt-4 flex flex-col gap-2 md:flex-row">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={280}
            disabled={status !== 'active'}
            placeholder={status === 'active' ? 'Type your sharpest line...' : 'Battle ended'}
          />
          <Button type="submit" disabled={status !== 'active' || !draft.trim()} className="md:w-auto">
            Strike
          </Button>
        </form>
      </Card>

      <Card className="grid gap-3 md:grid-cols-3">
        <Metric label="Messages" value={stats.messageCount} />
        <Metric label="Good Strikes" value={stats.goodStrikes} />
        <Metric label="Toxic Strikes" value={stats.toxicStrikes} />
      </Card>

      <Toast message={toast} visible={Boolean(toast)} />

      <AnimatePresence>
        {showEndModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center bg-black/65 px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: reducedMotion ? 0.1 : 0.22 }}
              className="panel w-full max-w-md p-6"
            >
              <h2 className={`font-[var(--font-display)] text-3xl tracking-[0.08em] ${endTone}`}>{endTitle}</h2>
              <p className="mt-2 text-sm text-white/70">Round complete. Continue with records or return to homepage.</p>

              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    resetCurrent();
                    navigate('/');
                  }}
                >
                  Back Homepage
                </Button>
                <Button onClick={() => navigate('/result/demo')}>Records</Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/12 bg-black/25 p-3">
      <div className="text-xs uppercase tracking-[0.1em] text-white/55">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
