import { useBattleStore } from '../stores/battleStore';

export function useBattle() {
  return useBattleStore((state) => ({
    battleId: state.battleId,
    topic: state.topic,
    myHp: state.myHp,
    opponentHp: state.opponentHp,
    messages: state.messages,
    timer: state.timer,
    stats: state.stats,
  }));
}
