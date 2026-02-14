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

export interface MatchCandidate {
  id: string;
  name: string;
  displayName: string;
  level: number;
  avatarUrl: string;
  bio: string;
  humorStyle: string;
  isAi: boolean;
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

export interface BattleRequestPayload {
  requestId: string;
  from: {
    id: string;
    name: string;
    displayName: string;
    level: number;
    avatarUrl: string;
  };
  topic: string;
  expiresInSec?: number;
}

export interface BattleRequestTimeoutPayload {
  requestId?: string;
  targetId?: string;
  reason: 'offline' | 'timeout' | string;
}

export interface ServerToClientEvents {
  waiting: (payload: QueueWaitingPayload) => void;
  'online-users': (payload: MatchCandidate[]) => void;
  'battle-request': (payload: BattleRequestPayload) => void;
  'battle-request-timeout': (payload: BattleRequestTimeoutPayload) => void;
  'battle-request-declined': (payload: { requestId: string; by: string }) => void;
  'battle-start': (payload: BattleStartPayload) => void;
  'battle-message': (payload: BattleMessagePayload) => void;
  'battle-end': (payload: BattleEndPayload) => void;
  'rate-limited': (payload: { retryAfterMs: number; reason?: string }) => void;
}

export interface ClientToServerEvents {
  'join-queue': (payload: { mode: 'quick' }) => void;
  'leave-queue': (payload: {}) => void;
  'get-cards': (payload?: {}) => void;
  'swipe-right': (payload: { targetId: string }) => void;
  'swipe-left': (payload: { targetId: string }) => void;
  'accept-battle': (payload: { requestId: string }) => void;
  'decline-battle': (payload: { requestId: string }) => void;
  'send-message': (payload: { battleId: string; text: string }) => void;
  'go-online': (payload?: {}) => void;
  'go-offline': (payload?: {}) => void;
  heartbeat: (payload?: {}) => void;
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
