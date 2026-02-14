const { randomUUID } = require('crypto');
const mongoose = require('mongoose');
const { BATTLE_DURATION_MS, INITIAL_HP } = require('../config/constants');
const logger = require('../utils/logger');
const AIService = require('./AIService');
const PresenceService = require('./PresenceService');
const User = require('../models/User');
const AI_BOT_PERSONAS = require('../config/aiBots');
const SwipeService = require('./SwipeService');

const GOOD_STRIKE_THRESHOLD = 40;
const TOXIC_STRIKE_THRESHOLD = 60;
const AI_PERSONA_BY_NAME = new Map(
    AI_BOT_PERSONAS.map((persona) => [String(persona.displayName || '').toLowerCase(), persona])
);

function clampScore(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
        return 0;
    }
    return Math.max(0, Math.min(100, Math.round(num)));
}

function toKeywordFragment(text) {
    const cleaned = String(text || '')
        .replace(/https?:\/\/\S+/g, ' ')
        .replace(/[^\w\s]/g, ' ')
        .trim();

    if (!cleaned) {
        return 'that take';
    }

    const tokens = cleaned.split(/\s+/).filter(Boolean);
    if (tokens.length <= 4) {
        return cleaned.toLowerCase();
    }

    const pivot = Math.max(0, Math.floor(tokens.length / 2) - 2);
    return tokens.slice(pivot, pivot + 4).join(' ').toLowerCase();
}

function buildFlexibleFallback(topic, lastMessage) {
    const fragment = toKeywordFragment(lastMessage);
    const attackOpeners = [
        `On "${topic}", your take folds under one question.`,
        `For "${topic}", that argument has volume but no spine.`,
        `"${topic}" is not the place for half-built logic like that.`,
        `On "${topic}", you just handed me free damage.`
    ];

    const attackMiddles = [
        `You leaned on "${fragment}", but that is a weak pillar.`,
        `That "${fragment}" angle collapses the second it is tested.`,
        `You pushed "${fragment}", but it cannot carry the claim.`,
        `Your "${fragment}" point sounds bold and proves nothing.`
    ];

    const attackClosers = [
        'Come back with an argument, not just noise.',
        'Try evidence next turn, not confidence cosplay.',
        'You are shadowboxing while the topic scores you down.',
        'That line is style without structure.'
    ];

    const opener = attackOpeners[Math.floor(Math.random() * attackOpeners.length)];
    const middle = attackMiddles[Math.floor(Math.random() * attackMiddles.length)];
    const closer = attackClosers[Math.floor(Math.random() * attackClosers.length)];
    return `${opener} ${middle} ${closer}`.slice(0, 260);
}

function createDefaultStats() {
    return {
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
    };
}

class BattleService {
    constructor() {
        this.activeBattles = new Map();
    }

    createBattle(player1, player2, topic) {
        const battleId = `battle_${Date.now()}_${randomUUID().slice(0, 8)}`;

        const normalizedPlayer1 = this.normalizePlayer(player1);
        const normalizedPlayer2 = this.normalizePlayer(player2);

        logger.info({ battleId, p1: normalizedPlayer1.displayName, p2: normalizedPlayer2.displayName }, 'Creating battle');

        const state = {
            id: battleId,
            topic,
            startTime: Date.now(),
            durationMs: BATTLE_DURATION_MS,
            players: {
                [normalizedPlayer1.id]: { hp: INITIAL_HP, user: normalizedPlayer1, messagesCount: 0 },
                [normalizedPlayer2.id]: { hp: INITIAL_HP, user: normalizedPlayer2, messagesCount: 0 }
            },
            messages: [],
            timerId: setTimeout(() => this.endBattle(battleId, 'timeout'), BATTLE_DURATION_MS)
        };

        this.activeBattles.set(battleId, state);

        return {
            id: battleId,
            battleId,
            topic,
            startTime: state.startTime,
            duration: state.durationMs,
            durationSec: Math.max(1, Math.round(state.durationMs / 1000)),
            players: {
                [normalizedPlayer1.id]: { hp: INITIAL_HP, user: normalizedPlayer1, messagesCount: 0 },
                [normalizedPlayer2.id]: { hp: INITIAL_HP, user: normalizedPlayer2, messagesCount: 0 }
            }
        };
    }

