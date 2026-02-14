const User = require('../models/User');
const mongoose = require('mongoose');
const { ValidationError, NotFoundError } = require('../utils/errors');
const AI_BOT_PERSONAS = require('../config/aiBots');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const LEADERBOARD_EXCLUDED_EMAIL_SUFFIXES = ['@test.com'];
const AI_LEADERBOARD_EMAILS = new Set(
    AI_BOT_PERSONAS.map((persona) => String(persona.email || '').toLowerCase())
);

const defaultStats = () => ({
    wins: 0,
    losses: 0,
    draws: 0,
    totalBattles: 0,
    winRate: 0,
    messageCount: 0,
    goodStrikes: 0,
    toxicStrikes: 0,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    avgWit: 0,
    avgRelevance: 0,
    avgToxicity: 0
});

function toNumber(value, fallback = 0) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
        return fallback;
    }
    return num;
}

function toInt(value, fallback = 0) {
    return Math.max(0, Math.round(toNumber(value, fallback)));
}

function getLevelThreshold(level) {
    const safeLevel = Math.max(1, toInt(level, 1));
    return (safeLevel - 1) * 220;
}

function buildLevelInfo(level, xp) {
    const safeLevel = Math.max(1, toInt(level, 1));
    const safeXp = toInt(xp, 0);

    const currentLevelXp = getLevelThreshold(safeLevel);
    const nextLevelXp = getLevelThreshold(safeLevel + 1);
    const span = Math.max(1, nextLevelXp - currentLevelXp);
    const levelProgressPct = Math.max(
        0,
        Math.min(100, Math.round(((safeXp - currentLevelXp) / span) * 100))
    );

    return { currentLevelXp, nextLevelXp, levelProgressPct };
}

function normalizeStats(rawStats) {
    const stats = { ...defaultStats(), ...(rawStats || {}) };
    stats.wins = toInt(stats.wins, 0);
    stats.losses = toInt(stats.losses, 0);
    stats.draws = toInt(stats.draws, 0);
    stats.totalBattles = Math.max(
        stats.wins + stats.losses + stats.draws,
        toInt(stats.totalBattles, 0)
    );
    stats.messageCount = toInt(stats.messageCount, 0);
    stats.goodStrikes = toInt(stats.goodStrikes, 0);
    stats.toxicStrikes = toInt(stats.toxicStrikes, 0);
    stats.totalDamageDealt = toInt(stats.totalDamageDealt, 0);
    stats.totalDamageTaken = toInt(stats.totalDamageTaken, 0);
    stats.avgWit = toInt(stats.avgWit, 0);
    stats.avgRelevance = toInt(stats.avgRelevance, 0);
    stats.avgToxicity = toInt(stats.avgToxicity, 0);
    stats.winRate = stats.totalBattles > 0 ? Math.round((stats.wins / stats.totalBattles) * 100) : 0;
    return stats;
}

function normalizeBadge(badge, idx) {
    const unlockedAtDate = badge?.unlockedAt ? new Date(badge.unlockedAt) : new Date();
    const unlockedAt = Number.isNaN(unlockedAtDate.getTime())
        ? new Date().toISOString()
        : unlockedAtDate.toISOString();

    return {
        id: typeof badge?.id === 'string' && badge.id.trim() ? badge.id.trim() : `badge_${idx + 1}`,
        name: typeof badge?.name === 'string' && badge.name.trim() ? badge.name.trim() : `Badge ${idx + 1}`,
        tier: typeof badge?.tier === 'string' && badge.tier.trim() ? badge.tier.trim() : 'bronze',
        unlockedAt
    };
}

