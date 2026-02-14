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
                        content: `You are an impartial judge scoring a live 1v1 debate battle on the topic: "${topic}".

Analyze the message based on its actual content, argument quality, and debate context. Score on three dimensions (0-100 each):

- wit: How clever, funny, creative, or rhetorically sharp is this message? Consider humor, wordplay, analogies, and originality. Generic or low-effort messages score low. Genuinely creative attacks or defenses score high.
- relevance: How directly does this message engage with the debate topic "${topic}"? Off-topic ranting scores low. Messages that build a specific argument connected to the topic score high. Also consider logical strength — does the argument hold up?
- toxicity: How toxic, offensive, or personally attacking is this message? Clean debate scores 0-15. Light trash talk scores 15-40. Genuine insults, slurs, or hate speech scores 60-100.

Be honest and discriminating. Not every message deserves high scores. A vague "you're wrong" is low wit and low relevance. A sharp, topic-specific counter-argument is high on both.

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

    async generateBotReply({ topic, botName, personaPrompt, currentMessage, context = [], battleState = {} }) {
        try {
            // Build HP context so the AI can adapt tone based on who's winning
            const myHp = battleState.myHp ?? '?';
            const opponentHp = battleState.opponentHp ?? '?';
            const turnNumber = battleState.turnNumber ?? context.length;
            const hpContext = `Your HP: ${myHp}/100. Opponent HP: ${opponentHp}/100. Turn: ${turnNumber}.`;

            let toneGuidance = '';
            if (typeof myHp === 'number' && typeof opponentHp === 'number') {
                if (myHp < opponentHp - 20) {
                    toneGuidance = 'You are losing. Be more aggressive and sharp — find the flaw in their argument and exploit it hard.';
                } else if (myHp > opponentHp + 20) {
                    toneGuidance = 'You are winning. Stay confident but do not coast — keep pressure on their weakest point.';
                } else {
                    toneGuidance = 'The match is close. Every line counts — make this one land with precision.';
                }
            }

            const systemPrompt = `
You are ${botName}, the AI debate assistant inside BattleBrain.
Your job:
- Generate creative, context-aware, and dynamic debate replies.
- Always respect the debate topic: "${topic}".
- Score the user message for wit, relevance, toxicity, and calculate damage.
- Flag off-topic or inappropriate messages (sexual, violent, slurs) and assign damage to the sender.
- Avoid repeating previous AI responses.
- Adapt tone, style, and creativity to the flow of the battle.

Persona: ${personaPrompt}
Tone Guidance: ${toneGuidance}

Output JSON ONLY in this format:
{
  "aiReply": "string (plain text, max 220 chars, NO quotes)",
  "wit": number (0-100 score of opponent),
  "relevance": number (0-100 score of opponent),
  "toxicity": number (0-100 score of opponent),
  "damage": number (0-100 calculated damage to opponent),
  "strikeType": "good" | "toxic" | "neutral",
  "flagged": boolean,
  "reasoning": "string (brief chain of thought about why you chose this reply)"
}
`;

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...context.slice(-8).map((entry) => ({
                        role: entry.role === 'assistant' ? 'assistant' : 'user',
                        content: String(entry.content || '')
                    })),
                    {
                        role: 'user',
                        content: `HP context: ${hpContext}\nOpponent just said: "${currentMessage}"\nRespond now. Attack their specific argument about "${topic}".`
                    }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.9,
                top_p: 0.95,
                max_tokens: 450
            });

            const content = response.choices?.[0]?.message?.content;
            if (!content) return '';

            const result = JSON.parse(content);

            // Log the AI's "internal thoughts" for debugging
            logger.info({
                botName,
                reasoning: result.reasoning,
                scores: { wit: result.wit, relevance: result.relevance, toxicity: result.toxicity }
            }, 'AI Bot Reply Generated');

            return String(result.aiReply || '').trim();

        } catch (err) {
            logger.warn({ err, botName }, 'AI bot reply generation failed');
            return '';
        }
    }

    async generateBattleTopic({ playerA = 'Player A', playerB = 'Player B' } = {}) {
        try {
            // Hardcoded topics take precedence for fair role assignment
            const selection = TOPICS_LIST[Math.floor(Math.random() * TOPICS_LIST.length)];
            return {
                topic: selection.topic,
                roles: {
                    [playerA]: selection.roles[0], // temporary key until we map IDs
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