    normalizePlayer(player) {
        const id = String(player.id || player._id || '');
        const email = typeof player.email === 'string' ? player.email.toLowerCase() : '';
        const isAi = email.endsWith('@battlebrain.ai') || Boolean(player.isAi);
        return {
            id,
            displayName: player.displayName || player.name || 'Unknown',
            name: player.displayName || player.name || 'Unknown',
            level: Number.isFinite(Number(player.level)) ? Number(player.level) : 1,
            avatarUrl: player.avatarUrl || '',
            email,
            isAi
        };
    }

    getBattle(battleId) {
        return this.activeBattles.get(battleId);
    }

    async sendMessage(battleId, senderId, text) {
        const battle = this.activeBattles.get(battleId);
        if (!battle) {
            throw new Error('Battle not found or ended');
        }

        if (!battle.players[senderId]) {
            throw new Error('User not in this battle');
        }

        const opponentId = Object.keys(battle.players).find((id) => id !== senderId);
        if (!opponentId) {
            throw new Error('Opponent not found');
        }

        const cleanedText = String(text || '').trim();
        if (!cleanedText) {
            throw new Error('Empty message');
        }

        const context = battle.messages.slice(-8).map((message) => ({
            role: message.senderId === senderId ? 'user' : 'opponent',
            content: message.text
        }));

        const rawAnalysis = await AIService.analyzeMessage(cleanedText, battle.topic, context);
        const analysis = {
            wit: clampScore(rawAnalysis.wit),
            relevance: clampScore(rawAnalysis.relevance),
            toxicity: clampScore(rawAnalysis.toxicity)
        };

        let damage = 0;
        let strikeType = 'neutral';
        let damageTarget = null;

        if (analysis.toxicity >= TOXIC_STRIKE_THRESHOLD) {
            strikeType = 'toxic';
            damage = Math.min(INITIAL_HP, Math.max(0, Math.round(clampScore(analysis.toxicity) * 0.2)));
            damageTarget = 'me';
            battle.players[senderId].hp = Math.max(0, battle.players[senderId].hp - damage);
        } else if (analysis.wit >= GOOD_STRIKE_THRESHOLD && analysis.relevance >= GOOD_STRIKE_THRESHOLD) {
            const goodStrikeScore = Math.round((analysis.wit * 0.6 + analysis.relevance * 0.4) * 0.35);
            strikeType = 'good';
            damage = Math.min(INITIAL_HP, clampScore(goodStrikeScore));
            damageTarget = 'opponent';
            battle.players[opponentId].hp = Math.max(0, battle.players[opponentId].hp - damage);
        }

        battle.players[senderId].messagesCount += 1;

        const messageData = {
            id: `msg_${Date.now()}_${randomUUID().slice(0, 6)}`,
            senderId,
            text: cleanedText,
            analysis: {
                ...analysis,
                damage,
                strikeType,
                damageTarget
            },
            timestamp: Date.now()
        };

        battle.messages.push(messageData);

        const stateSnapshot = {};
        for (const playerId of Object.keys(battle.players)) {
            stateSnapshot[playerId] = { hp: battle.players[playerId].hp };
        }

        const payload = {
            battleId,
            senderId,
            message: cleanedText,
            analysis: {
                ...analysis,
                damage,
                strikeType,
                damageTarget
            },
            state: stateSnapshot
        };

        this.emitToBattlePlayers(battle, 'battle-message', payload);

        let endResult = null;
        if (battle.players[senderId].hp <= 0) {
            endResult = this.endBattle(battleId, 'knockout', opponentId);
        } else if (battle.players[opponentId].hp <= 0) {
            endResult = this.endBattle(battleId, 'knockout', senderId);
        }

        if (!endResult) {
            this.scheduleAiReplyIfNeeded(battleId, senderId);
        }

        return {
            event: 'battle-message',
            payload,
            endResult
        };
    }

