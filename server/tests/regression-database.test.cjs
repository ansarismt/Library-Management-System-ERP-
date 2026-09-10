const { after, afterEach, before, test } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.API_RATE_LIMIT_MAX = "1000";
process.env.SENSITIVE_RATE_LIMIT_MAX = "1000";

const { Book } = require("../dist/models/Book.js");
const { BookCopy } = require("../dist/models/BookCopy.js");
const { Member } = require("../dist/models/Member.js");
const { User } = require("../dist/models/User.js");
const { Issue } = require("../dist/models/Issue.js");
const { Fine } = require("../dist/models/Fine.js");
const { RefreshToken } = require("../dist/models/RefreshToken.js");
const crypto = require("node:crypto");
const Reservation = require("../dist/models/Reservation.js").default;
const { AuditLog } = require("../dist/models/AuditLog.js");
const { hashPassword } = require("../dist/utils/password.js");
const { generateAccessToken } = require("../dist/utils/jwt.js");
const { verifyRefreshToken } = require("../dist/utils/jwt.js");
const { issueBookService, returnBookService } = require("../dist/services/issue.service.js");
const {
  createReservationService,
  markReservationReadyService,
  fulfillReservationService,
} = require("../dist/services/reservation.service.js");
const { payFineService } = require("../dist/services/fine.service.js");
const app = require("../dist/app.js").default;

let replicaSet;
let server;
let baseUrl;

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  return {
    status: response.status,
    body: await response.json(),
    setCookie: response.headers.get("set-cookie"),
  };
};

