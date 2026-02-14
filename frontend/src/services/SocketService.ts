import { io, Socket } from 'socket.io-client';
import {
  BattleEndPayload,
  BattleMessage,
  BattleMessagePayload,
  BattleStartPayload,
  BattleStateSnapshot,
  ClientToServerEvents,
  MatchCandidate,
  ServerToClientEvents,
  StrikeType,
} from '../types/socket';
import { getStoredToken, getStoredUser } from '../utils/authStorage';

const USE_MOCK_SOCKET = import.meta.env.VITE_USE_MOCK_SOCKET !== 'false';
const GOOD_STRIKE_THRESHOLD = 40;
const TOXIC_STRIKE_THRESHOLD = 60;

type ServerEventName = keyof ServerToClientEvents;
type Listener<K extends ServerEventName> = Parameters<ServerToClientEvents[K]>[0] extends never
  ? () => void
  : (payload: Parameters<ServerToClientEvents[K]>[0]) => void;

function normalizeStrikeType(input: unknown): StrikeType {
  const value = String(input || '').toLowerCase();
  if (value === 'good' || value === 'good-strike') {
    return 'good';
  }
  if (value === 'toxic') {
    return 'toxic';
  }
  return 'neutral';
}

function clampPercent(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(num)));
}

function normalizeTimerFromDuration(rawDuration: unknown): number {
  const num = Number(rawDuration);
  if (!Number.isFinite(num) || num <= 0) {
    return 180;
  }
  if (num > 1000) {
    return Math.max(1, Math.round(num / 1000));
  }
  return Math.max(1, Math.round(num));
}

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

  private mockGateway: MockBattleGateway | null = null;

  private listeners: { [K in ServerEventName]?: Set<Listener<K>> } = {};

  private connected = false;

  private heartbeatTimer: number | null = null;

  private activeBattleMeta:
    | {
      battleId: string;
      myId: string;
      durationSec: number;
      startedAt: number;
    }
    | null = null;

  connect() {
    if (this.connected) {
      return;
    }

    if (USE_MOCK_SOCKET) {
      this.mockGateway = new MockBattleGateway((event, payload) => this.dispatch(event, payload));
      this.connected = true;
      return;
    }

    this.socket = io(import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000', {
      autoConnect: true,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      auth: {
        token: getStoredToken(),
      },
    });

    this.bindRealSocket();
    this.connected = true;
  }

  disconnect() {
    this.connected = false;
    this.stopHeartbeat();
    this.socket?.disconnect();
    this.socket = null;
    this.mockGateway?.dispose();
    this.mockGateway = null;
    this.activeBattleMeta = null;
  }

  on<K extends ServerEventName>(event: K, handler: Listener<K>) {
    const current = this.listeners[event] ?? new Set<Listener<K>>();
    current.add(handler);
    this.listeners[event] = current;
  }

  off<K extends ServerEventName>(event: K, handler: Listener<K>) {
    this.listeners[event]?.delete(handler);
  }

  emit<K extends keyof ClientToServerEvents>(event: K, payload?: Parameters<ClientToServerEvents[K]>[0]) {
    if (USE_MOCK_SOCKET) {
      this.mockGateway?.handleClientEvent(event, payload as Parameters<ClientToServerEvents[K]>[0]);
      return;
    }

    (this.socket as unknown as { emit: (name: string, input?: unknown) => void } | null)?.emit(event, payload ?? {});
  }

  private bindRealSocket() {
    if (!this.socket) {
      return;
    }

    this.socket.on('connect', () => {
      this.startHeartbeat();
      this.socket?.emit('heartbeat', {});
    });

    this.socket.on('disconnect', () => {
      this.stopHeartbeat();
    });

    this.socket.on('waiting', (payload) => this.dispatch('waiting', payload));
    this.socket.on('online-users', (payload) => this.dispatch('online-users', payload));
    this.socket.on('battle-request', (payload) => this.dispatch('battle-request', payload));
    this.socket.on('battle-request-timeout', (payload) => this.dispatch('battle-request-timeout', payload));
    this.socket.on('battle-request-declined', (payload) => this.dispatch('battle-request-declined', payload));
    this.socket.on('battle-start', (payload) => this.dispatch('battle-start', this.normalizeBattleStart(payload)));
    this.socket.on('battle-message', (payload) => this.dispatch('battle-message', this.normalizeBattleMessage(payload)));
    this.socket.on('battle-end', (payload) => this.dispatch('battle-end', this.normalizeBattleEnd(payload)));
    this.socket.on('rate-limited', (payload) => this.dispatch('rate-limited', this.normalizeRateLimited(payload)));
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.socket?.emit('heartbeat', {});
    }, 30_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private getCurrentUserId() {
    return getStoredUser()?.id || '';
  }

  private estimateTimer() {
    if (!this.activeBattleMeta) {
      return 0;
    }

    const elapsedSec = Math.max(0, Math.floor((Date.now() - this.activeBattleMeta.startedAt) / 1000));
    return Math.max(0, this.activeBattleMeta.durationSec - elapsedSec);
  }

  private normalizeBattleStart(payload: unknown): BattleStartPayload {
    const raw = (payload || {}) as Record<string, unknown>;
    const battleId = String(raw.battleId || raw.id || '');
    const myId = this.getCurrentUserId();

    let opponent = {
      id: '',
      name: 'Unknown',
      level: 1,
    };

    if (raw.opponent && typeof raw.opponent === 'object') {
      const source = raw.opponent as Record<string, unknown>;
      opponent = {
        id: String(source.id || ''),
        name: String(source.name || source.displayName || 'Unknown'),
        level: Math.max(1, Number(source.level || 1)),
      };
    } else if (raw.players && typeof raw.players === 'object') {
      const players = raw.players as Record<string, { user?: Record<string, unknown>; role?: string }>;
      const ids = Object.keys(players);
      const opponentId = ids.find((id) => id !== myId) || ids[0] || '';
      const opponentUser = players[opponentId]?.user || {};
      opponent = {
        id: opponentId,
        name: String(opponentUser.displayName || opponentUser.name || 'Unknown'),
        level: Math.max(1, Number(opponentUser.level || 1)),
      };
    }

    const durationSec = Number.isFinite(Number(raw.durationSec))
      ? Math.max(1, Math.round(Number(raw.durationSec)))
      : normalizeTimerFromDuration(raw.duration);

    this.activeBattleMeta = {
      battleId,
      myId,
      durationSec,
      startedAt: Number(raw.startTime) > 0 ? Number(raw.startTime) : Date.now(),
    };

    let myRole = '';
    let opponentRole = '';
    if (raw.players && typeof raw.players === 'object') {
      const p = raw.players as Record<string, { role?: string }>;
      myRole = String(p[myId]?.role || '');
      opponentRole = String(p[opponent.id]?.role || '');
    }

    return {
      battleId,
      topic: String(raw.topic || 'Unknown Topic'),
      opponent,
      durationSec,
      myRole,
      opponentRole,
    };
  }

  private normalizeBattleMessage(payload: unknown): BattleMessagePayload {
    const raw = (payload || {}) as Record<string, unknown>;

    if (raw.message && typeof raw.message === 'object' && raw.snapshot && typeof raw.snapshot === 'object') {
      return raw as unknown as BattleMessagePayload;
    }

    const senderId = String(raw.senderId || '');
    const myId = this.activeBattleMeta?.myId || this.getCurrentUserId();
    const role: BattleMessage['role'] = senderId ? (senderId === myId ? 'me' : 'opponent') : 'system';

    const analysis = (raw.analysis || {}) as Record<string, unknown>;
    const strikeType = normalizeStrikeType(analysis.strikeType);
    const damage = Math.max(0, Math.round(Number(analysis.damage || 0)));

    let damageTarget: BattleMessage['damageTarget'] = null;
    if (analysis.damageTarget === 'me' || analysis.damageTarget === 'opponent') {
      damageTarget = analysis.damageTarget;
    } else if (strikeType === 'toxic') {
      damageTarget = role === 'me' ? 'me' : 'opponent';
    } else if (strikeType === 'good') {
      damageTarget = role === 'me' ? 'opponent' : 'me';
    }

    const state = (raw.state || {}) as Record<string, { hp?: number }>;
    const opponentId = Object.keys(state).find((id) => id !== myId) || '';
    const snapshot: BattleStateSnapshot = {
      myHp: Math.max(0, Math.round(Number(state[myId]?.hp ?? 100))),
      opponentHp: Math.max(0, Math.round(Number(state[opponentId]?.hp ?? 100))),
      timer: this.estimateTimer(),
    };

    const message: BattleMessage = {
      id: crypto.randomUUID(),
      role,
      text: String(raw.message || ''),
      strikeType,
      scores: {
        wit: clampPercent(analysis.wit),
        relevance: clampPercent(analysis.relevance),
        toxicity: clampPercent(analysis.toxicity),
      },
      damage,
      damageTarget,
      ts: Date.now(),
    };

    return { message, snapshot };
  }

  private normalizeBattleEnd(payload: unknown): BattleEndPayload {
    const raw = (payload || {}) as Record<string, unknown>;

    if (raw.finalState && typeof raw.finalState === 'object' && typeof raw.winner === 'string') {
      this.activeBattleMeta = null;
      return raw as unknown as BattleEndPayload;
    }

    const myId = this.activeBattleMeta?.myId || this.getCurrentUserId();
    const winnerRaw = String(raw.winner || raw.winnerId || '');
    const winner =
      winnerRaw === 'draw' || !winnerRaw
        ? 'draw'
        : winnerRaw === 'me' || winnerRaw === myId
          ? 'me'
          : winnerRaw === 'opponent'
            ? 'opponent'
            : 'opponent';

    const finalState = (raw.legacyFinalState || raw.finalState || {}) as Record<
      string,
      { hp?: number; messagesCount?: number }
    >;
    const opponentId = Object.keys(finalState).find((id) => id !== myId) || '';

    const normalized: BattleEndPayload = {
      battleId: String(raw.battleId || this.activeBattleMeta?.battleId || ''),
      winner,
      reason:
        raw.reason === 'timeout' || raw.reason === 'surrender' || raw.reason === 'hp-zero'
          ? raw.reason
          : raw.reason === 'forfeit'
            ? 'surrender'
            : 'hp-zero',
      finalState: {
        myHp: Math.max(0, Math.round(Number(finalState[myId]?.hp ?? 0))),
        opponentHp: Math.max(0, Math.round(Number(finalState[opponentId]?.hp ?? 0))),
        timer: 0,
      },
    };

    this.activeBattleMeta = null;
    return normalized;
  }

  private normalizeRateLimited(payload: unknown) {
    const raw = (payload || {}) as Record<string, unknown>;
    const retryAfterMs = Math.max(
      0,
      Math.round(Number(raw.retryAfterMs || raw.cooldownRemaining || 0))
    );

    return {
      retryAfterMs: retryAfterMs || 3000,
      reason: typeof raw.reason === 'string' ? raw.reason : undefined,
    };
  }

  private dispatch<K extends ServerEventName>(event: K, payload: Parameters<ServerToClientEvents[K]>[0]) {
    this.listeners[event]?.forEach((listener) => {
      (listener as (input: Parameters<ServerToClientEvents[K]>[0]) => void)(payload);
    });
  }
}

