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

    async analyzeMessage(message, topic, context = []) {
        try {
            const messages = [
                {
                    role: 'system',
                    content: `You are judging a debate battle on the topic: "${topic}".
Score this message on three dimensions (0-10 each):
- wit: How clever, funny or creative is this message?
- relevance: How on-topic is this message to the debate?  
- toxicity: How toxic, offensive, or personally attacking is this?
Respond with ONLY valid JSON: {"wit": N, "relevance": N, "toxicity": N}`
                },
                ...context, // { role: 'user'|'opponent', content } -> need to map to 'user'/'assistant' or 'user'/'user'?
                // Context format from BattleService is { role: 'user'|'opponent', content }
                // OpenAI expects 'user', 'assistant', 'system'.
                // 'opponent' isn't valid. We should map 'opponent' to 'assistant' or just label it in content?
                // Actually, easiest is to just put it in 'user' message with prefix "Opponent said: ..." or "User said: ..."
                // But for simplicity, let's just map 'opponent' -> 'assistant'? No, that implies it's the AI speaking.
                // Let's just dump previous context into a single system message or user prompt?
                // The implementation plan prompt template didn't specify context handling detailedly.
                // Let's mapping: user -> user, opponent -> user (but maybe different name?). 
                // Actually, let's just use the current message for analysis to keep it simple and cheap for now,
                // OR format context as text in the prompt.
            ];

            // Let's refine the messages construction
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
Score this message on three dimensions (0-10 each):
- wit: How clever, funny or creative is this message?
- relevance: How on-topic is this message to the debate?  
- toxicity: How toxic, offensive, or personally attacking is this?
Respond with ONLY valid JSON: {"wit": N, "relevance": N, "toxicity": N}`
                    },
                    { role: 'user', content: finalPrompt }
                ],
                response_format: { type: 'json_object' }
            });

            const content = response.choices[0].message.content;
            const scores = JSON.parse(content);

            return {
                wit: Math.min(10, Math.max(0, scores.wit || 0)),
                relevance: Math.min(10, Math.max(0, scores.relevance || 0)),
                toxicity: Math.min(10, Math.max(0, scores.toxicity || 0))
            };

        } catch (err) {
            logger.error({ err }, 'AI Analysis failed');
            // Fallback
            return { wit: 5, relevance: 5, toxicity: 0 };
        }
    }
}

module.exports = new AIService();
