import { create } from 'zustand';

interface MatchState {
  queueStatus: 'idle' | 'searching' | 'found';
  setQueueStatus: (status: MatchState['queueStatus']) => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  queueStatus: 'idle',
  setQueueStatus: (queueStatus) => set({ queueStatus }),
}));