function normalizeBattleRecord(record, index) {
    const winnerMap = {
        win: 'me',
        loss: 'opponent',
        draw: 'draw'
    };

    const winner = record?.winner || winnerMap[record?.result] || 'draw';
    const messageCount = toInt(record?.stats?.messageCount ?? record?.messageCount, 0);
    const finishedAtDate = new Date(record?.finishedAt || record?.playedAt || Date.now());
    const finishedAt = Number.isNaN(finishedAtDate.getTime())
        ? new Date().toISOString()
        : finishedAtDate.toISOString();

    return {
        id: record?.id || record?.battleId || `hist_${index + 1}`,
        battleId: record?.battleId || record?.id || `battle_${index + 1}`,
        topic: record?.topic || 'Unknown topic',
        winner,
        finishedAt,
        opponent: {
            id: record?.opponent?.id || '',
            name: record?.opponent?.name || record?.opponentName || 'Unknown opponent',
            level: Math.max(1, toInt(record?.opponent?.level, 1))
        },
        stats: {
            myDamage: toInt(record?.stats?.myDamage, 0),
            opponentDamage: toInt(record?.stats?.opponentDamage, 0),
            messageCount,
            goodStrikes: toInt(record?.stats?.goodStrikes, 0),
            toxicStrikes: toInt(record?.stats?.toxicStrikes, 0)
        },
        meta: {
            durationSec: toInt(
                record?.meta?.durationSec,
                record?.duration ? Math.round(toNumber(record.duration) / 1000) : 0
            ),
            endReason: record?.meta?.endReason || 'hp-zero'
        }
    };
}

function parseLimit(limit, defaultValue = DEFAULT_LIMIT) {
    const parsed = Number.parseInt(limit, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return defaultValue;
    }
    return Math.min(parsed, MAX_LIMIT);
}

function assertValidObjectId(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ValidationError('Invalid user id');
    }
}

function isExcludedHumanEmail(email) {
    return LEADERBOARD_EXCLUDED_EMAIL_SUFFIXES.some((suffix) => email.endsWith(suffix));
}

class UserService {
    static buildUserPayload(rawUser, { includeEmail = true } = {}) {
        if (!rawUser) {
            return null;
        }

        const user = typeof rawUser.toJSON === 'function' ? rawUser.toJSON() : rawUser;
        const level = Math.max(1, toInt(user.level, 1));
        const xp = toInt(user.xp, 0);

        const payload = {
            id: user.id || user._id?.toString(),
            email: user.email,
            name: user.displayName || user.name || '',
            displayName: user.displayName || user.name || '',
            avatarUrl: user.avatarUrl || '',
            bio: user.bio || '',
            level,
            xp,
            levelInfo: user.levelInfo || buildLevelInfo(level, xp),
            stats: normalizeStats(user.stats),
            badges: Array.isArray(user.badges) ? user.badges.map(normalizeBadge) : [],
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastActiveAt: user.lastActiveAt || user.updatedAt || user.createdAt
        };

        if (!includeEmail) {
            delete payload.email;
        }

        return payload;
    }

    static async getCurrentUser(userId, { touchLastActive = true } = {}) {
        assertValidObjectId(userId);

        let user;
        if (touchLastActive) {
            user = await User.findByIdAndUpdate(
                userId,
                { $set: { lastActiveAt: new Date() } },
                { new: true }
            );
        } else {
            user = await User.findById(userId);
        }

        if (!user) {
            throw new NotFoundError('User not found');
        }

        return UserService.buildUserPayload(user);
    }

    static async getUserById(userId, { publicProfile = false } = {}) {
        assertValidObjectId(userId);
        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        return UserService.buildUserPayload(user, { includeEmail: !publicProfile });
    }

    static async updateCurrentUser(userId, changes) {
        assertValidObjectId(userId);
        const safeChanges = changes && typeof changes === 'object' ? changes : {};
        const updates = {};

        if (Object.prototype.hasOwnProperty.call(safeChanges, 'displayName')) {
            if (typeof safeChanges.displayName !== 'string') {
                throw new ValidationError('displayName must be a string');
            }
            const displayName = safeChanges.displayName.trim();
            if (!displayName) {
                throw new ValidationError('displayName cannot be empty');
            }
            if (displayName.length > 30) {
                throw new ValidationError('displayName must be at most 30 characters');
            }
            updates.displayName = displayName;
        }

        if (Object.prototype.hasOwnProperty.call(safeChanges, 'avatarUrl')) {
            if (typeof safeChanges.avatarUrl !== 'string') {
                throw new ValidationError('avatarUrl must be a string');
            }
            if (safeChanges.avatarUrl.length > 2048) {
                throw new ValidationError('avatarUrl is too long');
            }
            updates.avatarUrl = safeChanges.avatarUrl.trim();
        }

        if (Object.prototype.hasOwnProperty.call(safeChanges, 'bio')) {
            if (typeof safeChanges.bio !== 'string') {
                throw new ValidationError('bio must be a string');
            }
            const bio = safeChanges.bio.trim();
            if (bio.length > 200) {
                throw new ValidationError('bio must be at most 200 characters');
            }
            updates.bio = bio;
        }

        if (Object.keys(updates).length === 0) {
            throw new ValidationError('No valid fields to update');
        }

        updates.lastActiveAt = new Date();

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!user) {
            throw new NotFoundError('User not found');
        }

