const mongoose = require("mongoose");

const originalConsoleError = console.error;
console.log = () => {};
console.error = (...args) => {
  const message = args[0];
  if (
    message === "Audit log persistence failed:" ||
    message === "JWT authentication error:"
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Tests do not connect to MongoDB. Fail audit writes immediately instead of
// buffering them, which keeps the suite isolated from development data.
mongoose.set("bufferCommands", false);

const app = require("../../dist/app.js").default;

const startTestServer = async () => new Promise((resolve) => {
  const server = app.listen(0, "127.0.0.1", () => {
    resolve({
      baseUrl: `http://127.0.0.1:${server.address().port}`,
      close: () => new Promise((done) => server.close(done)),
    });
  });
});

const request = async (baseUrl, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();

  return {
    status: response.status,
    body,
    rateLimit: response.headers.get("ratelimit"),
    retryAfter: response.headers.get("retry-after"),
  };
};

module.exports = { request, startTestServer };
