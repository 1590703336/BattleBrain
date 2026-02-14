import { create } from 'zustand';

interface MatchState {
  queueStatus: 'idle' | 'searching' | 'found';
  etaSec: number;
  statusText: string;
  setQueueStatus: (status: MatchState['queueStatus']) => void;
  setWaitingMeta: (etaSec: number, statusText: string) => void;
  reset: () => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  queueStatus: 'idle',
  etaSec: 0,
  statusText: 'Ready to queue',
  setQueueStatus: (queueStatus) => set({ queueStatus }),
  setWaitingMeta: (etaSec, statusText) => set({ etaSec, statusText }),
  reset: () =>
    set({
      queueStatus: 'idle',
      etaSec: 0,
      statusText: 'Ready to queue',
    }),
}));
