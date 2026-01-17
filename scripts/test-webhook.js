const crypto = require("crypto");
const http = require("http");

// CONFIG
const SECRET = process.env.META_APP_SECRET || "test_secret";
const URL = "http://localhost:3000/api/webhooks/meta";

// MOCK DATA
const PAYLOAD = {
  object: "ad_account",
  entry: [
    {
      id: "act_1234567890", // MOCK THIS: Need a real or mocked ID in DB to work completely
      time: 12345678,
      changes: [
        {
          field: "campaigns",
          value: {
            id: "1234567890123", // MOCK THIS: Needs to match a campaign in DB
            effective_status: "ACTIVE",
            name: "Test Campaign",
          },
        },
      ],
    },
  ],
};

const payloadString = JSON.stringify(PAYLOAD);
const signature =
  "sha256=" +
  crypto.createHmac("sha256", SECRET).update(payloadString).digest("hex");

const options = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-hub-signature-256": signature,
    "Content-Length": payloadString.length,
  },
};

console.log(`Sending webhook to ${URL}...`);
console.log(`Payload: ${payloadString}`);
console.log(`Signature: ${signature}`);

const req = http.request(URL, options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding("utf8");
  res.on("data", (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on("error", (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(payloadString);
req.end();