class MockBattleGateway {
  private queueTimer: number | null = null;

  private tickTimer: number | null = null;

  private cards: MatchCandidate[] = [
    {
      id: 'ai_hypernova',
      name: 'HyperNova',
      displayName: 'HyperNova',
      level: 16,
      avatarUrl: '',
      bio: 'Specialty: ultra-dry callbacks and fake-corporate roast format.',
      humorStyle: 'Savage Irony',
      isAi: true,
    },
    {
      id: 'ai_pixelruin',
      name: 'PixelRuin',
      displayName: 'PixelRuin',
      level: 12,
      avatarUrl: '',
      bio: 'Chains puns with escalating absurdity. High variance, high danger.',
      humorStyle: 'Pun Burst',
      isAi: true,
    },
    {
      id: 'ai_laughshard',
      name: 'LaughShard',
      displayName: 'LaughShard',
      level: 18,
      avatarUrl: '',
      bio: 'Pretends calm. Then drops one-line devastation every 12 seconds.',
      humorStyle: 'Deadpan Chaos',
      isAi: true,
    },
    {
      id: 'ai_jokevector',
      name: 'JokeVector',
      displayName: 'JokeVector',
      level: 14,
      avatarUrl: '',
      bio: 'Meta meme references with precise timing and minimal mercy.',
      humorStyle: 'Meme Sniper',
      isAi: true,
    },
    {
      id: 'ai_quipforge',
      name: 'QuipForge',
      displayName: 'QuipForge',
      level: 15,
      avatarUrl: '',
      bio: 'Turns simple prompts into layered sarcasm and comeback pressure.',
      humorStyle: 'Sarcasm Press',
      isAi: true,
    },
  ];

