import { useBattleStore } from '../stores/battleStore';
import { useShallow } from 'zustand/react/shallow';

export function useBattle() {
  return useBattleStore(
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
    }))
  );
}
