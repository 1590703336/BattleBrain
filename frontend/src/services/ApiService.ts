import { BattleHistoryResponse } from '../types/socket';
import { AuthSessionPayload, UserProfile } from '../types/user';
import { getStoredToken } from '../utils/authStorage';

const baseUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';
const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false';

const mockBattleHistory: BattleHistoryResponse[] = [
  {
    id: 'hist_1',
    battleId: 'b_demo_1',
    topic: 'If your ex texted at 2AM, what is your opening line?',
    winner: 'opponent',
    stats: {
      myDamage: 72,
      opponentDamage: 95,
      messageCount: 16,
      goodStrikes: 7,
      toxicStrikes: 2,
    },
    finishedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    opponent: { id: 'op_1', name: 'HyperNova', level: 16 },
  },
  {
    id: 'hist_2',
    battleId: 'b_demo_2',
    topic: 'Pitch your worst startup idea with confidence.',
    winner: 'me',
    stats: {
      myDamage: 104,
      opponentDamage: 64,
      messageCount: 14,
      goodStrikes: 9,
      toxicStrikes: 1,
    },
    finishedAt: new Date(Date.now() - 1000 * 60 * 43).toISOString(),
    opponent: { id: 'op_2', name: 'PixelRuin', level: 12 },
  },
];

const mockLeaderboard = [
  { rank: 1, id: 'u_17', name: 'VoltJester', level: 22, xp: 9120, winRate: 72 },
  { rank: 2, id: 'u_12', name: 'HaloHex', level: 20, xp: 8740, winRate: 69 },
  { rank: 3, id: 'u_08', name: 'NeoRoaster', level: 19, xp: 8210, winRate: 66 },
  { rank: 4, id: 'u_31', name: 'PixelRuin', level: 18, xp: 7880, winRate: 64 },
  { rank: 5, id: 'u_03', name: 'LaughShard', level: 17, xp: 7540, winRate: 62 },
];

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(init?.headers ?? {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const payload = (await res.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // ignore non-json response
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export const ApiService = {
  getLeaderboard: async () => {
    if (useMockApi) {
      return mockLeaderboard;
    }
    return request('/api/leaderboard');
  },
  getHealth: () => request('/health'),
  getBattleHistory: async (userId = 'me', limit = 20): Promise<BattleHistoryResponse[]> => {
    if (useMockApi) {
      return mockBattleHistory.slice(0, limit);
    }
    return request(`/api/battles/${userId}?limit=${limit}`);
  },
  signup: (email: string, password: string, displayName: string) =>
    request<AuthSessionPayload>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    }),
  login: (email: string, password: string) =>
    request<AuthSessionPayload>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => request<{ user: UserProfile }>('/api/auth/me'),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
};
