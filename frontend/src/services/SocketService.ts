import { io, Socket } from 'socket.io-client';
import {
  BattleEndPayload,
  BattleMessage,
  BattleStartPayload,
  BattleStateSnapshot,
  ClientToServerEvents,
  ServerToClientEvents,
  StrikeType,
} from '../types/socket';

const USE_MOCK_SOCKET = import.meta.env.VITE_USE_MOCK_SOCKET !== 'false';

type ServerEventName = keyof ServerToClientEvents;
type Listener<K extends ServerEventName> = Parameters<ServerToClientEvents[K]>[0] extends never
  ? () => void
  : (payload: Parameters<ServerToClientEvents[K]>[0]) => void;

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

  private mockGateway: MockBattleGateway | null = null;

  private listeners: { [K in ServerEventName]?: Set<Listener<K>> } = {};

  private connected = false;

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
    });

    this.bindRealSocket();
    this.connected = true;
  }

  disconnect() {
    this.connected = false;
    this.socket?.disconnect();
    this.socket = null;
    this.mockGateway?.dispose();
    this.mockGateway = null;
  }

  on<K extends ServerEventName>(event: K, handler: Listener<K>) {
    const current = this.listeners[event] ?? new Set<Listener<K>>();
    current.add(handler);
    this.listeners[event] = current;
  }

  off<K extends ServerEventName>(event: K, handler: Listener<K>) {
    this.listeners[event]?.delete(handler);
  }

  emit<K extends keyof ClientToServerEvents>(event: K, payload: Parameters<ClientToServerEvents[K]>[0]) {
    if (USE_MOCK_SOCKET) {
      this.mockGateway?.handleClientEvent(event, payload);
      return;
    }

    (this.socket as unknown as { emit: (name: string, input: unknown) => void } | null)?.emit(event, payload);
  }

  private bindRealSocket() {
    if (!this.socket) {
      return;
    }

    this.socket.on('waiting', (payload) => this.dispatch('waiting', payload));
    this.socket.on('battle-start', (payload) => this.dispatch('battle-start', payload));
    this.socket.on('battle-message', (payload) => this.dispatch('battle-message', payload));
    this.socket.on('battle-tick', (payload) => this.dispatch('battle-tick', payload));
    this.socket.on('battle-end', (payload) => this.dispatch('battle-end', payload));
    this.socket.on('rate-limited', (payload) => this.dispatch('rate-limited', payload));
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

  private battle: {
    battleId: string;
    topic: string;
    myHp: number;
    opponentHp: number;
    timer: number;
    cooldownUntil: number;
    finished: boolean;
  } | null = null;

  private readonly topics = [
    'If your ex texted at 2AM, what is your opening line?',
    'One sentence that instantly ruins a group chat vibe.',
    'Pitch your worst startup idea with confidence.',
  ];

  private readonly opponent = {
    id: 'bot-halo-12',
    name: 'HaloHex',
    level: 14,
  };

  constructor(
    private readonly emitServerEvent: <K extends ServerEventName>(
      event: K,
      payload: Parameters<ServerToClientEvents[K]>[0]
    ) => void
  ) {}

  handleClientEvent<K extends keyof ClientToServerEvents>(
    event: K,
    payload: Parameters<ClientToServerEvents[K]>[0]
  ) {
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
    }
  }

  dispose() {
    this.clearQueueTimer();
    this.clearTickTimer();
  }

  private handleJoinQueue() {
    this.clearQueueTimer();
    this.emitServerEvent('waiting', {
      queueId: `q_${crypto.randomUUID().slice(0, 8)}`,
      position: 1,
      etaSec: 2,
    });

    this.queueTimer = window.setTimeout(() => {
      const battleId = `b_${crypto.randomUUID().slice(0, 8)}`;
      const payload: BattleStartPayload = {
        battleId,
        topic: this.topics[Math.floor(Math.random() * this.topics.length)],
        opponent: this.opponent,
        durationSec: 90,
      };

      this.battle = {
        battleId,
        topic: payload.topic,
        myHp: 100,
        opponentHp: 100,
        timer: 90,
        cooldownUntil: 0,
        finished: false,
      };

      this.emitServerEvent('battle-start', payload);
      this.startTicking();
    }, 1800);
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

    window.setTimeout(() => {
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
    }, 520);
  }

  private startTicking() {
    this.clearTickTimer();

    this.tickTimer = window.setInterval(() => {
      if (!this.battle || this.battle.finished) {
        return;
      }

      this.battle.timer = Math.max(0, this.battle.timer - 1);
      this.emitServerEvent('battle-tick', this.snapshot());

      if (this.battle.timer === 0) {
        this.checkEnd('timeout');
      }
    }, 1000);
  }

  private buildMessage(role: BattleMessage['role'], text: string): BattleMessage {
    const strike = this.pickStrike();
    const damage = this.damageByStrike(strike);

    return {
      id: crypto.randomUUID(),
      role,
      text,
      strikeType: strike,
      damage,
      damageTarget: role === 'me' ? 'opponent' : 'me',
      scores: {
        wit: this.rand(45, 98),
        relevance: this.rand(40, 95),
        toxicity: this.rand(8, 80),
      },
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

  private pickStrike(): StrikeType {
    const n = Math.random();
    if (n > 0.68) {
      return 'good';
    }
    if (n < 0.2) {
      return 'toxic';
    }
    return 'neutral';
  }

  private damageByStrike(strike: StrikeType) {
    if (strike === 'good') {
      return this.rand(10, 18);
    }
    if (strike === 'toxic') {
      return this.rand(8, 14);
    }
    return this.rand(3, 8);
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
