module.exports = Object.freeze({
    // Battle
    INITIAL_HP: 100,
    BATTLE_DURATION_MS: 180_000, // 3 minutes
    MAX_MESSAGE_LENGTH: 280,
    MESSAGE_COOLDOWN_MS: 3_000,  // 3 seconds between messages
    PRESENCE_TIMEOUT_MS: 60_000, // 60s without heartbeat = offline

    // Matchmaking
    BOT_MATCH_TIMEOUT_MS: 10_000, // 10s before bot fallback

    // Topics pool — random one assigned per battle
    TOPICS: [
        'Pineapple on pizza is a crime',
        'Cats are better than dogs',
        'GIF is pronounced with a hard G',
        'Cereal is a soup',
        'Hot dogs are sandwiches',
        'Water is not wet',
        'The earth is flat (debate me)',
        'Mondays should be illegal',
        'Homework should be abolished',
        'AI will replace all jobs by 2030'
    ]
});
