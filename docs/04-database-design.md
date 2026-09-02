User
 │
 ├── RefreshToken
 │
 └── AuditLog

Book
 │
 ├── Author
 ├── Category
 └── BookCopy

Member
 │
 ├── Loan
 ├── Reservation
 └── Fine

 users
refreshTokens

books
bookCopies
authors
categories

members
loans
reservations
fines

staff
branches

notifications
auditLogs

settings

## User

| Field | Type | Required | Description |
|---|---|---|---|
| name | String | Yes | User name |
| email | String | Yes | Login email |
| passwordHash | String | Yes | Hashed password |
| role | String | Yes | User role |
| status | String | Yes | Account status |
| lastLogin | Date | No | Last login |