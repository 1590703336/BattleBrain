const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

// --- Battle record subdocument (embedded in User) ---
const battleRecordSchema = new mongoose.Schema(
    {
        opponentName: { type: String, required: true },
        topic: { type: String, required: true },
        result: { type: String, enum: ['win', 'loss', 'draw'], required: true },
        messageCount: { type: Number, default: 0 },
        duration: { type: Number, default: 0 },   // milliseconds
        playedAt: { type: Date, default: Date.now }
    },
    { _id: false }
);

// --- Main User schema ---
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
        battles: [battleRecordSchema]   // embedded battle history
    },
    { timestamps: true }
);

// --- Pre-save: hash password if modified ---
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    next();
});

// --- Instance method: compare candidate password ---
userSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

// --- Virtual: compute stats from battles array ---
userSchema.virtual('stats').get(function () {
    const battles = this.battles || [];
    const wins = battles.filter(b => b.result === 'win').length;
    const losses = battles.filter(b => b.result === 'loss').length;

    return {
        totalBattles: battles.length,
        wins,
        losses,
        winRate: battles.length > 0 ? Math.round((wins / battles.length) * 100) : 0
    };
});

// --- Transform JSON output (remove password, rename _id → id, include virtuals) ---
userSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
    }
});

module.exports = mongoose.model('User', userSchema);
