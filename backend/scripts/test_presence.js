const { io } = require("socket.io-client");
const http = require('http');

const URL = "http://localhost:3000";

async function getToken(name, email) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            email,
            password: "password123",
            displayName: name
        });

        const req = http.request(`${URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                if (res.statusCode === 201) resolve(JSON.parse(data));
                else if (res.statusCode === 409) {
                    // Login if exists
                    const loginReq = http.request(`${URL}/api/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Content-Length': JSON.stringify({ email, password: "password123" }).length }
                    }, (lRes) => {
                        let lData = '';
                        lRes.on('data', c => lData += c);
                        lRes.on('end', () => resolve(JSON.parse(lData)));
                    });
                    loginReq.write(JSON.stringify({ email, password: "password123" }));
                    loginReq.end();
                }
                else reject(data);
            });
        });
        req.write(postData);
        req.end();
    });
}

(async () => {
    try {
        const userA = await getToken("Alice", "alice@test.com");
        const userB = await getToken("Bob", "bob@test.com");

        console.log("Got tokens for Alice and Bob");

        // Connect Bob first so he can listen
        const socketB = io(URL, { auth: { token: userB.token }, transports: ['websocket'] });

        await new Promise(r => socketB.on('connect', r));
        console.log("Bob connected");

        // Bob listens for events
        let onlineReceived = false;
        let offlineReceived = false;

        socketB.on('user-online', (data) => {
            if (data.id === userA.user.id) {
                console.log("✅ Bob received Alice online");
                onlineReceived = true;
            }
        });

        socketB.on('user-offline', (data) => {
            if (data.id === userA.user.id) {
                console.log("✅ Bob received Alice offline");
                offlineReceived = true;

                if (onlineReceived && offlineReceived) {
                    console.log("🎉 Presence tests passed!");
                    process.exit(0);
                }
            }
        });

        // Connect Alice
        const socketA = io(URL, { auth: { token: userA.user.token || userA.token }, transports: ['websocket'] });
        await new Promise(r => socketA.on('connect', r));
        console.log("Alice connected");

        // Alice goes online
        socketA.emit('go-online');

        // Wait a bit then disconnect Alice
        setTimeout(() => {
            console.log("Disconnecting Alice...");
            socketA.disconnect();
        }, 1000);

    } catch (err) {
        console.error("Test failed:", err);
        process.exit(1);
    }
})();
