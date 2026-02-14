import { create } from 'zustand';
import {
  BattleEndPayload,
  BattleMessage,
  BattleMessagePayload,
  BattleOpponent,
  BattleStartPayload,
  BattleStateSnapshot,
} from '../types/socket';
import { MAX_HP } from '../utils/constants';

export interface BattleStats {
  myDamage: number;
  opponentDamage: number;
  messageCount: number;
  goodStrikes: number;
  toxicStrikes: number;
}

export interface BattleHistoryItem {
  id: string;
  battleId: string;
  topic: string;
  winner: 'me' | 'opponent' | 'draw';
  stats: BattleStats;
  finishedAt: number;
  opponent: BattleOpponent;
}

type BattleStatus = 'idle' | 'queueing' | 'active' | 'ended';

interface BattleState {
  status: BattleStatus;
  battleId: string;
  topic: string;
  opponent: BattleOpponent;
  myRole: string;
  opponentRole: string;
  myHp: number;
  opponentHp: number;
  timer: number;
  messages: BattleMessage[];
  stats: BattleStats;
  history: BattleHistoryItem[];
  resultSaved: boolean;
  setQueueing: () => void;
  startBattle: (payload: BattleStartPayload) => void;
  setSnapshot: (snapshot: BattleStateSnapshot) => void;
  ingestMessage: (payload: BattleMessagePayload) => void;
  endBattle: (payload: BattleEndPayload) => void;
  saveCurrentResult: (payload?: { winner?: 'me' | 'opponent' | 'draw' }) => void;
  resetCurrent: () => void;
}

const defaultOpponent: BattleOpponent = {
  id: 'bot-0',
  name: 'Unknown',
  level: 1,
};

const initialStats = (): BattleStats => ({
  myDamage: 0,
  opponentDamage: 0,
  messageCount: 0,
  goodStrikes: 0,
  toxicStrikes: 0,
});

const baseState = () => ({
  status: 'idle' as BattleStatus,
  battleId: '',
  topic: 'Hot takes are loading...',
  opponent: defaultOpponent,
  myRole: '',
  opponentRole: '',
  myHp: MAX_HP,
  opponentHp: MAX_HP,
  timer: 90,
  messages: [] as BattleMessage[],
  stats: initialStats(),
  resultSaved: false,
});

export const useBattleStore = create<BattleState>((set) => ({
  ...baseState(),
  history: [],
  setQueueing: () =>
    set((state) => ({
      ...state,
      ...baseState(),
      status: 'queueing',
      history: state.history,
    })),
  startBattle: (payload) =>
    set((state) => ({
      ...state,
      status: 'active',
      battleId: payload.battleId,
      topic: payload.topic,
      opponent: payload.opponent,
      myRole: payload.myRole || '',
      opponentRole: payload.opponentRole || '',
      myHp: MAX_HP,
      opponentHp: MAX_HP,
      timer: payload.durationSec,
      messages: [],
      stats: initialStats(),
      resultSaved: false,
    })),
  setSnapshot: (snapshot) =>
    set((state) => ({
      ...state,
      myHp: snapshot.myHp,
      opponentHp: snapshot.opponentHp,
      timer: snapshot.timer,
    })),
  ingestMessage: (payload) =>
    set((state) => {
      const message = payload.message;
      const nextStats = { ...state.stats };

      if (message.role !== 'system') {
        nextStats.messageCount += 1;
      }

      if (message.strikeType === 'good') {
        nextStats.goodStrikes += 1;
      }

      if (message.strikeType === 'toxic') {
        nextStats.toxicStrikes += 1;
      }

      if (message.damageTarget === 'me') {
        nextStats.opponentDamage += message.damage;
      }

      if (message.damageTarget === 'opponent') {
        nextStats.myDamage += message.damage;
      }

      return {
        ...state,
        messages: [...state.messages, message],
        stats: nextStats,
        myHp: payload.snapshot.myHp,
        opponentHp: payload.snapshot.opponentHp,
        timer: payload.snapshot.timer,
      };
    }),
  endBattle: (payload) =>
    set((state) => ({
      ...state,
      status: 'ended',
      myHp: payload.finalState.myHp,
      opponentHp: payload.finalState.opponentHp,
      timer: payload.finalState.timer,
    })),
  saveCurrentResult: (payload) =>
    set((state) => {
      if (state.resultSaved || !state.battleId) {
        return state;
      }

      const winner =
        payload?.winner ??
        (state.myHp > state.opponentHp ? 'me' : state.myHp < state.opponentHp ? 'opponent' : 'draw');

      const record: BattleHistoryItem = {
        id: crypto.randomUUID(),
        battleId: state.battleId,
        topic: state.topic,
        winner,
        stats: { ...state.stats },
        finishedAt: Date.now(),
        opponent: state.opponent,
      };

      return {
        ...state,
        history: [record, ...state.history].slice(0, 20),
        resultSaved: true,
      };
    }),
  resetCurrent: () =>
    set((state) => ({
      ...state,
      ...baseState(),
      history: state.history,
    })),
}));
