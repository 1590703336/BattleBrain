import { create } from 'zustand';
import { AuthSessionPayload, UserProfile } from '../types/user';
import {
  getStoredToken,
  getStoredUser,
  removeStoredToken,
  removeStoredUser,
  setStoredToken,
  setStoredUser,
} from '../utils/authStorage';

interface UserState {
  token: string | null;
  isAuthenticated: boolean;
  profile: UserProfile | null;
  id: string;
  displayName: string;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  winRate: number;
  badges: string[];
  hydrateSession: () => void;
  setSession: (session: AuthSessionPayload) => void;
  setProfile: (user: UserProfile) => void;
  logout: () => void;
}

const emptyState = {
  token: null as string | null,
  isAuthenticated: false,
  profile: null as UserProfile | null,
  id: '',
  displayName: '',
  level: 1,
  xp: 0,
  wins: 0,
  losses: 0,
  winRate: 0,
  badges: [] as string[],
};

function mapProfile(user: UserProfile) {
  return {
    profile: user,
    id: user.id,
    displayName: user.displayName,
    level: user.level,
    xp: user.xp,
    wins: user.stats.wins,
    losses: user.stats.losses,
    winRate: user.stats.winRate,
    badges: user.badges.map((badge) => badge.name),
  };
}

export const useUserStore = create<UserState>((set) => ({
  ...emptyState,
  hydrateSession: () => {
    const token = getStoredToken();
    const user = getStoredUser();

    if (!token || !user) {
      set({ ...emptyState });
      return;
    }

    set({
      token,
      isAuthenticated: true,
      ...mapProfile(user),
    });
  },
  setSession: (session) => {
    setStoredToken(session.token);
    setStoredUser(session.user);
    set({
      token: session.token,
      isAuthenticated: true,
      ...mapProfile(session.user),
    });
  },
  setProfile: (user) => {
    setStoredUser(user);
    set((state) => ({
      ...state,
      isAuthenticated: !!state.token,
      ...mapProfile(user),
    }));
  },
  logout: () => {
    removeStoredToken();
    removeStoredUser();
    set({ ...emptyState });
  },
}));
