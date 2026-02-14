const OpenAI = require('openai');
const config = require('../config/env');
const logger = require('../utils/logger');

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
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: `You are an AI battle opponent in a fast live debate.
${personaPrompt}
Rules:
- Keep it witty and on-topic.
- Do not use slurs, hate, threats, or personal abuse.
- Write one compact reply, max 220 characters.
- Output plain text only.`
                    },
                    ...context.slice(-8).map((entry) => ({
                        role: entry.role === 'assistant' ? 'assistant' : 'user',
                        content: String(entry.content || '')
                    })),
                    {
                        role: 'user',
                        content: `Topic: "${topic}"\nOpponent just said: "${currentMessage || ''}"\nReply as ${botName}.`
                    }
                ],
                temperature: 0.9,
                max_tokens: 120
            });

            const content = response.choices?.[0]?.message?.content;
            const text = typeof content === 'string' ? content.trim() : '';
            return text.slice(0, 220);
        } catch (err) {
            logger.warn({ err, botName }, 'AI bot reply generation failed');
            return '';
        }
    }
}

module.exports = new AIService();
