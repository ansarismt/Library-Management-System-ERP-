const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.API_RATE_LIMIT_MAX = "100";
process.env.AUTH_RATE_LIMIT_MAX = "2";
process.env.REGISTRATION_RATE_LIMIT_MAX = "2";
process.env.REFRESH_RATE_LIMIT_MAX = "2";

const { request, startTestServer } = require("./helpers/http.cjs");

let server;
before(async () => { server = await startTestServer(); });
after(async () => server.close());

const invalidJsonRequest = (path) => request(server.baseUrl, path, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});

test("login throttling preserves validation then returns a safe 429", async () => {
  const first = await invalidJsonRequest("/api/v1/auth/login");
  const second = await invalidJsonRequest("/api/v1/auth/login");
  const limited = await invalidJsonRequest("/api/v1/auth/login");

  assert.equal(first.status, 400);
  assert.equal(second.status, 400);
  assert.equal(limited.status, 429);
  assert.deepEqual(limited.body, { success: false, message: "Too many requests. Please try again later." });
  assert.match(limited.rateLimit, /limit=2/);
  assert.ok(Number(limited.retryAfter) > 0);
});

test("registration throttling returns 429 without exposing request data", async () => {
  await invalidJsonRequest("/api/v1/auth/register");
  await invalidJsonRequest("/api/v1/auth/register");
  const limited = await invalidJsonRequest("/api/v1/auth/register");

  assert.equal(limited.status, 429);
  assert.equal(limited.body.success, false);
  assert.match(limited.rateLimit, /limit=2/);
  assert.ok(Number(limited.retryAfter) > 0);
});

test("refresh throttling preserves missing-cookie 401 behavior", async () => {
  const first = await request(server.baseUrl, "/api/v1/auth/refresh", { method: "POST" });
  const second = await request(server.baseUrl, "/api/v1/auth/refresh", { method: "POST" });
  const limited = await request(server.baseUrl, "/api/v1/auth/refresh", { method: "POST" });

  assert.equal(first.status, 401);
  assert.equal(second.status, 401);
  assert.equal(limited.status, 429);
  assert.ok(limited.rateLimit);
  assert.ok(Number(limited.retryAfter) > 0);
});
