const { v4: uuidv4 } = require('uuid');
const { BATTLE_DURATION_MS, INITIAL_HP } = require('../config/constants');
const logger = require('../utils/logger');
const AIService = require('./AIService');
const PresenceService = require('./PresenceService');
const User = require('../models/User'); // Lazy load usually better but here is fine

class BattleService {
    constructor() {
        // Map<battleId, BattleState>
        this.activeBattles = new Map();
    }

    createBattle(player1, player2, topic) {
        const battleId = `battle_${Date.now()}_${uuidv4().substring(0, 8)}`;

        logger.info({ battleId, p1: player1.displayName, p2: player2.displayName }, 'Creating battle');

        const state = {
            id: battleId,
            topic,
            startTime: Date.now(),
            duration: BATTLE_DURATION_MS,
            players: {
                [player1.id]: { hp: INITIAL_HP, user: player1, messagesCount: 0 },
                [player2.id]: { hp: INITIAL_HP, user: player2, messagesCount: 0 }
            },
            messages: [],
            timerId: setTimeout(() => this.endBattle(battleId, 'timeout'), BATTLE_DURATION_MS)
        };

        this.activeBattles.set(battleId, state);

        // Return clean payload for clients (exclude timerId)
        const payload = {
            id: battleId,
            topic,
            startTime: state.startTime,
            duration: state.duration,
            players: {
                [player1.id]: { hp: INITIAL_HP, user: player1, messagesCount: 0 },
                [player2.id]: { hp: INITIAL_HP, user: player2, messagesCount: 0 }
            }
        };

        return payload;
    }

    getBattle(battleId) {
        return this.activeBattles.get(battleId);
    }

    /**
     * Process a new message.
     * Returns { messageData, battleState } or throws error.
     */
    async sendMessage(battleId, senderId, text) {
        const battle = this.activeBattles.get(battleId);
        if (!battle) throw new Error('Battle not found or ended');

        // 1. Validate sender is in battle
        if (!battle.players[senderId]) throw new Error('User not in this battle');

        // 2. Identify opponent
        const opponentId = Object.keys(battle.players).find(id => id !== senderId);
        if (!opponentId) throw new Error('Opponent not found');

        // 3. AI Analysis
        const context = battle.messages.slice(-5).map(m => ({
            role: m.senderId === senderId ? 'user' : 'opponent',
            content: m.text
        }));

        const analysis = await AIService.analyzeMessage(text, battle.topic, context);

        // 4. Compute Damage
        let damage = 0;
        let strikeType = 'neutral';

        if (analysis.toxicity > 6) {
            strikeType = 'toxic';
            damage = analysis.toxicity * 2; // Self damage
            // Apply to sender
            battle.players[senderId].hp = Math.max(0, battle.players[senderId].hp - damage);
        } else if (analysis.wit >= 5 && analysis.relevance >= 5) {
            strikeType = 'good-strike';
            damage = Math.round((analysis.wit + analysis.relevance) * 1.5);
            // Apply to opponent
            battle.players[opponentId].hp = Math.max(0, battle.players[opponentId].hp - damage);
        } else {
            // Neutral - no damage
            damage = 0;
        }

        // 5. Update state
        battle.players[senderId].messagesCount++;

        const messageData = {
            id: `msg_${Date.now()}`,
            senderId,
            message: text,
            analysis: { ...analysis, damage, strikeType },
            timestamp: Date.now()
        };

        battle.messages.push(messageData);

        // 6. Check for Knockout
        let result = null;
        if (battle.players[senderId].hp <= 0) {
            result = this.endBattle(battleId, 'knockout', opponentId); // Opponent wins
        } else if (battle.players[opponentId].hp <= 0) {
            result = this.endBattle(battleId, 'knockout', senderId); // Sender wins
        }

        // Payload for broadcast
        const stateSnapshot = {};
        for (const pid in battle.players) {
            stateSnapshot[pid] = { hp: battle.players[pid].hp };
        }

        const payload = {
            senderId,
            message: text,
            analysis: { ...analysis, damage, strikeType },
            state: stateSnapshot
        };

        // Broadcast to players via Socket.IO
        const io = require('../socket').getIO();
        if (io) {
            Object.keys(battle.players).forEach(pid => {
                const sid = PresenceService.getSocketId(pid);
                if (sid) io.to(sid).emit('battle-message', payload);
            });
        }

        return {
            event: 'battle-message',
            payload,
            endResult: result // If battle ended, this will be non-null
        };
    }

    /**
     * Handle user disconnect - forfeit active battle
     */
    handleDisconnect(userId) {
        // Find active battle where this user is playing
        for (const [battleId, battle] of this.activeBattles) {
            if (battle.players[userId]) {
                logger.info({ userId, battleId }, 'User disconnected mid-battle. Forfeiting.');

                // Opponent is winner
                const opponentId = Object.keys(battle.players).find(id => id !== userId);
                this.endBattle(battleId, 'forfeit', opponentId);
                break; // User can only be in one battle
            }
        }
    }

    endBattle(battleId, reason, explicitWinnerId = null) {
        const battle = this.activeBattles.get(battleId);
        if (!battle) return null;

        clearTimeout(battle.timerId);
        this.activeBattles.delete(battleId);

        let winnerId = explicitWinnerId;

        if (!winnerId) {
            // Timeout case: compare HP
            const ids = Object.keys(battle.players);
            const hp0 = battle.players[ids[0]].hp;
            const hp1 = battle.players[ids[1]].hp;

            if (hp0 > hp1) winnerId = ids[0];
            else if (hp1 > hp0) winnerId = ids[1];
        }

        const finalState = {};
        for (const pid in battle.players) {
            finalState[pid] = {
                hp: battle.players[pid].hp,
                messagesCount: battle.players[pid].messagesCount
            };
        }

        const result = {
            winner: winnerId,
            finalState,
            reason,
            topic: battle.topic,
            duration: Date.now() - battle.startTime
        };

        // Emit 'battle-end' via IO
        const io = require('../socket').getIO();
        if (io) {
            Object.keys(battle.players).forEach(pid => {
                const sid = PresenceService.getSocketId(pid);
                if (sid) io.to(sid).emit('battle-end', result);
            });
        }

        // Persistence (Phase 6)
        this._persistBattle(battle, result).catch(err => {
            logger.error({ err, battleId }, 'Failed to persist battle');
        });

        return result;
    }

    async _persistBattle(battle, result) {
        const recordBase = {
            topic: battle.topic,
            duration: result.duration,
            playedAt: new Date(battle.startTime)
        };

        const promises = Object.values(battle.players).map(async player => {
            const isWinner = player.user.id === result.winner;
            const outcome = result.winner ? (isWinner ? 'win' : 'loss') : 'draw';

            // Find opponent name
            const opponentId = Object.keys(battle.players).find(id => id !== player.user.id);
            const opponentName = battle.players[opponentId]?.user.displayName || 'Unknown';

            const record = {
                ...recordBase,
                opponentName,
                result: outcome,
                messageCount: player.messagesCount
            };

            await User.findByIdAndUpdate(player.user.id, {
                $push: { battles: record }
            });
        });

        await Promise.all(promises);
        logger.info({ battleId: battle.id }, 'Battle persisted to DB');
    }
}

module.exports = new BattleService();