    emitToBattlePlayers(battle, event, payloadByPlayerOrShared) {
        const io = require('../socket').getIO();

        for (const playerId of Object.keys(battle.players)) {
            const socketId = PresenceService.getSocketId(playerId);
            if (!socketId) {
                continue;
            }

            const payload = typeof payloadByPlayerOrShared === 'function'
                ? payloadByPlayerOrShared(playerId)
                : payloadByPlayerOrShared;

            io.to(socketId).emit(event, payload);
        }
    }

    handleDisconnect(userId) {
        for (const [battleId, battle] of this.activeBattles) {
            if (!battle.players[userId]) {
                continue;
            }

            logger.info({ userId, battleId }, 'User disconnected mid-battle. Forfeiting battle');
            const opponentId = Object.keys(battle.players).find((id) => id !== userId) || null;
            this.endBattle(battleId, 'forfeit', opponentId);
            break;
        }
    }

    surrenderBattle(battleId, userId) {
        const battle = this.activeBattles.get(battleId);
        if (!battle) {
            return false;
        }

        if (!battle.players[userId]) {
            throw new Error('User not in this battle');
        }

        const opponentId = Object.keys(battle.players).find((id) => id !== userId) || null;
        if (!opponentId) {
            throw new Error('Opponent not found');
        }
        this.endBattle(battleId, 'forfeit', opponentId);
        return true;
    }

    scheduleAiReplyIfNeeded(battleId, senderId) {
        const battle = this.activeBattles.get(battleId);
        if (!battle) {
            return;
        }

        const opponentId = Object.keys(battle.players).find((id) => id !== senderId);
        if (!opponentId) {
            return;
        }

        const sender = battle.players[senderId];
        const opponent = battle.players[opponentId];

        if (!sender || !opponent) {
            return;
        }

        if (sender.user.isAi || !opponent.user.isAi) {
            return;
        }

        if (sender.hp <= 0 || opponent.hp <= 0) {
            return;
        }

        (async () => {
            const latestBattle = this.activeBattles.get(battleId);
            if (!latestBattle || !latestBattle.players[opponentId]) {
                return;
            }

            const text = await this.generateAiReply(latestBattle, opponentId);
            const liveBattle = this.activeBattles.get(battleId);

            if (!liveBattle || !liveBattle.players[opponentId] || liveBattle.players[opponentId].hp <= 0) {
                return;
            }

            await this.sendMessage(battleId, opponentId, text);
        })()
            .catch((err) => {
                logger.warn({ err, battleId, opponentId }, 'AI reply failed');
            });
    }

    async generateAiReply(battle, aiPlayerId) {
        const lastMessage = battle.messages[battle.messages.length - 1]?.text || '';
        const topic = battle.topic || 'this debate';
        const aiPlayer = battle.players[aiPlayerId]?.user;
        const botPersona = AI_PERSONA_BY_NAME.get(String(aiPlayer?.displayName || aiPlayer?.name || '').toLowerCase());
        const fallbackText = buildFlexibleFallback(topic, lastMessage);

        if (!botPersona?.prompt) {
            return fallbackText;
        }

        const context = battle.messages.slice(-8).map((message) => ({
            role: message.senderId === aiPlayerId ? 'assistant' : 'user',
            content: message.text
        }));

        const aiReply = await AIService.generateBotReply({
            topic,
            botName: botPersona.displayName,
            personaPrompt: botPersona.prompt,
            currentMessage: lastMessage,
            context
        });

        return String(aiReply || fallbackText).slice(0, 260);
    }

    mapEndReason(reason) {
        if (reason === 'timeout') {
            return 'timeout';
        }
        if (reason === 'forfeit') {
            return 'surrender';
        }
        return 'hp-zero';
    }

