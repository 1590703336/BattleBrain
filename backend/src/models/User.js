const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;
const LEVEL_XP_STEP = 220;

const defaultStats = () => ({
    wins: 0,
    losses: 0,
    draws: 0,
    totalBattles: 0,
    messageCount: 0,
    goodStrikes: 0,
    toxicStrikes: 0,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    avgWit: 0,
    avgRelevance: 0,
    avgToxicity: 0
});

const toPositiveInt = (value, fallback = 0) => {
    const num = Number(value);
    if (!Number.isFinite(num)) {
        return fallback;
    }
    return Math.max(0, Math.round(num));
};

function getLevelThreshold(level) {
    const safeLevel = Math.max(1, toPositiveInt(level, 1));
    return (safeLevel - 1) * LEVEL_XP_STEP;
}

function getLevelInfo(level, xp) {
    const safeLevel = Math.max(1, toPositiveInt(level, 1));
    const safeXp = toPositiveInt(xp, 0);

    const currentLevelXp = getLevelThreshold(safeLevel);
    const nextLevelXp = getLevelThreshold(safeLevel + 1);
    const span = Math.max(1, nextLevelXp - currentLevelXp);
    const levelProgressPct = Math.max(
        0,
        Math.min(100, Math.round(((safeXp - currentLevelXp) / span) * 100))
    );

    return { currentLevelXp, nextLevelXp, levelProgressPct };
}

function deriveWinRate(stats) {
    const wins = toPositiveInt(stats?.wins, 0);
    const losses = toPositiveInt(stats?.losses, 0);
    const draws = toPositiveInt(stats?.draws, 0);
    const totalBattlesFromWL = wins + losses + draws;
    const totalBattles = Math.max(totalBattlesFromWL, toPositiveInt(stats?.totalBattles, 0));

    if (totalBattles === 0) {
        return 0;
    }

    return Math.round((wins / totalBattles) * 100);
}

const battleRecordSchema = new mongoose.Schema(
    {
        id: { type: String, required: true },
        battleId: { type: String, required: true },
        topic: { type: String, required: true, trim: true },
        winner: { type: String, enum: ['me', 'opponent', 'draw'], required: true },
        finishedAt: { type: Date, default: Date.now },
        opponent: {
            id: { type: String, default: '' },
            name: { type: String, required: true, trim: true },
            level: { type: Number, min: 1, default: 1 }
        },
        stats: {
            myDamage: { type: Number, min: 0, default: 0 },
            opponentDamage: { type: Number, min: 0, default: 0 },
            messageCount: { type: Number, min: 0, default: 0 },
            goodStrikes: { type: Number, min: 0, default: 0 },
            toxicStrikes: { type: Number, min: 0, default: 0 }
        },
        meta: {
            durationSec: { type: Number, min: 0, default: 0 },
            endReason: { type: String, enum: ['hp-zero', 'timeout', 'surrender'], default: 'hp-zero' }
        }
    },
    { _id: false }
);

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true,
            select: false
        },
        displayName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30
        },
        avatarUrl: {
            type: String,
            default: ''
        },
        bio: {
            type: String,
            default: '',
            maxlength: 200
        },
        level: {
            type: Number,
            min: 1,
            default: 1
        },
        xp: {
            type: Number,
            min: 0,
            default: 0
        },
        stats: {
            type: Object,
            default: defaultStats
        },
        badges: {
            type: [
                {
                    id: { type: String, required: true },
                    name: { type: String, required: true, trim: true },
                    tier: {
                        type: String,
                        enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
                        default: 'bronze'
                    },
                    unlockedAt: { type: Date, default: Date.now }
                }
            ],
            default: []
        },
        lastActiveAt: {
            type: Date,
            default: Date.now
        },
        records: {
            type: [battleRecordSchema],
            default: []
        },
        // Legacy field kept for backward compatibility with old data.
        battles: {
            type: [battleRecordSchema],
            default: []
        }
    },
    { timestamps: true }
);

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    next();
});

userSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

userSchema.virtual('name').get(function () {
    return this.displayName;
});

userSchema.virtual('levelInfo').get(function () {
    return getLevelInfo(this.level, this.xp);
});

userSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        if ((!ret.records || ret.records.length === 0) && Array.isArray(ret.battles) && ret.battles.length > 0) {
            ret.records = ret.battles;
        }

        ret.id = ret._id.toString();
        ret.name = ret.displayName;
        ret.levelInfo = getLevelInfo(ret.level, ret.xp);

        const stats = { ...defaultStats(), ...(ret.stats || {}) };
        stats.wins = toPositiveInt(stats.wins, 0);
        stats.losses = toPositiveInt(stats.losses, 0);
        stats.draws = toPositiveInt(stats.draws, 0);
        stats.totalBattles = Math.max(
            stats.wins + stats.losses + stats.draws,
            toPositiveInt(stats.totalBattles, 0)
        );
        stats.messageCount = toPositiveInt(stats.messageCount, 0);
        stats.goodStrikes = toPositiveInt(stats.goodStrikes, 0);
        stats.toxicStrikes = toPositiveInt(stats.toxicStrikes, 0);
        stats.totalDamageDealt = toPositiveInt(stats.totalDamageDealt, 0);
        stats.totalDamageTaken = toPositiveInt(stats.totalDamageTaken, 0);
        stats.avgWit = toPositiveInt(stats.avgWit, 0);
        stats.avgRelevance = toPositiveInt(stats.avgRelevance, 0);
        stats.avgToxicity = toPositiveInt(stats.avgToxicity, 0);
        stats.winRate = deriveWinRate(stats);
        ret.stats = stats;

        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.battles;
        return ret;
    }
});

module.exports = mongoose.model('User', userSchema);
