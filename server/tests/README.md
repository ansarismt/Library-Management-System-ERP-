# Backend tests

Run the safe HTTP contract suite with `npm test` from the repository root.
It uses Node's built-in test runner, the compiled Express application, and an
in-memory rate-limit store; no test dependencies or database credentials are
required.

`npm run test:db` starts a disposable `mongodb-memory-server` single-node
replica set. It is the only database-backed command; it never reads
`MONGODB_URI`, uses generated fixture identifiers, drops only the temporary
database between tests, disconnects Mongoose, and stops the replica set.

The database suite covers auth/refresh rotation, audit persistence, RBAC,
circulation commit and rollback, reservation queues/fulfillment, and fine
payments. Additional report/dashboard/search and broader CRUD coverage can be
added to this same isolated harness without using development data.