        return UserService.buildUserPayload(user);
    }

    static async getBattleHistory(userId, limit = DEFAULT_LIMIT) {
        assertValidObjectId(userId);
        const parsedLimit = parseLimit(limit);
        const user = await User.findById(userId).select('records battles');

        if (!user) {
            throw new NotFoundError('User not found');
        }

        const records = Array.isArray(user.records) && user.records.length > 0
            ? user.records
            : (Array.isArray(user.battles) ? user.battles : []);

        return records
            .map(normalizeBattleRecord)
            .sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime())
            .slice(0, parsedLimit);
    }

    static async ensureLeaderboardAiUsers() {
        for (const [index, seed] of AI_BOT_PERSONAS.entries()) {
            const email = String(seed.email || '').toLowerCase();
            let user = await User.findOne({ email });
            if (user) {
                continue;
            }

            user = await User.create({
                email,
                password: `swipe_bot_${index + 1}_default`,
                displayName: seed.displayName,
                avatarUrl: '',
                bio: seed.bio,
                level: seed.level,
                xp: seed.level * 220,
                stats: {
                    wins: 40 + index * 7,
                    losses: 22 + index * 4,
                    draws: 4,
                    totalBattles: 66 + index * 11,
                    messageCount: 900 + index * 120,
                    goodStrikes: 280 + index * 35,
                    toxicStrikes: 40 + index * 6,
                    totalDamageDealt: 6500 + index * 700,
                    totalDamageTaken: 6100 + index * 680,
                    avgWit: 68 + index,
                    avgRelevance: 64 + index,
                    avgToxicity: 18
                }
            });
        }
    }

    static async getLeaderboard(limit = MAX_LIMIT) {
        await UserService.ensureLeaderboardAiUsers();

        const hasExplicitLimit = typeof limit !== 'undefined' && limit !== null && String(limit).trim() !== '';
        const parsedLimit = hasExplicitLimit ? parseLimit(limit, MAX_LIMIT) : null;
        const users = await User.find({})
            .select('displayName email level xp stats')
            .lean();

        const ranked = users
            .filter((user) => {
                const email = String(user.email || '').toLowerCase();
                if (AI_LEADERBOARD_EMAILS.has(email)) {
                    return true;
                }
                if (email.endsWith('@battlebrain.ai')) {
                    return false;
                }
                if (isExcludedHumanEmail(email)) {
                    return false;
                }
                return true;
            })
            .map((user) => {
                const stats = normalizeStats(user.stats);
                const email = String(user.email || '').toLowerCase();
                return {
                    id: user._id.toString(),
                    name: user.displayName || 'Unknown',
                    level: Math.max(1, toInt(user.level, 1)),
                    xp: toInt(user.xp, 0),
                    winRate: stats.winRate,
                    isAi: AI_LEADERBOARD_EMAILS.has(email)
                };
            })
            .sort((a, b) =>
                b.level - a.level ||
                b.xp - a.xp ||
                b.winRate - a.winRate ||
                a.name.localeCompare(b.name)
            );

        const visibleRows = parsedLimit ? ranked.slice(0, parsedLimit) : ranked;

        return visibleRows.map((row, index) => ({
            rank: index + 1,
            ...row
        }));
    }

    static resolveRequestedUserId(authenticatedUserId, routeUserId) {
        if (!routeUserId || routeUserId === 'me') {
            return authenticatedUserId;
        }
        return routeUserId;
    }
}

module.exports = UserService;
