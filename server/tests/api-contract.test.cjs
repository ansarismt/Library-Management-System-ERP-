const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.API_RATE_LIMIT_MAX = "100";
process.env.SENSITIVE_RATE_LIMIT_MAX = "10";

const { generateAccessToken } = require("../dist/utils/jwt.js");
const { request, startTestServer } = require("./helpers/http.cjs");

let server;
let studentToken;
let adminToken;

before(async () => {
  server = await startTestServer();
  studentToken = generateAccessToken({ userId: "507f1f77bcf86cd799439011", role: "STUDENT" });
  adminToken = generateAccessToken({ userId: "507f1f77bcf86cd799439012", role: "LIBRARY_ADMIN" });
});

after(async () => server.close());

const bearer = (token) => ({ authorization: `Bearer ${token}` });

test("health is public and uses the success envelope", async () => {
  const response = await request(server.baseUrl, "/api/v1/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.status, "healthy");
});

test("authentication rejects missing and malformed access tokens", async () => {
  const missing = await request(server.baseUrl, "/api/v1/books");
  const invalid = await request(server.baseUrl, "/api/v1/books", {
    headers: { authorization: "Bearer not-a-jwt" },
  });

  assert.equal(missing.status, 401);
  assert.equal(missing.body.success, false);
  assert.equal(invalid.status, 401);
  assert.equal(invalid.body.success, false);
});

test("RBAC denies a student a book-creation permission", async () => {
  const response = await request(server.baseUrl, "/api/v1/books", {
    method: "POST",
    headers: { ...bearer(studentToken), "content-type": "application/json" },
    body: "{}",
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(response.body.errors.requiredPermission, "BOOK_CREATE");
});

test("validation rejects malformed auth, identifiers, enums, and pagination", async () => {
  const malformedLogin = await request(server.baseUrl, "/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "not-an-email", password: "short" }),
  });
  const invalidId = await request(server.baseUrl, "/api/v1/books/not-an-object-id", {
    headers: bearer(adminToken),
  });
  const invalidPagination = await request(server.baseUrl, "/api/v1/books?page=0", {
    headers: bearer(adminToken),
  });
  const invalidEnum = await request(server.baseUrl, "/api/v1/books?status=UNKNOWN", {
    headers: bearer(adminToken),
  });

  for (const response of [malformedLogin, invalidId, invalidPagination, invalidEnum]) {
    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, "Validation failed");
  }
});

test("unknown routes use the centralized 404 envelope", async () => {
  const response = await request(server.baseUrl, "/api/v1/does-not-exist");

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, {
    success: false,
    message: "Route not found: GET /api/v1/does-not-exist",
  });
});