  private battle: {
    battleId: string;
    topic: string;
    myHp: number;
    opponentHp: number;
    timer: number;
    cooldownUntil: number;
    finished: boolean;
    opponent: {
      id: string;
      name: string;
      level: number;
    };
  } | null = null;

  private readonly topics = [
    {
      topic: 'Pineapple belongs on pizza',
      roles: ['Pineapple BELONGS on pizza', 'It violates Italian tradition'],
    },
    {
      topic: 'Cats are better pets than dogs',
      roles: ['Cats are cleaner & smarter', 'Dogs are loyal & fun'],
    },
    {
      topic: 'A hot dog is a sandwich',
      roles: ['It IS a sandwich', 'It is NOT a sandwich'],
    },
    {
      topic: 'Summer is the best season',
      roles: ['Summer is freedom & sun', 'Winter is cozy & cool'],
    },
    {
      topic: 'Video games should be an Olympic sport',
      roles: ['Yes, strategy is a sport', 'No, sports need athletics'],
    },
    {
      topic: 'Cereal is a soup',
      roles: ['Technically, it is soup', 'No, keep soup hot'],
    },
    {
      topic: 'Movies are always worse than the books',
      roles: ['Books have more depth', 'Movies do it better'],
    },
    {
      topic: 'Remote work is superior to office work',
      roles: ['Home is productive', 'Office culture matters'],
    },
    {
      topic: 'Social media does more harm than good',
      roles: ['It destroys mental health', 'It connects the world'],
    },
    {
      topic: 'Water is just boneless ice',
      roles: ['Yes, scientifically true', 'No, that makes no sense'],
    },
  ];

