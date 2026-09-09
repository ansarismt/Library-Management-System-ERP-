const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.API_RATE_LIMIT_MAX = "2";

const { request, startTestServer } = require("./helpers/http.cjs");

let server;
before(async () => { server = await startTestServer(); });
after(async () => server.close());

test("general API throttle does not apply to health", async () => {
  const healthBefore = await request(server.baseUrl, "/api/v1/health");
  const first = await request(server.baseUrl, "/api/v1/unknown");
  const second = await request(server.baseUrl, "/api/v1/unknown");
  const limited = await request(server.baseUrl, "/api/v1/unknown");
  const healthAfter = await request(server.baseUrl, "/api/v1/health");

  assert.equal(healthBefore.status, 200);
  assert.equal(first.status, 404);
  assert.equal(second.status, 404);
  assert.equal(limited.status, 429);
  assert.equal(limited.body.success, false);
  assert.ok(limited.rateLimit);
  assert.ok(Number(limited.retryAfter) > 0);
  assert.equal(healthAfter.status, 200);
});
