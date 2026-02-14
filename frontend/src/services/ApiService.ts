import { BattleHistoryResponse } from '../types/socket';
import { AuthSessionPayload, UserProfile } from '../types/user';
import { getStoredToken } from '../utils/authStorage';

function stripTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

const apiBaseUrl = stripTrailingSlash(
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? '/battlebrain' : 'http://localhost:3000')
);
const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true';

const mockBattleHistory: BattleHistoryResponse[] = [
  {
    id: 'hist_1',
    battleId: 'b_demo_1',
    topic: 'Pineapple belongs on pizza',
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
    topic: 'Cats are better pets than dogs',
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(init?.headers ?? {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${apiBaseUrl}${path}`, {
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
