import { create } from 'zustand';
import { BattleMessage } from '../types/socket';
import { MAX_HP } from '../utils/constants';

interface BattleStats {
  myDamage: number;
  opponentDamage: number;
  messageCount: number;
  goodStrikes: number;
  toxicStrikes: number;
}

interface BattleState {
  battleId: string;
  topic: string;
  myHp: number;
  opponentHp: number;
  messages: BattleMessage[];
  timer: number;
  stats: BattleStats;
  setBattleMeta: (battleId: string, topic: string) => void;
  addMessage: (message: BattleMessage) => void;
  applyDamage: (target: 'me' | 'opponent', amount: number, strikeType: BattleMessage['strikeType']) => void;
  tick: () => void;
  reset: () => void;
}

const initialStats = (): BattleStats => ({
  myDamage: 0,
  opponentDamage: 0,
  messageCount: 0,
  goodStrikes: 0,
  toxicStrikes: 0,
});

export const useBattleStore = create<BattleState>((set) => ({
  battleId: 'demo',
  topic: 'Hot takes are loading...',
  myHp: MAX_HP,
  opponentHp: MAX_HP,
  messages: [],
  timer: 90,
  stats: initialStats(),
  setBattleMeta: (battleId, topic) => set({ battleId, topic }),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      stats: {
        ...state.stats,
        messageCount: state.stats.messageCount + 1,
      },
    })),
  applyDamage: (target, amount, strikeType) =>
    set((state) => {
      const next = {
        myHp: state.myHp,
        opponentHp: state.opponentHp,
        stats: { ...state.stats },
      };

      if (target === 'me') {
        next.myHp = Math.max(0, state.myHp - amount);
        next.stats.opponentDamage += amount;
      } else {
        next.opponentHp = Math.max(0, state.opponentHp - amount);
        next.stats.myDamage += amount;
      }

      if (strikeType === 'good') {
        next.stats.goodStrikes += 1;
      }

      if (strikeType === 'toxic') {
        next.stats.toxicStrikes += 1;
      }

      return next;
    }),
  tick: () => set((state) => ({ timer: Math.max(0, state.timer - 1) })),
  reset: () =>
    set({
      battleId: 'demo',
      topic: 'Hot takes are loading...',
      myHp: MAX_HP,
      opponentHp: MAX_HP,
      messages: [],
      timer: 90,
      stats: initialStats(),
    }),
}));
