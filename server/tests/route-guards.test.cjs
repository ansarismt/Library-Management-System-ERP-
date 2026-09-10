const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.API_RATE_LIMIT_MAX = "100";

const { generateAccessToken } = require("../dist/utils/jwt.js");
const { request, startTestServer } = require("./helpers/http.cjs");

let server;
let studentToken;
let librarianToken;

before(async () => {
  server = await startTestServer();
  studentToken = generateAccessToken({ userId: "507f1f77bcf86cd799439011", role: "STUDENT" });
  librarianToken = generateAccessToken({ userId: "507f1f77bcf86cd799439012", role: "LIBRARIAN" });
});
after(async () => server.close());

const bearer = (token) => ({ authorization: `Bearer ${token}` });

test("protected resource, reporting, dashboard, and audit routes enforce permissions", async () => {
  const paths = [
    "/api/v1/users",
    "/api/v1/book-copies",
    "/api/v1/members",
    "/api/v1/reports/summary",
    "/api/v1/dashboard/summary",
    "/api/v1/audit-logs",
  ];

  for (const path of paths) {
    const response = await request(server.baseUrl, path, { headers: bearer(studentToken) });
    assert.equal(response.status, 403, path);
    assert.equal(response.body.success, false, path);
  }
});

test("circulation, fine, and reservation routes reject invalid identifiers before persistence", async () => {
  const cases = [
    ["/api/v1/issues/not-an-object-id", librarianToken],
    ["/api/v1/fines/not-an-object-id", librarianToken],
    ["/api/v1/reservations/not-an-object-id", librarianToken],
  ];

  for (const [path, token] of cases) {
    const response = await request(server.baseUrl, path, { headers: bearer(token) });
    assert.equal(response.status, 400, path);
    assert.equal(response.body.success, false, path);
    assert.equal(response.body.message, "Validation failed", path);
  }
});
