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
  ts: number;
}

export interface ServerToClientEvents {
  waiting: () => void;
  'battle-start': (payload: { battleId: string; topic: string }) => void;
  'battle-message': (payload: BattleMessage) => void;
  'battle-end': (payload: { winnerId: string; reason: string }) => void;
  'rate-limited': (payload: { retryAfterMs: number }) => void;
}

export interface ClientToServerEvents {
  'join-queue': () => void;
  'send-message': (payload: { battleId: string; text: string }) => void;
}
