import { BattleHistoryResponse } from '../types/socket';

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

export const ApiService = {
  getLeaderboard: () => request('/api/leaderboard'),
  getHealth: () => request('/health'),
  getBattleHistory: async (userId = 'me', limit = 20): Promise<BattleHistoryResponse[]> => {
    if (useMockApi) {
      return mockBattleHistory.slice(0, limit);
    }
    return request(`/api/battles/${userId}?limit=${limit}`);
  },
};