    determineWinnerId(battle, explicitWinnerId) {
        if (explicitWinnerId) {
            return explicitWinnerId;
        }

        const ids = Object.keys(battle.players);
        const hpA = battle.players[ids[0]].hp;
        const hpB = battle.players[ids[1]].hp;

        if (hpA > hpB) {
            return ids[0];
        }
        if (hpB > hpA) {
            return ids[1];
        }
        return null;
    }

    endBattle(battleId, reason, explicitWinnerId = null) {
        const battle = this.activeBattles.get(battleId);
        if (!battle) {
            return null;
        }

        clearTimeout(battle.timerId);
        this.activeBattles.delete(battleId);
        Object.keys(battle.players).forEach((playerId) => {
            SwipeService.resetUserMatchState(playerId);
        });

        const winnerId = this.determineWinnerId(battle, explicitWinnerId);
        const endReason = this.mapEndReason(reason);
        const durationMs = Math.max(0, Date.now() - battle.startTime);

        const legacyFinalState = {};
        for (const playerId of Object.keys(battle.players)) {
            legacyFinalState[playerId] = {
                hp: battle.players[playerId].hp,
                messagesCount: battle.players[playerId].messagesCount
            };
        }

        this.emitToBattlePlayers(battle, 'battle-end', (playerId) => {
            const opponentId = Object.keys(battle.players).find((id) => id !== playerId);
            const winner = !winnerId ? 'draw' : (winnerId === playerId ? 'me' : 'opponent');

            return {
                battleId,
                winner,
                reason: endReason,
                finalState: {
                    myHp: battle.players[playerId].hp,
                    opponentHp: battle.players[opponentId].hp,
                    timer: 0
                },
                winnerId,
                topic: battle.topic,
                duration: durationMs,
                legacyFinalState
            };
        });

        this.persistBattle(battle, {
            winnerId,
            endReason,
            durationMs,
            finishedAt: new Date()
        }).catch((err) => {
            logger.error({ err, battleId }, 'Failed to persist battle');
        });

        return {
            battleId,
            winnerId,
            reason: endReason,
            durationMs,
            legacyFinalState
        };
    }

    computePlayerBattleStats(battle, playerId, opponentId) {
        const playerMessages = battle.messages.filter((message) => message.senderId === playerId);
        const opponentMessages = battle.messages.filter((message) => message.senderId === opponentId);

        const messageCount = playerMessages.length;
        const goodStrikes = playerMessages.filter((message) => message.analysis.strikeType === 'good').length;
        const toxicStrikes = playerMessages.filter((message) => message.analysis.strikeType === 'toxic').length;

        const myDamage = playerMessages
            .filter((message) => message.analysis.strikeType === 'good')
            .reduce((sum, message) => sum + Number(message.analysis.damage || 0), 0);

        const opponentDamage = opponentMessages
            .filter((message) => message.analysis.strikeType === 'good')
            .reduce((sum, message) => sum + Number(message.analysis.damage || 0), 0);

        const avgWit = messageCount > 0
            ? Math.round(playerMessages.reduce((sum, message) => sum + Number(message.analysis.wit || 0), 0) / messageCount)
            : 0;
        const avgRelevance = messageCount > 0
            ? Math.round(playerMessages.reduce((sum, message) => sum + Number(message.analysis.relevance || 0), 0) / messageCount)
            : 0;
        const avgToxicity = messageCount > 0
            ? Math.round(playerMessages.reduce((sum, message) => sum + Number(message.analysis.toxicity || 0), 0) / messageCount)
            : 0;

        return {
            messageCount,
            goodStrikes,
            toxicStrikes,
            myDamage,
            opponentDamage,
            avgWit,
            avgRelevance,
            avgToxicity
        };
    }

    computeXpGain(outcome, battleStats) {
        const base = outcome === 'me' ? 120 : outcome === 'draw' ? 70 : 40;
        const strikeBonus = battleStats.goodStrikes * 8;
        const disciplinePenalty = battleStats.toxicStrikes * 3;
        const damageBonus = Math.round(battleStats.myDamage * 0.3);

        return Math.max(10, base + strikeBonus + damageBonus - disciplinePenalty);
    }

