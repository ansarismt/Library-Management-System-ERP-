const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.API_RATE_LIMIT_MAX = "100";
process.env.SENSITIVE_RATE_LIMIT_MAX = "2";

const { generateAccessToken } = require("../dist/utils/jwt.js");
const { request, startTestServer } = require("./helpers/http.cjs");

let server;
let studentToken;
before(async () => {
  server = await startTestServer();
  studentToken = generateAccessToken({ userId: "507f1f77bcf86cd799439011", role: "STUDENT" });
});
after(async () => server.close());

test("sensitive mutations are throttled after authorization is evaluated", async () => {
  const postBook = () => request(server.baseUrl, "/api/v1/books", {
    method: "POST",
    headers: {
      authorization: `Bearer ${studentToken}`,
      "content-type": "application/json",
    },
    body: "{}",
  });

  const first = await postBook();
  const second = await postBook();
  const limited = await postBook();

  assert.equal(first.status, 403);
  assert.equal(second.status, 403);
  assert.equal(limited.status, 429);
  assert.deepEqual(limited.body, { success: false, message: "Too many requests. Please try again later." });
  assert.match(limited.rateLimit, /limit=2/);
  assert.ok(Number(limited.retryAfter) > 0);
});
