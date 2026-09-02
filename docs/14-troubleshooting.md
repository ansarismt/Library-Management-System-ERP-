# Troubleshooting

## MongoDB authentication failed

### Error

MongoServerError: bad auth

### Possible causes

- Incorrect MongoDB username
- Incorrect password
- Incorrect connection string
- Special characters not URL encoded
- Incorrect database user

---

## MONGODB_URI is not configured

Check:

server/.env

Example:

MONGODB_URI=...

---

## Port 5000 already in use

Find the process:

Get-NetTCPConnection -LocalPort 5000

---

## Authentication required

Ensure the request contains:

Authorization: Bearer <ACCESS_TOKEN>