  constructor(
    private readonly emitServerEvent: <K extends ServerEventName>(
      event: K,
      payload: Parameters<ServerToClientEvents[K]>[0]
    ) => void
  ) { }

  handleClientEvent<K extends keyof ClientToServerEvents>(
    event: K,
    payload: Parameters<ClientToServerEvents[K]>[0]
  ) {
    if (event === 'get-cards') {
      this.emitServerEvent('online-users', [...this.cards]);
      return;
    }

    if (event === 'swipe-left') {
      const targetId = (payload as { targetId?: string } | undefined)?.targetId;
      if (targetId) {
        this.cards = this.cards.filter((card) => card.id !== targetId);
      }
      return;
    }

    if (event === 'swipe-right') {
      const targetId = (payload as { targetId?: string } | undefined)?.targetId;
      this.handleSwipeRight(targetId || '');
      return;
    }

    if (event === 'join-queue') {
      this.handleJoinQueue();
      return;
    }

    if (event === 'leave-queue') {
      this.clearQueueTimer();
      return;
    }

    if (event === 'send-message') {
      this.handleSendMessage(payload as Parameters<ClientToServerEvents['send-message']>[0]);
      return;
    }

    if (event === 'surrender-battle') {
      const battleId = (payload as { battleId?: string } | undefined)?.battleId;
      if (!this.battle || this.battle.finished || !battleId || battleId !== this.battle.battleId) {
        return;
      }
      this.battle.finished = true;
      this.clearTickTimer();
      this.emitServerEvent('battle-end', {
        battleId: this.battle.battleId,
        winner: 'opponent',
        reason: 'surrender',
        finalState: this.snapshot(),
      });
    }
  }

