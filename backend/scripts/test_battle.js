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
        console.log("Getting tokens for FighterA and FighterB...");
        const tA = await getToken("FighterA", "fighter_a@test.com");
        const tB = await getToken("FighterB", "fighter_b@test.com");

        const sA = io(URL, { auth: { token: tA }, transports: ['websocket'] });
        const sB = io(URL, { auth: { token: tB }, transports: ['websocket'] });

        await Promise.all([new Promise(r => sA.on('connect', r)), new Promise(r => sB.on('connect', r))]);

        sA.emit('go-online');
        sB.emit('go-online');

        console.log("Joining queue...");
        sA.emit('join-queue');
        sB.emit('join-queue');

        let battleId;

        await new Promise(resolve => {
            sA.on('battle-start', (data) => {
                battleId = data.id || data.battleId;
                console.log("✅ Battle Started:", battleId);
                resolve();
            });
        });

        // 1. Send Neutral Message
        console.log("Sending neutral message...");
        sA.emit('send-message', { battleId, text: "This is a neutral message" });

        await new Promise(resolve => {
            sA.once('battle-message', (msg) => {
                console.log("✅ Received neutral message:", msg.analysis.strikeType);
                if (msg.analysis.strikeType !== 'neutral') console.warn("Expected neutral!");
                resolve();
            });
        });

        // 2. Send Good Message (Rate Limit Wait: 3.5s)
        console.log("Waiting 3.5s for cooldown...");
        await new Promise(r => setTimeout(r, 3500));

        console.log("Sending good witty message...");
        sA.emit('send-message', { battleId, text: "This is a good wit message" });

        await new Promise(resolve => {
            sA.once('battle-message', (msg) => {
                console.log("✅ Received good message:", msg.analysis.strikeType, "Damage:", msg.analysis.damage);
                if (msg.analysis.strikeType !== 'good') console.warn("Expected good strike!");
                resolve();
            });
        });

        // 3. Send Toxic Message (Rate Limit Wait: 3.5s)
        console.log("Waiting 3.5s for cooldown...");
        await new Promise(r => setTimeout(r, 3500));

        console.log("Sending toxic message...");
        sA.emit('send-message', { battleId, text: "This is a toxic message" });

        await new Promise(resolve => {
            sA.once('battle-message', (msg) => {
                console.log("✅ Received toxic message:", msg.analysis.strikeType, "Damage (Self):", msg.analysis.damage);
                if (msg.analysis.strikeType !== 'toxic') console.warn("Expected toxic!");
                resolve();
            });
        });

        console.log("🎉 Battle Engine verification passed!");
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
