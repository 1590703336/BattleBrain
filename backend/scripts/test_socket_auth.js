const { io } = require("socket.io-client");
const http = require('http');

const URL = "http://localhost:3000";

// 1. Get a token first (signup a temp user)
const email = `socket_test_${Date.now()}@test.com`;
const postData = JSON.stringify({
    email,
    password: "password123",
    displayName: "SocketTester"
});

const req = http.request(`${URL}/api/auth/signup`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        if (res.statusCode !== 201) {
            console.error("Signup failed:", data);
            process.exit(1);
        }
        const { token } = JSON.parse(data);
        console.log("Got token:", token.substring(0, 20) + "...");

        runSocketTests(token);
    });
});

req.write(postData);
req.end();

function runSocketTests(token) {
    let passed = 0;

    // Test 1: No token
    const s1 = io(URL, { autoConnect: false, transports: ['websocket'] });
    s1.on("connect_error", (err) => {
        if (err.message === "auth_token_missing") {
            console.log("✅ Test 1 Passed: Rejected missing token");
            passed++;
            s1.close();
            checkDone();
        } else {
            console.error("❌ Test 1 Failed: Wrong error", err.message);
        }
    });
    s1.connect();

    // Test 2: Invalid token
    const s2 = io(URL, {
        auth: { token: "invalid.token.here" },
        autoConnect: false,
        transports: ['websocket']
    });
    s2.on("connect_error", (err) => {
        if (err.message === "auth_invalid_token") {
            console.log("✅ Test 2 Passed: Rejected invalid token");
            passed++;
            s2.close();
            checkDone();
        } else {
            console.error("❌ Test 2 Failed: Wrong error", err.message);
        }
    });
    s2.connect();

    // Test 3: Valid token
    const s3 = io(URL, {
        auth: { token },
        autoConnect: false,
        transports: ['websocket']
    });
    s3.on("connect", () => {
        console.log("✅ Test 3 Passed: Connected with valid token");
        passed++;
        s3.close();
        checkDone();
    });
    s3.on("connect_error", (err) => {
        console.error("❌ Test 3 Failed:", err.message);
    });
    s3.connect();

    function checkDone() {
        if (passed === 3) {
            console.log("🎉 All Socket Auth tests passed!");
            process.exit(0);
        }
    }
}
