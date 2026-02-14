const { io } = require("socket.io-client");
const http = require('http');

const URL = "http://localhost:3000";

async function getToken(name, email) {
    return new Promise((resolve) => {
        const postData = JSON.stringify({ email, password: "password123", displayName: name });
        const req = http.request(`${URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                if (res.statusCode === 201) resolve(JSON.parse(data).token);
                else {
                    // login
                    const lReq = http.request(`${URL}/api/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Content-Length': JSON.stringify({ email, password: "password123" }).length }
                    }, (lRes) => {
                        let lData = '';
                        lRes.on('data', c => lData += c);
                        lRes.on('end', () => resolve(JSON.parse(lData).token));
                    });
                    lReq.write(JSON.stringify({ email, password: "password123" }));
                    lReq.end();
                }
            });
        });
        req.write(postData);
        req.end();
    });
}

(async () => {
    try {
        console.log("Getting tokens...");
        const tA = await getToken("SwipeAlice", "alice_swipe@test.com");
        const tB = await getToken("SwipeBob", "bob_swipe@test.com");
        const tC = await getToken("QueueCharlie", "charlie_queue@test.com");
        const tD = await getToken("QueueDave", "dave_queue@test.com");

        // --- TEST 1: SWIPE FLOW ---
        console.log("\n--- TEST 1: Swipe Match ---");
        const sA = io(URL, { auth: { token: tA }, transports: ['websocket'] });
        const sB = io(URL, { auth: { token: tB }, transports: ['websocket'] });

        await Promise.all([
            new Promise(r => sA.on('connect', r)),
            new Promise(r => sB.on('connect', r))
        ]);

        sA.emit('go-online');
        sB.emit('go-online');

        // Wait for presence
        await new Promise(r => setTimeout(r, 500));

        // Alice gets cards
        sA.emit('get-cards');
        sA.on('online-users', (cards) => {
            console.log(`Alice got ${cards.length} cards`);
            // verify bob is in cards?
        });

        // Bob swipes right on Alice (request)
        // Wait, standard flow: Alice swipes Bob -> Bob gets request -> Bob accepts

        // Need Bob's ID to swipe.
        // I can decode token or fetch profile, but simply asking for cards usually gives ID.
        // I'll cheat and assume I know ID from previous steps or just rely on the 'get-cards' response logic working implicitly?
        // No, I need the IDs. 
        // Let's use `socket.user` which matches the token.
        // Actually, getToken returns just token. I need ID.
        // Updated getToken to return object? No, too lazy.
        // I'll fetch 'get-cards' on one side to get ID of other.

        let bobId;

        sA.once('online-users', (cards) => {
            const bobCard = cards.find(c => c.displayName === "SwipeBob");
            if (bobCard) {
                bobId = bobCard.id;
                console.log("Alice found Bob:", bobId);
                sA.emit('swipe-right', { targetId: bobId });
            } else {
                console.log("Bob not found in cards (maybe already swiped or self?)");
            }
        });

        sB.on('battle-request', (req) => {
            console.log("✅ Bob received battle request from", req.from.displayName);
            sB.emit('accept-battle', { requestId: req.requestId });
        });

        let battleStarted = 0;
        const checkBattle = () => {
            battleStarted++;
            if (battleStarted === 2) console.log("✅ Both received battle-start (Swipe)");
        };

        sA.on('battle-start', checkBattle);
        sB.on('battle-start', checkBattle);


        // --- TEST 2: QUEUE FLOW ---
        console.log("\n--- TEST 2: Queue Match ---");
        const sC = io(URL, { auth: { token: tC }, transports: ['websocket'] });
        const sD = io(URL, { auth: { token: tD }, transports: ['websocket'] });

        await Promise.all([
            new Promise(r => sC.on('connect', r)),
            new Promise(r => sD.on('connect', r))
        ]);

        sC.emit('join-queue');
        sC.on('waiting', () => console.log("✅ Charlie waiting in queue"));

        setTimeout(() => {
            sD.emit('join-queue');
        }, 500);

        let queueMatched = 0;
        const checkQueue = () => {
            queueMatched++;
            if (queueMatched === 2) {
                console.log("✅ Both received battle-start (Queue)");
                console.log("🎉 Matchmaking verification passed!");
                process.exit(0);
            }
        };

        sC.on('battle-start', checkQueue);
        sD.on('battle-start', checkQueue);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
