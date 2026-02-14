export interface LevelInfo {
  currentLevelXp: number;
  nextLevelXp: number;
  levelProgressPct: number;
}

export interface UserStats {
  wins: number;
  losses: number;
  draws: number;
  totalBattles: number;
  winRate: number;
  messageCount: number;
  goodStrikes: number;
  toxicStrikes: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  avgWit: number;
  avgRelevance: number;
  avgToxicity: number;
}

export interface UserBadge {
  id: string;
  name: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  unlockedAt: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  name: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  level: number;
  xp: number;
  levelInfo: LevelInfo;
  stats: UserStats;
  badges: UserBadge[];
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
}

export interface AuthSessionPayload {
  token: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: UserProfile;
}