  dispose() {
    this.clearQueueTimer();
    this.clearTickTimer();
  }

  private handleSwipeRight(targetId: string) {
    const card = this.cards.find((entry) => entry.id === targetId);
    if (!card) {
      this.emitServerEvent('battle-request-timeout', {
        targetId,
        reason: 'offline',
      });
      return;
    }

    this.emitServerEvent('waiting', {
      queueId: `q_${crypto.randomUUID().slice(0, 8)}`,
      position: 1,
      etaSec: 2,
    });

    this.queueTimer = window.setTimeout(() => {
      this.startBattleWithOpponent({
        id: card.id,
        name: card.name,
        level: card.level,
      });
      this.cards = this.cards.filter((entry) => entry.id !== card.id);
    }, 1800);
  }

  private handleJoinQueue() {
    this.clearQueueTimer();
    this.emitServerEvent('waiting', {
      queueId: `q_${crypto.randomUUID().slice(0, 8)}`,
      position: 1,
      etaSec: 2,
    });

    this.queueTimer = window.setTimeout(() => {
      this.startBattleWithOpponent({
        id: 'bot-halo-12',
        name: 'HaloHex',
        level: 14,
      });
    }, 1800);
  }

  private startBattleWithOpponent(opponent: { id: string; name: string; level: number }) {
    const battleId = `b_${crypto.randomUUID().slice(0, 8)}`;
    const selection = this.topics[Math.floor(Math.random() * this.topics.length)];

    const payload: BattleStartPayload = {
      battleId,
      topic: selection.topic,
      opponent,
      durationSec: 90,
      myRole: selection.roles[0],
      opponentRole: selection.roles[1],
    };

    this.battle = {
      battleId,
      topic: selection.topic,
      myHp: 100,
      opponentHp: 100,
      timer: 90,
      cooldownUntil: 0,
      finished: false,
      opponent,
    };

    this.emitServerEvent('battle-start', payload);
    this.startTicking();
  }

  private handleSendMessage(payload: Parameters<ClientToServerEvents['send-message']>[0]) {
    if (!this.battle || this.battle.finished || payload.battleId !== this.battle.battleId) {
      return;
    }

    if (Date.now() < this.battle.cooldownUntil) {
      this.emitServerEvent('rate-limited', {
        retryAfterMs: this.battle.cooldownUntil - Date.now(),
      });
      return;
    }

    this.battle.cooldownUntil = Date.now() + 1200;

    const mine = this.buildMessage('me', payload.text);
    this.applyMessage(mine);
    this.emitServerEvent('battle-message', {
      message: mine,
      snapshot: this.snapshot(),
    });

    if (this.checkEnd('hp-zero')) {
      return;
    }

    if (!this.battle || this.battle.finished) {
      return;
    }

    const enemyText = this.enemyReplies()[Math.floor(Math.random() * this.enemyReplies().length)];
    const enemy = this.buildMessage('opponent', enemyText);
    this.applyMessage(enemy);
    this.emitServerEvent('battle-message', {
      message: enemy,
      snapshot: this.snapshot(),
    });
    this.checkEnd('hp-zero');
  }

