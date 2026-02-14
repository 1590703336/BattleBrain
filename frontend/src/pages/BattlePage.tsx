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
import { useStrikeAnimation } from '../hooks/useStrikeAnimation';
import { useBattleStore } from '../stores/battleStore';
import { BattleMessage, StrikeType } from '../types/socket';
import { DEMO_OPPONENT, DEMO_TOPIC, MAX_HP } from '../utils/constants';

interface DamageBurst {
  id: string;
  value: number;
  target: 'me' | 'opponent';
  tone: 'good' | 'toxic';
}

const goodReplies = [
  'That line hit harder than your Wi-Fi outage apology.',
  'Respect. You roasted with precision and zero crumbs.',
  'I felt that one in my notification bar.',
];

const toxicReplies = [
  'Bold words for someone using default ringtone energy.',
  'That was chaos, but not the good kind.',
  'You swung, but the joke forgot to show up.',
];

function randomScore(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickStrike() {
  const r = Math.random();
  if (r > 0.65) {
    return 'good' as const;
  }
  if (r < 0.2) {
    return 'toxic' as const;
  }
  return 'neutral' as const;
}

function calcDamage(strike: StrikeType) {
  if (strike === 'good') {
    return randomScore(11, 18);
  }
  if (strike === 'toxic') {
    return randomScore(8, 14);
  }
  return randomScore(3, 8);
}

export default function BattlePage() {
  const { id = 'demo' } = useParams();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotionPreference();

  const {
    topic,
    myHp,
    opponentHp,
    messages,
    timer,
    startBattle,
    addMessage,
    applyDamage,
    tick,
    stats,
    saveCurrentResult,
  } = useBattleStore(
    useShallow((state) => ({
      topic: state.topic,
      myHp: state.myHp,
      opponentHp: state.opponentHp,
      messages: state.messages,
      timer: state.timer,
      startBattle: state.startBattle,
      addMessage: state.addMessage,
      applyDamage: state.applyDamage,
      tick: state.tick,
      stats: state.stats,
      saveCurrentResult: state.saveCurrentResult,
    }))
  );

  const [draft, setDraft] = useState('');
  const [damageBursts, setDamageBursts] = useState<DamageBurst[]>([]);
  const [toast, setToast] = useState('');
  const [lastSentAt, setLastSentAt] = useState(0);
  const [endFlowStarted, setEndFlowStarted] = useState(false);
  const [roundReady, setRoundReady] = useState(false);

  const arenaRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { triggerStrike } = useStrikeAnimation(arenaRef, reducedMotion);

  useEffect(() => {
    setRoundReady(false);
    startBattle(id, DEMO_TOPIC);
    setEndFlowStarted(false);
    const raf = requestAnimationFrame(() => setRoundReady(true));
    return () => cancelAnimationFrame(raf);
  }, [id, startBattle]);

  const battleEnded = myHp === 0 || opponentHp === 0 || timer === 0;

  useEffect(() => {
    if (!roundReady) {
      return;
    }

    if (battleEnded) {
      if (endFlowStarted) {
        return;
      }
      setEndFlowStarted(true);
      saveCurrentResult({
        battleId: id,
        topic,
        myHp,
        opponentHp,
        stats,
      });
      return;
    }

    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [battleEnded, endFlowStarted, tick, saveCurrentResult, roundReady, id, topic, myHp, opponentHp, stats]);

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
    const timeout = setTimeout(() => setToast(''), 1400);
    return () => clearTimeout(timeout);
  }, [toast]);

  const timerLabel = useMemo(() => {
    const min = Math.floor(timer / 60);
    const sec = timer % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }, [timer]);

  const spawnBurst = (value: number, target: 'me' | 'opponent', tone: 'good' | 'toxic') => {
    const burst = { id: crypto.randomUUID(), value, target, tone };
    setDamageBursts((current) => [...current, burst]);
    setTimeout(() => setDamageBursts((current) => current.filter((item) => item.id !== burst.id)), reducedMotion ? 120 : 680);
  };

  const pushMessage = (role: 'me' | 'opponent', text: string, strikeType: StrikeType) => {
    const payload: BattleMessage = {
      id: crypto.randomUUID(),
      role,
      text,
      strikeType,
      scores: {
        wit: randomScore(41, 98),
        relevance: randomScore(38, 96),
        toxicity: randomScore(8, 72),
      },
      ts: Date.now(),
    };

    addMessage(payload);
    return payload;
  };

  const resolveHit = (sourceRole: 'me' | 'opponent', strike: StrikeType) => {
    const damage = calcDamage(strike);

    if (sourceRole === 'me') {
      applyDamage('opponent', damage, strike);
      spawnBurst(damage, 'opponent', strike === 'toxic' ? 'toxic' : 'good');
      triggerStrike(strike === 'toxic' ? 'toxic' : 'good');
    } else {
      applyDamage('me', damage, strike);
      spawnBurst(damage, 'me', strike === 'toxic' ? 'toxic' : 'good');
      triggerStrike(strike === 'toxic' ? 'toxic' : 'good');
    }
  };

  const handleSend = (e: FormEvent) => {
    e.preventDefault();

    if (!draft.trim() || battleEnded) {
      return;
    }

    if (Date.now() - lastSentAt < 1200) {
      setToast('Cooldown active: keep your roast concise.');
      return;
    }

    setLastSentAt(Date.now());
    const myStrike = pickStrike();
    pushMessage('me', draft.trim(), myStrike);
    resolveHit('me', myStrike);
    setDraft('');

    const replyDelay = reducedMotion ? 80 : 520;
    setTimeout(() => {
      const enemyStrike = pickStrike();
      const reply = enemyStrike === 'toxic' ? toxicReplies[randomScore(0, toxicReplies.length - 1)] : goodReplies[randomScore(0, goodReplies.length - 1)];
      pushMessage('opponent', reply, enemyStrike);
      resolveHit('opponent', enemyStrike);
    }, replyDelay);
  };

  const runStressTest = () => {
    if (battleEnded) {
      return;
    }

    for (let idx = 0; idx < 10; idx += 1) {
      setTimeout(() => {
        const strike = idx % 3 === 0 ? 'toxic' : 'good';
        pushMessage('opponent', `Stress hit #${idx + 1} landed.`, strike);
        resolveHit('opponent', strike);
      }, idx * (reducedMotion ? 20 : 140));
    }
  };

  const endTitle = myHp > opponentHp ? 'You Win' : myHp < opponentHp ? 'You Lose' : 'Draw';
  const endTone = myHp > opponentHp ? 'text-lime-200' : myHp < opponentHp ? 'text-rose-200' : 'text-cyan-100';
  const showEndModal = battleEnded && endFlowStarted;

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl tracking-[0.08em] md:text-3xl">Battle Arena</h1>
          <p className="muted mt-1 text-sm">Opponent: {DEMO_OPPONENT.name} · Lv.{DEMO_OPPONENT.level}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge text={`Timer ${timerLabel}`} tone={timer <= 15 ? 'rose' : 'cyan'} />
          <Badge text={battleEnded ? 'Battle Ended' : 'Live'} tone={battleEnded ? 'rose' : 'lime'} />
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
              <p className="text-center text-sm text-white/45">Send your first message to start damage exchange.</p>
            ) : (
              messages.map((message) => <ChatMessage key={message.id} {...message} />)
            )}
          </div>

          <AnimatePresence>
            {damageBursts.map((burst) => (
              <motion.div
                key={burst.id}
                initial={{ opacity: 0, y: 8, scale: 0.8 }}
                animate={{ opacity: 1, y: -34, scale: 1 }}
                exit={{ opacity: 0, y: -52, scale: 1.03 }}
                transition={{ duration: reducedMotion ? 0.1 : 0.5 }}
                className={`pointer-events-none absolute z-[var(--z-overlay)] text-2xl font-black ${
                  burst.tone === 'good' ? 'text-lime-300' : 'text-rose-300'
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
            disabled={battleEnded}
            placeholder="Type your sharpest line..."
          />
          <div className="flex gap-2 md:w-auto">
            <Button type="submit" disabled={battleEnded || !draft.trim()} className="flex-1 md:flex-none">
              Strike
            </Button>
            <Button type="button" variant="ghost" onClick={runStressTest} className="flex-1 md:flex-none">
              10x Stress
            </Button>
          </div>
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
            className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center bg-black/60 px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: reducedMotion ? 0.1 : 0.22 }}
              className="panel w-full max-w-md p-5 md:p-6"
            >
              <h2 className={`font-[var(--font-display)] text-3xl tracking-[0.08em] ${endTone}`}>{endTitle}</h2>
              <p className="mt-2 text-sm text-white/70">Battle ended. Choose where to go next.</p>

              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button variant="ghost" onClick={() => navigate('/')}>
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
