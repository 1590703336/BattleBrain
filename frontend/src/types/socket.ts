export type StrikeType = 'good' | 'toxic' | 'neutral';

export interface MessageScores {
  wit: number;
  relevance: number;
  toxicity: number;
}

export interface BattleMessage {
  id: string;
  role: 'me' | 'opponent' | 'system';
  text: string;
  strikeType: StrikeType;
  scores: MessageScores;
  damage: number;
  damageTarget: 'me' | 'opponent' | null;
  ts: number;
}

export interface QueueWaitingPayload {
  queueId: string;
  position: number;
  etaSec: number;
}

export interface BattleOpponent {
  id: string;
  name: string;
  level: number;
}

export interface BattleStateSnapshot {
  myHp: number;
  opponentHp: number;
  timer: number;
}

export interface BattleStartPayload {
  battleId: string;
  topic: string;
  opponent: BattleOpponent;
  durationSec: number;
}

export interface BattleMessagePayload {
  message: BattleMessage;
  snapshot: BattleStateSnapshot;
}

export interface BattleEndPayload {
  battleId: string;
  winner: 'me' | 'opponent' | 'draw';
  reason: 'hp-zero' | 'timeout' | 'surrender';
  finalState: BattleStateSnapshot;
}

export interface ServerToClientEvents {
  waiting: (payload: QueueWaitingPayload) => void;
  'battle-start': (payload: BattleStartPayload) => void;
  'battle-message': (payload: BattleMessagePayload) => void;
  'battle-tick': (payload: BattleStateSnapshot) => void;
  'battle-end': (payload: BattleEndPayload) => void;
  'rate-limited': (payload: { retryAfterMs: number }) => void;
}

export interface ClientToServerEvents {
  'join-queue': (payload: { mode: 'quick' }) => void;
  'leave-queue': (payload: {}) => void;
  'send-message': (payload: { battleId: string; text: string }) => void;
}

export interface BattleHistoryResponse {
  id: string;
  battleId: string;
  topic: string;
  winner: 'me' | 'opponent' | 'draw';
  stats: {
    myDamage: number;
    opponentDamage: number;
    messageCount: number;
    goodStrikes: number;
    toxicStrikes: number;
  };
  finishedAt: string;
  opponent: BattleOpponent;
}
