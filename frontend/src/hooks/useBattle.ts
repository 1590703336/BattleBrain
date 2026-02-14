import { useBattleStore } from '../stores/battleStore';
import { useShallow } from 'zustand/react/shallow';

export function useBattle() {
  return useBattleStore(
    useShallow((state) => ({
      battleId: state.battleId,
      topic: state.topic,
      myHp: state.myHp,
      opponentHp: state.opponentHp,
      messages: state.messages,
      timer: state.timer,
      stats: state.stats,
    }))
  );
}