  private startTicking() {
    this.clearTickTimer();

    this.tickTimer = window.setInterval(() => {
      if (!this.battle || this.battle.finished) {
        return;
      }

      this.battle.timer = Math.max(0, this.battle.timer - 1);

      if (this.battle.timer === 0) {
        this.checkEnd('timeout');
      }
    }, 1000);
  }

  private buildMessage(role: BattleMessage['role'], text: string): BattleMessage {
    const scores = {
      wit: this.rand(35, 96),
      relevance: this.rand(32, 95),
      toxicity: this.rand(4, 88),
    };
    const strike = this.pickStrike(scores);
    const damage = this.damageByScores(strike, scores);
    const damageTarget = this.damageTargetByStrike(role, strike);

    return {
      id: crypto.randomUUID(),
      role,
      text,
      strikeType: strike,
      damage,
      damageTarget,
      scores,
      ts: Date.now(),
    };
  }

  private applyMessage(message: BattleMessage) {
    if (!this.battle || message.damageTarget === null) {
      return;
    }

    if (message.damageTarget === 'me') {
      this.battle.myHp = Math.max(0, this.battle.myHp - message.damage);
    }

    if (message.damageTarget === 'opponent') {
      this.battle.opponentHp = Math.max(0, this.battle.opponentHp - message.damage);
    }
  }

  private checkEnd(reason: BattleEndPayload['reason']) {
    if (!this.battle || this.battle.finished) {
      return true;
    }

    const ended = this.battle.myHp === 0 || this.battle.opponentHp === 0 || this.battle.timer === 0;
    if (!ended) {
      return false;
    }

    this.battle.finished = true;
    this.clearTickTimer();

    let winner: BattleEndPayload['winner'] = 'draw';
    if (this.battle.myHp > this.battle.opponentHp) {
      winner = 'me';
    }
    if (this.battle.myHp < this.battle.opponentHp) {
      winner = 'opponent';
    }

    this.emitServerEvent('battle-end', {
      battleId: this.battle.battleId,
      winner,
      reason,
      finalState: this.snapshot(),
    });

    return true;
  }

  private snapshot(): BattleStateSnapshot {
    if (!this.battle) {
      return {
        myHp: 100,
        opponentHp: 100,
        timer: 90,
      };
    }

    return {
      myHp: this.battle.myHp,
      opponentHp: this.battle.opponentHp,
      timer: this.battle.timer,
    };
  }

  private pickStrike(scores: BattleMessage['scores']): StrikeType {
    if (scores.toxicity >= TOXIC_STRIKE_THRESHOLD) {
      return 'toxic';
    }
    if (scores.wit >= GOOD_STRIKE_THRESHOLD && scores.relevance >= GOOD_STRIKE_THRESHOLD) {
      return 'good';
    }
    return 'neutral';
  }

  private damageByScores(strike: StrikeType, scores: BattleMessage['scores']) {
    if (strike === 'good') {
      return Math.round((scores.wit * 0.6 + scores.relevance * 0.4) * 0.35);
    }
    if (strike === 'toxic') {
      return Math.round(scores.toxicity * 0.2);
    }
    return 0;
  }

  private damageTargetByStrike(role: BattleMessage['role'], strike: StrikeType): BattleMessage['damageTarget'] {
    if (strike === 'neutral') {
      return null;
    }
    if (strike === 'toxic') {
      return role === 'me' ? 'me' : 'opponent';
    }
    return role === 'me' ? 'opponent' : 'me';
  }

  private rand(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private enemyReplies() {
    return [
      'Your roast had setup. Then the punchline filed for PTO.',
      'Clean hit. I am emotionally buffering.',
      'That attempt had passion and absolutely no brakes.',
      'Strong opener. Weak warranty.',
    ];
  }

  private clearQueueTimer() {
    if (this.queueTimer) {
      window.clearTimeout(this.queueTimer);
      this.queueTimer = null;
    }
  }

  private clearTickTimer() {
    if (this.tickTimer) {
      window.clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }
}

export default new SocketService();
