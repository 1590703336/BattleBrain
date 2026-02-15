const OpenAI = require('openai');
const config = require('../config/env');
const logger = require('../utils/logger');
const { TOPICS } = require('../config/constants');
const TOPICS_LIST = require('../config/topics');

class AIService {
    constructor() {
        this.client = new OpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: config.openRouterApiKey
        });

        this.model = 'gpt-oss-120b';
    }

    clampPercent(value) {
        const num = Number(value);
        if (!Number.isFinite(num)) {
            return 0;
        }
        return Math.max(0, Math.min(100, Math.round(num)));
    }

    containsHardProfanity(text = '') {
        return /\bfuck\b/i.test(String(text));
    }

    hasAuthenticUniqueAngle(text = '') {
        const content = String(text || '').trim();
        if (!content || content.length < 8) return false;

        const firstPerson = /\b(i|i'm|i've|i'd|my|me|myself|as a|when i)\b|我|我的|我在|我曾|亲身|作为/i;
        const reasoning = /\b(because|since|therefore|so that|which means|that's why)\b|因为|所以|因此|导致|说明/i;
        const concreteDetail = /\d|%|\b(today|yesterday|last|this|week|month|year)\b|今天|昨天|去年|今年|刚刚|分钟|小时|天|周|月|年|块|元|次/i;
        const specificity = /\b(for example|specifically|unlike|counterexample)\b|比如|例如|具体|反例|相反/i;

        const hasPerspective = firstPerson.test(content);
        const hasReason = reasoning.test(content);
        const hasConcrete = concreteDetail.test(content) || specificity.test(content);
        return hasPerspective && (hasReason || hasConcrete);
    }

    calibrateAnalysisScores(rawScores, message = '') {
        let wit = this.clampPercent(rawScores.wit);
        let relevance = this.clampPercent(rawScores.relevance);
        let toxicity = this.clampPercent(rawScores.toxicity);

        const text = String(message || '').trim();
        const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
        const hasAuthenticAngle = this.hasAuthenticUniqueAngle(text);

        if (!hasAuthenticAngle && (text.length <= 10 || wordCount <= 2)) {
            wit = Math.min(wit, 32);
            relevance = Math.min(relevance, 45);
        }

        const genericLowEffort = /^(lol|lmao|haha+|ok+|sure+|whatever+|you'?re wrong|nope+|nah+|bruh+)[.!? ]*$/i;
        if (genericLowEffort.test(text)) {
            wit = Math.min(wit, 22);
            relevance = Math.min(relevance, 28);
        }

        if (hasAuthenticAngle) {
            // Reward concise but concrete real-world framing.
            wit = Math.max(wit, 78);
        }

        if (this.containsHardProfanity(text)) {
            toxicity = 100;
        }

        return { wit, relevance, toxicity };
    }

    /**
     * Extract JSON from a response that may contain markdown fences or extra text.
     */
    extractJSON(text) {
        try { return JSON.parse(text); } catch { }

        const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenced) {
            try { return JSON.parse(fenced[1].trim()); } catch { }
        }

        const braceMatch = text.match(/\{[\s\S]*\}/);
        if (braceMatch) {
            try { return JSON.parse(braceMatch[0]); } catch { }
        }

        return null;
    }

    normalizeContent(content) {
        if (typeof content === 'string') {
            return content.trim();
        }

        if (content && typeof content === 'object' && !Array.isArray(content) && typeof content.text === 'string') {
            return content.text.trim();
        }

        if (!Array.isArray(content)) {
            return '';
        }

        const normalized = content
            .map((part) => {
                if (typeof part === 'string') {
                    return part;
                }

                if (!part || typeof part !== 'object') {
                    return '';
                }

                if (typeof part.text === 'string') {
                    return part.text;
                }

                return '';
            })
            .join('\n')
            .trim();

        return normalized;
    }

    buildResponseDebugInfo(response) {
        const choice = response?.choices?.[0];
        const message = choice?.message || {};
        const content = message.content;
        const contentType = Array.isArray(content) ? 'array' : typeof content;
        const normalized = this.normalizeContent(content);

        return {
            responseId: response?.id || null,
            model: response?.model || null,
            finishReason: choice?.finish_reason || null,
            contentType,
            contentParts: Array.isArray(content)
                ? content.map((part) => {
                    if (typeof part === 'string') return 'string';
                    if (!part || typeof part !== 'object') return typeof part;
                    return part.type || 'object';
                })
                : null,
            contentLength: normalized.length,
            hasToolCalls: Array.isArray(message.tool_calls) && message.tool_calls.length > 0,
            refusal: typeof message.refusal === 'string' ? message.refusal.slice(0, 200) : null,
            usage: response?.usage || null
        };
    }

    /**
     * Retry wrapper — retries API call up to maxRetries times on empty responses.
     */
    async callWithRetry(apiCallFn, maxRetries = 2, context = {}) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const response = await apiCallFn();
            const content = this.normalizeContent(response?.choices?.[0]?.message?.content);
            if (content) return content;

            const debugInfo = this.buildResponseDebugInfo(response);
            if (attempt < maxRetries) {
                logger.warn({ attempt: attempt + 1, ...context, ...debugInfo }, 'Empty AI response, retrying...');
                await new Promise(r => setTimeout(r, 2000));
            } else {
                logger.warn({ ...context, ...debugInfo }, 'Empty AI response after retries');
            }
        }
        return null;
    }

    async analyzeMessage(message, topic) {
        try {
            const trimmedMessage = String(message || '').trim();
            if (this.containsHardProfanity(trimmedMessage)) {
                return {
                    wit: this.hasAuthenticUniqueAngle(trimmedMessage) ? 78 : 35,
                    relevance: 50,
                    toxicity: 100
                };
            }

            const finalPrompt = `
Topic:
"${topic}"

Current Message to Judge (score this message only):
"${trimmedMessage}"

Respond with JSON scores.
`;

            const content = await this.callWithRetry(
                () =>
                this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: `You are a strict, impartial judge scoring one standalone debate message.
Only use this topic and this one message. Do not infer from any unseen context.
Topic: "${topic}".

Score on three dimensions (0-100 each):
- wit: cleverness, originality, rhetorical sharpness. If a short line has a special and authentic real-world angle, still give high wit.
- relevance: directness and precision to this topic.
- toxicity: personal attacks, offensiveness, abusive language.

Rules:
- Avoid score inflation; weak/generic lines should score low.
- Return ONLY valid JSON with integer scores.
- JSON format: {"wit": N, "relevance": N, "toxicity": N}`
                        },
                        { role: 'user', content: finalPrompt }
                    ],
                    temperature: 0.1,
                    max_tokens: 220
                }),
                2,
                { operation: 'analyzeMessage' }
            );

            if (!content) {
                logger.warn('AI analysis empty after retries');
                return { wit: 28, relevance: 35, toxicity: 8 };
            }

            const scores = this.extractJSON(content);
            if (!scores) {
                logger.warn({ raw: content.slice(0, 200) }, 'Failed to parse AI analysis JSON');
                return { wit: 28, relevance: 35, toxicity: 8 };
            }

            return this.calibrateAnalysisScores(scores, trimmedMessage);

        } catch (err) {
            logger.error({ err: err.message || err }, 'AI Analysis failed');
            return { wit: 28, relevance: 35, toxicity: 8 };
        }
    }

    async generateBotReply({ topic, botName, personaPrompt, currentMessage, context = [], battleState = {} }) {
        try {
            const myHp = battleState.myHp ?? '?';
            const opponentHp = battleState.opponentHp ?? '?';
            const turnNumber = battleState.turnNumber ?? context.length;
            const hpContext = `Your HP: ${myHp}/100. Opponent HP: ${opponentHp}/100. Turn: ${turnNumber}.`;

            let toneGuidance = '';
            if (typeof myHp === 'number' && typeof opponentHp === 'number') {
                if (myHp < opponentHp - 20) {
                    toneGuidance = 'You are losing badly. Go full attack mode — find their weakest logic and rip it apart.';
                } else if (myHp > opponentHp + 20) {
                    toneGuidance = 'You are dominating. Stay cocky but clever — toy with their argument.';
                } else {
                    toneGuidance = 'Dead even. This reply decides the momentum — make it count.';
                }
            }

            // Anti-repetition: extract previous bot replies
            const previousBotReplies = context
                .filter((entry) => entry.role === 'assistant')
                .slice(-3)
                .map((entry) => String(entry.content || '').trim())
                .filter(Boolean);

            const antiRepeatBlock = previousBotReplies.length > 0
                ? `\nYour previous replies (DO NOT repeat these):\n${previousBotReplies.map((r, i) => `${i + 1}. "${r}"`).join('\n')}`
                : '';

            // Randomized style seed for variety
            const styleSeeds = [
                'Use biting sarcasm.',
                'Hit them with an unexpected analogy.',
                'Ask a rhetorical question they cannot answer.',
                'Use dark humor to expose absurdity.',
                'Flip their own words against them.',
                'Play it deadpan calm, then drop one devastating line.',
                'Use an absurd comparison.',
                'Respond with fake sympathy for their weak logic.',
                'Attack with rapid-fire short punches.',
                'Narrate their failure like a commentator.',
            ];
            const styleSeed = styleSeeds[Math.floor(Math.random() * styleSeeds.length)];

            const systemPrompt = `You are ${botName}, a real person in a live 1v1 debate about "${topic}".
${personaPrompt}

Rules:
- Write like a real person: use contractions, casual phrasing, slang.
- NEVER sound robotic. No "Well," "Actually," "Let me explain," etc.
- React to their SPECIFIC words, not the topic generally.
- 1-2 sentences, under 220 characters. Every word earns its spot.
- Be unpredictable. Vary structure wildly between turns.
- No slurs or hate speech. Savage wit and trash talk encouraged.
- Style this turn: ${styleSeed}
- Battle state: ${toneGuidance}
${antiRepeatBlock}

Respond with ONLY your debate reply as plain text. No JSON, no quotes, no labels. Just your reply.`;

            const content = await this.callWithRetry(
                () =>
                this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...context.slice(-8).map((entry) => ({
                            role: entry.role === 'assistant' ? 'assistant' : 'user',
                            content: String(entry.content || '')
                        })),
                        {
                            role: 'user',
                            content: `${hpContext}\nThey said: "${currentMessage || '(nothing yet)'}"\nDestroy their argument. Style: ${styleSeed}`
                        }
                    ],
                    temperature: 1.0,
                    top_p: 0.92,
                    max_tokens: 1000
                }),
                2,
                { operation: 'generateBotReply', botName }
            );

            if (!content) {
                logger.warn({ botName }, 'AI empty after retries');
                return '';
            }

            let reply = content.trim();

            // If model returned JSON despite instructions, extract the reply
            if (reply.startsWith('{')) {
                try {
                    const parsed = JSON.parse(reply);
                    reply = String(parsed.aiReply || parsed.reply || parsed.response || parsed.text || reply);
                } catch { }
            }

            // Strip markdown fences and wrapping quotes
            reply = reply.replace(/^```[\s\S]*?\n([\s\S]*?)```$/m, '$1').trim();
            reply = reply.replace(/^["']|["']$/g, '');

            logger.info({ botName, styleSeed, replyLength: reply.length }, 'AI Bot Reply Generated');
            return reply.slice(0, 220);

        } catch (err) {
            logger.warn({ err: err.message || err, botName }, 'AI bot reply generation failed');
            return '';
        }
    }

    async generateDebateAssistReply({
        topic,
        myRole,
        opponentRole,
        draft = '',
        lastOpponentMessage = '',
        context = [],
        battleState = {}
    }) {
        try {
            const myHp = battleState.myHp ?? '?';
            const opponentHp = battleState.opponentHp ?? '?';
            const turnNumber = battleState.turnNumber ?? context.length;
            const timeline = context
                .slice(-10)
                .map((entry) => `${entry.speaker === 'you' ? 'You' : 'Opponent'}: ${String(entry.content || '')}`)
                .join('\n');

            const content = await this.callWithRetry(
                () =>
                    this.client.chat.completions.create({
                        model: this.model,
                        messages: [
                            {
                                role: 'system',
                                content: `You are a live debate copilot helping a user win a 1v1 debate.
Topic: "${topic}".
User stance: "${myRole}".
Opponent stance: "${opponentRole}".

Rules:
- Output exactly one reply the user can send right now.
- Keep it under 220 characters.
- 1-2 short sentences, sharp and specific.
- Directly rebut the opponent's latest point if available.
- No slurs, hate speech, or threats.
- No markdown, no labels, no quotes around the final answer.`
                            },
                            {
                                role: 'user',
                                content: `Battle state: You HP ${myHp}/100, Opponent HP ${opponentHp}/100, Turn ${turnNumber}.
Opponent latest message: "${lastOpponentMessage || '(none yet)'}"
Your current draft (optional): "${draft || '(empty)'}"

Recent timeline:
${timeline || '(no prior messages)'}

Generate one stronger answer I can send now.`
                            }
                        ],
                        temperature: 0.8,
                        top_p: 0.9,
                        max_tokens: 1000
                    }),
                2,
                { operation: 'generateDebateAssistReply' }
            );

            if (!content) {
                return '';
            }

            let reply = String(content).trim();
            reply = reply.replace(/^```[\s\S]*?\n([\s\S]*?)```$/m, '$1').trim();
            reply = reply.replace(/^["']|["']$/g, '');
            return reply.slice(0, 220);
        } catch (err) {
            logger.warn({ err: err.message || err }, 'Debate assist generation failed');
            return '';
        }
    }

    async generateBattleTopic({ playerA = 'Player A', playerB = 'Player B' } = {}) {
        try {
            const selection = TOPICS_LIST[Math.floor(Math.random() * TOPICS_LIST.length)];
            return {
                topic: selection.topic,
                roles: {
                    [playerA]: selection.roles[0],
                    player1Role: selection.roles[0],
                    player2Role: selection.roles[1]
                }
            };
        } catch (err) {
            logger.warn({ err }, 'Topic selection failed, using fallback');
            return {
                topic: 'Pineapple belongs on pizza',
                roles: { player1Role: 'Pro', player2Role: 'Con' }
            };
        }
    }
}

module.exports = new AIService();