    async persistBattle(battle, result) {
        const playerIds = Object.keys(battle.players);

        for (const playerId of playerIds) {
            if (!mongoose.Types.ObjectId.isValid(playerId)) {
                continue;
            }

            const opponentId = playerIds.find((id) => id !== playerId);
            const opponentUser = battle.players[opponentId].user;
            const battleStats = this.computePlayerBattleStats(battle, playerId, opponentId);

            const outcome = !result.winnerId
                ? 'draw'
                : (result.winnerId === playerId ? 'me' : 'opponent');

            const user = await User.findById(playerId);
            if (!user) {
                continue;
            }

            const currentStats = {
                ...createDefaultStats(),
                ...(user.stats || {})
            };

            const previousMessageCount = Number(currentStats.messageCount || 0);
            const newMessageCount = previousMessageCount + battleStats.messageCount;

            const weightedAverage = (prevAvg, newAvg) => {
                if (newMessageCount === 0) {
                    return 0;
                }
                return Math.round((prevAvg * previousMessageCount + newAvg * battleStats.messageCount) / newMessageCount);
            };

            currentStats.wins = Number(currentStats.wins || 0) + (outcome === 'me' ? 1 : 0);
            currentStats.losses = Number(currentStats.losses || 0) + (outcome === 'opponent' ? 1 : 0);
            currentStats.draws = Number(currentStats.draws || 0) + (outcome === 'draw' ? 1 : 0);
            currentStats.totalBattles = Number(currentStats.totalBattles || 0) + 1;
            currentStats.messageCount = newMessageCount;
            currentStats.goodStrikes = Number(currentStats.goodStrikes || 0) + battleStats.goodStrikes;
            currentStats.toxicStrikes = Number(currentStats.toxicStrikes || 0) + battleStats.toxicStrikes;
            currentStats.totalDamageDealt = Number(currentStats.totalDamageDealt || 0) + battleStats.myDamage;
            currentStats.totalDamageTaken = Number(currentStats.totalDamageTaken || 0) + battleStats.opponentDamage;
            currentStats.avgWit = weightedAverage(Number(currentStats.avgWit || 0), battleStats.avgWit);
            currentStats.avgRelevance = weightedAverage(Number(currentStats.avgRelevance || 0), battleStats.avgRelevance);
            currentStats.avgToxicity = weightedAverage(Number(currentStats.avgToxicity || 0), battleStats.avgToxicity);

            const xpGain = this.computeXpGain(outcome, battleStats);
            const nextXp = Math.max(0, Number(user.xp || 0) + xpGain);
            const nextLevel = Math.max(1, Math.floor(nextXp / 220) + 1);

            const record = {
                id: `hist_${randomUUID().slice(0, 8)}`,
                battleId: battle.id,
                topic: battle.topic,
                winner: outcome,
                finishedAt: result.finishedAt,
                opponent: {
                    id: String(opponentUser.id || ''),
                    name: opponentUser.displayName || opponentUser.name || 'Unknown',
                    level: Number.isFinite(Number(opponentUser.level)) ? Number(opponentUser.level) : 1
                },
                stats: {
                    myDamage: battleStats.myDamage,
                    opponentDamage: battleStats.opponentDamage,
                    messageCount: battleStats.messageCount,
                    goodStrikes: battleStats.goodStrikes,
                    toxicStrikes: battleStats.toxicStrikes
                },
                meta: {
                    durationSec: Math.max(1, Math.round(result.durationMs / 1000)),
                    endReason: result.endReason
                }
            };

            user.records = Array.isArray(user.records) ? user.records : [];
            user.records.unshift(record);
            user.records = user.records.slice(0, 50);
            user.stats = currentStats;
            user.xp = nextXp;
            user.level = nextLevel;
            user.lastActiveAt = result.finishedAt;
            user.markModified('stats');

            await user.save();
        }

        logger.info({ battleId: battle.id }, 'Battle persisted to records and user aggregates');
    }
}

module.exports = new BattleService();