const startServer = () => new Promise((resolve) => {
  server = app.listen(0, "127.0.0.1", () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
});

const closeServer = () => new Promise((resolve) => server.close(resolve));

const createUser = async ({ role = "LIBRARY_ADMIN", memberId, status = "ACTIVE" } = {}) => {
  const unique = new mongoose.Types.ObjectId().toString();
  return User.create({
    name: `Test ${role}`,
    email: `user-${unique}@example.test`,
    passwordHash: await hashPassword("test-only-password"),
    role,
    status,
    memberId,
  });
};

const createMember = async () => {
  const unique = new mongoose.Types.ObjectId().toString();
  return Member.create({
    memberId: `M-${unique}`,
    name: "Test Member",
    email: `member-${unique}@example.test`,
    membershipType: "STUDENT",
    status: "ACTIVE",
  });
};

const createBookWithCopy = async ({ availableCopies = 1 } = {}) => {
  const unique = new mongoose.Types.ObjectId().toString();
  const book = await Book.create({
    isbn: `ISBN-${unique}`,
    title: "Test Book",
    authors: ["Test Author"],
    totalCopies: 1,
    availableCopies,
    status: "ACTIVE",
    category: "Testing",
  });
  const copy = await BookCopy.create({
    bookId: book._id,
    accessionNumber: `ACC-${unique}`,
    status: "AVAILABLE",
    condition: "GOOD",
  });
  return { book, copy };
};

const actorFor = (user) => ({ userId: user._id.toString(), role: user.role });
const tokenFor = (user) => generateAccessToken({ userId: user._id.toString(), role: user.role });
const idOf = (value) => String(value._id ?? value.id);
const api = (method, path, token, body, extraHeaders = {}) => request(path, {
  method,
  headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}), ...extraHeaders },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const expectStatus = async (method, path, token, status = 200, body) => {
  const response = await api(method, path, token, body);
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(response.body)}`);
  return response.body;
};

before(async () => {
  replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  await mongoose.connect(replicaSet.getUri());
  await startServer();
});

afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

after(async () => {
  await closeServer();
  await mongoose.disconnect();
  await replicaSet.stop();
});

test("registration, login, refresh rotation, and login audit persist safely", async () => {
  const email = `registered-${new mongoose.Types.ObjectId()}@example.test`;
  const password = "test-only-password";
  const registration = await request("/api/v1/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Registered User", email, password }),
  });
  assert.equal(registration.status, 201);
  const stored = await User.findOne({ email }).select("+passwordHash");
  assert.ok(stored);
  assert.notEqual(stored.passwordHash, password);

  const duplicate = await request("/api/v1/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Registered User", email, password }),
  });
  assert.equal(duplicate.status, 400);

  const login = await request("/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.success, true);
  const oldCookie = login.setCookie.split(";")[0];
  assert.match(oldCookie, /^refreshToken=[A-Za-z0-9._-]+$/);
  assert.equal(await RefreshToken.countDocuments(), 1);
  const rawRefreshToken = oldCookie.substring("refreshToken=".length);
  assert.equal(verifyRefreshToken(rawRefreshToken).userId, stored._id.toString());
  assert.ok(await RefreshToken.exists({
    tokenHash: crypto.createHash("sha256").update(rawRefreshToken).digest("hex"),
    revokedAt: { $exists: false },
  }));
  const refresh = await request("/api/v1/auth/refresh", { method: "POST", headers: { cookie: oldCookie } });
  assert.equal(refresh.status, 200);
  const reused = await request("/api/v1/auth/refresh", { method: "POST", headers: { cookie: oldCookie } });
  assert.equal(reused.status, 401);

  const audit = await AuditLog.findOne({ action: "AUTH_LOGIN", success: true }).lean();
  assert.ok(audit);
  assert.equal(JSON.stringify(audit).includes("test-only-password"), false);
});

test("issue and return commit all circulation state changes", async () => {
  const librarian = await createUser();
  const member = await createMember();
  const { book, copy } = await createBookWithCopy();
  const issue = await issueBookService({
    bookId: book._id.toString(), bookCopyId: copy._id.toString(), memberId: member._id.toString(),
    issuedBy: librarian._id.toString(), dueAt: new Date(Date.now() + 86_400_000),
  });
  assert.equal(issue.status, "ISSUED");
  assert.equal((await BookCopy.findById(copy._id)).status, "ISSUED");
  assert.equal((await Book.findById(book._id)).availableCopies, 0);

  const returned = await returnBookService(issue._id.toString(), { returnedBy: librarian._id.toString() });
  assert.equal(returned.issue.status, "RETURNED");
  assert.equal((await BookCopy.findById(copy._id)).status, "AVAILABLE");
  assert.equal((await Book.findById(book._id)).availableCopies, 1);
});

test("a failed issue transaction rolls back issue, copy, and availability", async () => {
  const librarian = await createUser();
  const member = await createMember();
  const { book, copy } = await createBookWithCopy();
  const originalUpdate = Book.findOneAndUpdate;
  Book.findOneAndUpdate = () => Promise.resolve(null);
  try {
    await assert.rejects(
      issueBookService({
        bookId: book._id.toString(), bookCopyId: copy._id.toString(), memberId: member._id.toString(),
        issuedBy: librarian._id.toString(), dueAt: new Date(Date.now() + 86_400_000),
      }),
      /Book has no available copies/
    );
  } finally {
    Book.findOneAndUpdate = originalUpdate;
  }
  assert.equal(await Issue.countDocuments(), 0);
  assert.equal((await BookCopy.findById(copy._id)).status, "AVAILABLE");
  assert.equal((await Book.findById(book._id)).availableCopies, 1);
});

test("reservation queue enforces queue head and fulfillment persists its issue", async () => {
  const librarian = await createUser({ role: "LIBRARIAN" });
  const firstMember = await createMember();
  const secondMember = await createMember();
  const firstUser = await createUser({ role: "STUDENT", memberId: firstMember._id.toString() });
  const secondUser = await createUser({ role: "STUDENT", memberId: secondMember._id.toString() });
  const { book, copy } = await createBookWithCopy({ availableCopies: 0 });
  const first = await createReservationService({ bookId: book._id.toString(), memberId: firstMember._id.toString() }, actorFor(firstUser));
  const second = await createReservationService({ bookId: book._id.toString(), memberId: secondMember._id.toString() }, actorFor(secondUser));
  assert.equal(first.queuePosition, 1);
  assert.equal(second.queuePosition, 2);
  await assert.rejects(markReservationReadyService(second._id.toString(), actorFor(librarian)), /first reservation/);
  await markReservationReadyService(first._id.toString(), actorFor(librarian));
  await Book.findByIdAndUpdate(book._id, { availableCopies: 1 });
  const fulfilled = await fulfillReservationService(first._id.toString(), {
    issuedBy: librarian._id.toString(), dueAt: new Date(Date.now() + 86_400_000),
  }, actorFor(librarian));
  assert.equal(fulfilled.reservation.status, "FULFILLED");
  assert.equal((await Issue.findById(fulfilled.issue._id)).status, "ISSUED");
  assert.equal((await BookCopy.findById(copy._id)).status, "ISSUED");
});

test("fine payment is transactional and persists paid state", async () => {
  const librarian = await createUser();
  const member = await createMember();
  const { book, copy } = await createBookWithCopy();
  const issue = await Issue.create({
    bookId: book._id, bookCopyId: copy._id, memberId: member._id, issuedBy: librarian._id,
    dueAt: new Date(), status: "RETURNED",
  });
  const fine = await Fine.create({
    issueId: issue._id, memberId: member._id, bookId: book._id,
    amount: 10, paidAmount: 0, daysOverdue: 2, ratePerDay: 5, status: "UNPAID",
  });
  const paid = await payFineService(fine._id.toString(), {
    amount: 10, paymentMethod: "CASH", paidBy: librarian._id.toString(),
  });
  assert.equal(paid.status, "PAID");
  assert.equal(paid.paidAmount, 10);
  await assert.rejects(payFineService(fine._id.toString(), {
    amount: 1, paymentMethod: "CASH", paidBy: librarian._id.toString(),
  }), /already fully paid/);
});

test("database-backed RBAC permits an administrator and denies a student", async () => {
  const admin = await createUser({ role: "LIBRARY_ADMIN" });
  const student = await createUser({ role: "STUDENT" });
  const unique = new mongoose.Types.ObjectId().toString();
  const body = { isbn: `HTTP-${unique}`, title: "HTTP Book", authors: ["Author"], totalCopies: 0 };
  const post = (token) => request("/api/v1/books", {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const denied = await post(generateAccessToken({ userId: student._id.toString(), role: student.role }));
  const allowed = await post(generateAccessToken({ userId: admin._id.toString(), role: admin.role }));
  assert.equal(denied.status, 403);
  assert.equal(allowed.status, 201);
  assert.equal(await Book.countDocuments({ isbn: body.isbn }), 1);
});

test("auxiliary auth routes authenticate the current user and permissions", async () => {
  const admin = await createUser({ role: "SUPER_ADMIN" });
  const token = tokenFor(admin);
  for (const path of ["/api/v1/auth/me", "/api/v1/auth/admin-test", "/api/v1/auth/permission-test", "/api/v1/auth/book-read-test"]) {
    const body = await expectStatus("GET", path, token);
    assert.equal(body.success, true);
  }
  const logout = await request("/api/v1/auth/logout", { method: "POST" });
  assert.equal(logout.status, 200);
});

test("compact HTTP CRUD matrix covers users, books, copies, and members", async () => {
  const admin = await createUser({ role: "SUPER_ADMIN" });
  const token = tokenFor(admin);
  const unique = new mongoose.Types.ObjectId().toString();

  const user = (await expectStatus("POST", "/api/v1/users", token, 201, {
    name: "Matrix User", email: `matrix-user-${unique}@example.test`, password: "matrix-password", role: "STUDENT",
  })).data;
  const userId = idOf(user);
  await expectStatus("GET", `/api/v1/users/${userId}`, token);
  await expectStatus("GET", "/api/v1/users?page=1&limit=5&search=Matrix&status=ACTIVE&sort=name&order=asc", token);
  await expectStatus("PATCH", `/api/v1/users/${userId}`, token, 200, { department: "Testing" });
  await expectStatus("PATCH", `/api/v1/users/${userId}/role`, token, 200, { role: "MEMBER" });
  await expectStatus("DELETE", `/api/v1/users/${userId}`, token);
  assert.equal(await User.exists({ _id: userId }), null);

  const book = (await expectStatus("POST", "/api/v1/books", token, 201, {
    isbn: `MATRIX-${unique}`, title: "Matrix Book", authors: ["Matrix Author"], category: "Testing", totalCopies: 1,
  })).data;
  const bookId = idOf(book);
  await expectStatus("GET", "/api/v1/books?page=1&limit=5&search=Matrix&category=Testing&sort=title&order=asc", token);
  await expectStatus("GET", `/api/v1/books/isbn/${book.isbn}`, token);
  await expectStatus("PATCH", `/api/v1/books/${bookId}`, token, 200, { title: "Matrix Book Updated" });

  const copy = (await expectStatus("POST", "/api/v1/book-copies", token, 201, {
    bookId, accessionNumber: `MATRIX-COPY-${unique}`, condition: "NEW",
  })).data;
  const copyId = idOf(copy);
  await expectStatus("GET", "/api/v1/book-copies?page=1&limit=5&status=AVAILABLE&sort=accessionNumber&order=asc", token);
  await expectStatus("GET", `/api/v1/book-copies/book/${bookId}?page=1&limit=5`, token);
  await expectStatus("GET", `/api/v1/book-copies/${copyId}`, token);
  await expectStatus("PATCH", `/api/v1/book-copies/${copyId}`, token, 200, { location: "Matrix shelf" });
  await expectStatus("DELETE", `/api/v1/book-copies/${copyId}`, token);
  await expectStatus("DELETE", `/api/v1/books/${bookId}`, token);
  assert.equal(await Book.exists({ _id: bookId }), null);

  const member = (await expectStatus("POST", "/api/v1/members", token, 201, {
    memberId: `MATRIX-MEMBER-${unique}`, name: "Matrix Member", email: `matrix-member-${unique}@example.test`, membershipType: "STUDENT",
  })).data;
  const memberId = idOf(member);
  await expectStatus("GET", "/api/v1/members?page=1&limit=5&search=Matrix&membershipType=STUDENT&sort=name&order=asc", token);
  await expectStatus("GET", `/api/v1/members/${memberId}`, token);
  await expectStatus("PATCH", `/api/v1/members/${memberId}`, token, 200, { department: "Testing" });
  await expectStatus("DELETE", `/api/v1/members/${memberId}`, token);
  assert.equal(await Member.exists({ _id: memberId }), null);
});

test("HTTP circulation matrix covers issue, list, update, renew, return, and delete", async () => {
  const admin = await createUser({ role: "LIBRARY_ADMIN" });
  const member = await createMember();
  const { book, copy } = await createBookWithCopy();
  const token = tokenFor(admin);
  const issue = (await expectStatus("POST", "/api/v1/issues", token, 201, {
    bookId: String(book._id), bookCopyId: String(copy._id), memberId: String(member._id), issuedBy: String(admin._id), dueAt: new Date(Date.now() + 86_400_000).toISOString(),
  })).data;
  const issueId = idOf(issue);
  await expectStatus("GET", "/api/v1/issues?page=1&limit=5&status=ISSUED&sort=dueAt&order=asc", token);
  await expectStatus("GET", `/api/v1/issues/${issueId}`, token);
  await expectStatus("GET", `/api/v1/issues/member/${member._id}`, token);
  await expectStatus("PATCH", `/api/v1/issues/${issueId}`, token, 200, { notes: "Matrix update" });
  await expectStatus("POST", `/api/v1/issues/${issueId}/renew`, token, 200, { additionalDays: 7 });
  await expectStatus("POST", `/api/v1/issues/${issueId}/return`, token, 200, { returnedBy: String(admin._id) });
  assert.equal((await Issue.findById(issueId)).status, "RETURNED");
  assert.equal((await BookCopy.findById(copy._id)).status, "AVAILABLE");
  await expectStatus("DELETE", `/api/v1/issues/${issueId}`, token);
});

test("HTTP fine matrix covers calculation, listing, payment, waiver, and deletion", async () => {
  const admin = await createUser({ role: "LIBRARY_ADMIN" });
  const member = await createMember();
  const { book, copy } = await createBookWithCopy();
  const token = tokenFor(admin);
  const overdueIssue = await Issue.create({ bookId: book._id, bookCopyId: copy._id, memberId: member._id, issuedBy: admin._id, dueAt: new Date(Date.now() - 86_400_000), status: "RETURNED" });
  const calculated = (await expectStatus("POST", `/api/v1/fines/calculate/${overdueIssue._id}`, token, 201)).data;
  const fineId = idOf(calculated);
  await expectStatus("GET", "/api/v1/fines?page=1&limit=5&status=UNPAID&sort=amount&order=asc", token);
  await expectStatus("GET", `/api/v1/fines/${fineId}`, token);
  await expectStatus("GET", `/api/v1/fines/member/${member._id}`, token);
  await expectStatus("POST", `/api/v1/fines/${fineId}/pay`, token, 200, { amount: calculated.amount, paymentMethod: "CASH", paidBy: String(admin._id) });
  assert.equal((await Fine.findById(fineId)).status, "PAID");
  const waive = await Fine.create({ issueId: overdueIssue._id, memberId: member._id, bookId: book._id, amount: 2, daysOverdue: 1, ratePerDay: 2, status: "UNPAID" });
  await expectStatus("POST", `/api/v1/fines/${waive._id}/waive`, token, 200, { waivedBy: String(admin._id), reason: "Matrix waiver" });
  assert.equal((await Fine.findById(waive._id)).status, "WAIVED");
  const removable = await Fine.create({ issueId: overdueIssue._id, memberId: member._id, bookId: book._id, amount: 3, daysOverdue: 1, ratePerDay: 3, status: "UNPAID" });
  await expectStatus("DELETE", `/api/v1/fines/${removable._id}`, token);
});

test("HTTP reservation, reporting, dashboard, and audit matrix covers remaining routes", async () => {
  const admin = await createUser({ role: "LIBRARY_ADMIN" });
  const member = await createMember();
  const { book, copy } = await createBookWithCopy({ availableCopies: 0 });
  const token = tokenFor(admin);
  const createReservation = async (extra = {}) => (await expectStatus("POST", "/api/v1/reservations", token, 201, {
    bookId: String(book._id), memberId: String(member._id), ...extra,
  })).data;
  const reservation = await createReservation({ notes: "Matrix reservation" });
  const reservationId = idOf(reservation);
  await expectStatus("GET", "/api/v1/reservations?page=1&limit=5&status=WAITING&sort=queuePosition&order=asc", token);
  await expectStatus("GET", `/api/v1/reservations/book/${book._id}`, token);
  await expectStatus("GET", `/api/v1/reservations/member/${member._id}`, token);
  await expectStatus("GET", `/api/v1/reservations/${reservationId}`, token);
  await expectStatus("PATCH", `/api/v1/reservations/${reservationId}`, token, 200, { notes: "Matrix updated" });
  await expectStatus("PATCH", `/api/v1/reservations/${reservationId}/ready`, token);
  await Book.findByIdAndUpdate(book._id, { availableCopies: 1 });
  await expectStatus("PATCH", `/api/v1/reservations/${reservationId}/fulfill`, token, 200, { dueAt: new Date(Date.now() + 86_400_000).toISOString() });
  assert.equal((await Reservation.findById(reservationId)).status, "FULFILLED");
  assert.equal((await BookCopy.findById(copy._id)).status, "ISSUED");
  await Book.findByIdAndUpdate(book._id, { availableCopies: 0 });
  const cancelled = await createReservation();
  await expectStatus("PATCH", `/api/v1/reservations/${idOf(cancelled)}/cancel`, token);
  await expectStatus("DELETE", `/api/v1/reservations/${idOf(cancelled)}`, token);
  const expired = await createReservation({ expiresAt: new Date(Date.now() + 86_400_000).toISOString() });
  await Reservation.findByIdAndUpdate(idOf(expired), { expiresAt: new Date(Date.now() - 86_400_000) });
  await expectStatus("PATCH", `/api/v1/reservations/${idOf(expired)}/expire`, token);
  await expectStatus("DELETE", `/api/v1/reservations/${idOf(expired)}`, token);
  for (const path of ["circulation", "books", "members", "fines", "reservations", "summary"]) {
    await expectStatus("GET", `/api/v1/reports/${path}`, token);
  }
  await expectStatus("GET", "/api/v1/dashboard/summary", token);
  await expectStatus("GET", "/api/v1/audit-logs?page=1&limit=5&sort=createdAt&order=desc", token);
});
