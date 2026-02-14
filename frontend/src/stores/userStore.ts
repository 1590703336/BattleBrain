import { create } from 'zustand';

interface UserState {
  id: string;
  displayName: string;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  badges: string[];
  setDisplayName: (name: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  id: 'demo-user',
  displayName: 'NeoRoaster',
  level: 9,
  xp: 1240,
  wins: 28,
  losses: 17,
  badges: ['First Blood', 'Wit Master', 'Comeback King'],
  setDisplayName: (displayName) => set({ displayName }),
}));
