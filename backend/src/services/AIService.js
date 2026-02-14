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

    /**
     * Retry wrapper — retries API call up to maxRetries times on empty responses.
     */
    async callWithRetry(apiCallFn, maxRetries = 2) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const response = await apiCallFn();
            const content = response.choices?.[0]?.message?.content;
            if (content && content.trim()) return content.trim();
            if (attempt < maxRetries) {
                logger.warn({ attempt: attempt + 1 }, 'Empty AI response, retrying...');
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        return null;
    }

    async analyzeMessage(message, topic, context = []) {
        try {
            const formattedContext = context.map(m =>
                `${m.role === 'user' ? 'Current Player' : 'Opponent'}: ${m.content}`
            ).join('\n');

            const finalPrompt = `
Context of debate:
${formattedContext}

Current Message to Judge:
"${message}"

Respond with JSON scores.
`;

            const content = await this.callWithRetry(() =>
                this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: `You are an impartial judge scoring a live 1v1 debate battle on the topic: "${topic}".

Analyze the message based on its actual content, argument quality, and debate context. Score on three dimensions (0-100 each):

- wit: How clever, funny, creative, or rhetorically sharp is this message? Generic or low-effort messages score low.
- relevance: How directly does this message engage with the debate topic "${topic}"? Off-topic ranting scores low.
- toxicity: How toxic, offensive, or personally attacking is this message? Clean debate scores 0-15.

Be honest and discriminating. Not every message deserves high scores.

Respond with ONLY valid JSON: {"wit": N, "relevance": N, "toxicity": N}`
                        },
                        { role: 'user', content: finalPrompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 100
                })
            );

            if (!content) {
                logger.warn('AI analysis empty after retries');
                return { wit: 50, relevance: 50, toxicity: 0 };
            }

            const scores = this.extractJSON(content);
            if (!scores) {
                logger.warn({ raw: content.slice(0, 200) }, 'Failed to parse AI analysis JSON');
                return { wit: 50, relevance: 50, toxicity: 0 };
            }

            return {
                wit: this.clampPercent(scores.wit),
                relevance: this.clampPercent(scores.relevance),
                toxicity: this.clampPercent(scores.toxicity)
            };

        } catch (err) {
            logger.error({ err: err.message || err }, 'AI Analysis failed');
            return { wit: 50, relevance: 50, toxicity: 0 };
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

            const content = await this.callWithRetry(() =>
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
                    max_tokens: 200
                })
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
