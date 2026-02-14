import { create } from 'zustand';

interface UserState {
  id: string;
  displayName: string;
  level: number;
  xp: number;
  setDisplayName: (name: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  id: 'demo-user',
  displayName: 'NeoRoaster',
  level: 9,
  xp: 1240,
  setDisplayName: (displayName) => set({ displayName }),
}));
