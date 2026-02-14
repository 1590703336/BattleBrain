const OpenAI = require('openai');
const config = require('../config/env');
const logger = require('../utils/logger');
const { TOPICS } = require('../config/constants');

class AIService {
    constructor() {
        this.client = new OpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: config.openRouterApiKey
        });

        this.model = 'gpt-oss-120b'; // Free/Liquid model
    }

    clampPercent(value) {
        const num = Number(value);
        if (!Number.isFinite(num)) {
            return 0;
        }
        return Math.max(0, Math.min(100, Math.round(num)));
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

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: `You are judging a debate battle on the topic: "${topic}".
Score this message on three dimensions (0-100 each):
- wit: How clever, funny or creative is this message?
- relevance: How on-topic is this message to the debate?
- toxicity: How toxic, offensive, or personally attacking is this?
Respond with ONLY valid JSON integers: {"wit": N, "relevance": N, "toxicity": N}`
                    },
                    { role: 'user', content: finalPrompt }
                ],
                response_format: { type: 'json_object' }
            });

            const content = response.choices[0].message.content;
            const scores = JSON.parse(content);

            return {
                wit: this.clampPercent(scores.wit),
                relevance: this.clampPercent(scores.relevance),
                toxicity: this.clampPercent(scores.toxicity)
            };

        } catch (err) {
            logger.error({ err }, 'AI Analysis failed');
            // Fallback
            return { wit: 50, relevance: 50, toxicity: 0 };
        }
    }

    async generateBotReply({ topic, botName, personaPrompt, currentMessage, context = [] }) {
        try {
            const recentAssistantLines = context
                .filter((entry) => entry.role === 'assistant')
                .slice(-4)
                .map((entry) => String(entry.content || '').trim())
                .filter(Boolean)
                .join('\n');

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: `You are ${botName}, an aggressive 1v1 debate opponent.
${personaPrompt}
Rules:
- You MUST directly target weaknesses in the opponent's latest line.
- You MUST explicitly connect your attack to the current topic.
- Tone should be sharp, mocking, and high-pressure, but not hateful.
- Do not use slurs, protected-class hate, threats, or sexual violence.
- Avoid template intros like "Bold take", "Counterpoint loaded", "Nice swing".
- Vary wording and structure across turns.
- Write 1-2 compact sentences, max 220 characters.
- Output plain text only, no quotes, no JSON.`
                    },
                    ...context.slice(-8).map((entry) => ({
                        role: entry.role === 'assistant' ? 'assistant' : 'user',
                        content: String(entry.content || '')
                    })),
                    {
                        role: 'user',
                        content: `Topic: "${topic}".
Opponent latest message: "${currentMessage || ''}".
Recent assistant lines (avoid repeating style/openers):
${recentAssistantLines || '[none]'}

Now write a fresh aggressive rebuttal that attacks this specific message and this specific topic.`
                    }
                ],
                temperature: 1.15,
                top_p: 0.95,
                max_tokens: 140
            });

            const content = response.choices?.[0]?.message?.content;
            const text = typeof content === 'string' ? content.trim() : '';
            return text.slice(0, 220);
        } catch (err) {
            logger.warn({ err, botName }, 'AI bot reply generation failed');
            return '';
        }
    }

    async generateBattleTopic({ playerA = 'Player A', playerB = 'Player B' } = {}) {
        try {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: `Generate one short meme-style debate topic for a 1v1 battle game.
Rules:
- One line only
- Max 14 words
- No hate speech, slurs, or protected-class attacks
- Keep it playful and controversial
- Output plain text only`
                    },
                    {
                        role: 'user',
                        content: `Players: ${playerA} vs ${playerB}. Generate the topic now.`
                    }
                ],
                temperature: 1,
                max_tokens: 60
            });

            const content = response.choices?.[0]?.message?.content;
            const topic = typeof content === 'string' ? content.trim().replace(/\s+/g, ' ') : '';
            if (!topic) {
                throw new Error('empty_topic');
            }
            return topic.slice(0, 120);
        } catch (err) {
            logger.warn({ err }, 'AI topic generation failed, using fallback');
            return TOPICS[Math.floor(Math.random() * TOPICS.length)];
        }
    }
}

module.exports = new AIService();
