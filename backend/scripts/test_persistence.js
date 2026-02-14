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
        console.log("Getting tokens for DBAlice and DBBob...");
        const tA = await getToken("DBAlice", "alice_db@test.com");
        const tB = await getToken("DBBob", "bob_db@test.com");

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

        // Alice disconnects immediately to trigger forfeit
        console.log("Alice disconnecting (triggers forfeit)...");
        sA.disconnect();

        // Bob should receive battle-end
        await new Promise(resolve => {
            sB.on('battle-end', (data) => {
                console.log("✅ Bob received battle-end. Reason:", data.reason, "Winner:", data.winner);
                if (data.reason !== 'forfeit') console.warn("Expected forfeit!");
                resolve();
            });
        });

        // Give persistence a moment to write to DB
        console.log("Waiting for persistence...");
        await new Promise(r => setTimeout(r, 1000));

        // Verify via API (Login valid user and check me?)
        // Or just trust logs. 
        // Let's print "Persistence check pending manual review" or assume logs were clean.
        // Actually, I can check specific user profile if I had a GET /api/users/me endpoint.
        // auth.md says POST /login returns user.
        // So I can login as Bob and see if battles array has the record.

        console.log("Checking Bob's profile for battle record...");
        const loginRes = await new Promise(resolve => {
            const req = http.request(`${URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': JSON.stringify({ email: "bob_db@test.com", password: "password123" }).length }
            }, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => resolve(JSON.parse(data)));
            });
            req.write(JSON.stringify({ email: "bob_db@test.com", password: "password123" }));
            req.end();
        });

        if (loginRes.user && loginRes.user.battles && loginRes.user.battles.length > 0) {
            console.log("✅ DB Check Passed: Bob has", loginRes.user.battles.length, "battles.");
            console.log("Last battle result:", loginRes.user.battles[loginRes.user.battles.length - 1].result);
        } else {
            console.error("❌ DB Check Failed: No battles found in Bob's profile.");
            console.log(loginRes);
            process.exit(1);
        }

        console.log("🎉 Persistence verification passed!");
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
