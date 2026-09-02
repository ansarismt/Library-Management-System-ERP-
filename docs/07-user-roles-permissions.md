# Library ERP Modules

## 1. Overview

The Library Management System ERP is designed as a modular MERN application.

The system manages library resources, members, circulation, reservations, fines, inventory, notifications, reports and administration.

## 2. Core Modules

### 2.1 Authentication

Responsibilities:

- User registration
- Login
- Logout
- Access token generation
- Refresh token rotation
- Current user profile
- Password management
- Account status

API prefix:

`/api/v1/auth`

---

### 2.2 User Management

Responsibilities:

- Create users
- Update users
- Activate/deactivate users
- Assign roles
- Search users
- Filter users
- View user details

---

### 2.3 Book Management

Responsibilities:

- Add books
- Edit books
- Delete books
- Search books
- Categorize books
- Manage authors
- Manage publishers
- Track ISBN
- Track copies
- Track availability

---

### 2.4 Book Catalog

The catalog provides searchable access to library resources.

Features:

- Keyword search
- ISBN search
- Author search
- Category filtering
- Availability filtering
- Pagination
- Sorting
- Book details

---

### 2.5 Member Management

Responsibilities:

- Student members
- Faculty members
- Staff members
- Membership status
- Membership expiry
- Borrowing history
- Account history

---

### 2.6 Circulation Management

The circulation module manages book transactions.

Operations:

- Issue book
- Return book
- Renew book
- Calculate due date
- Detect overdue books
- Track active loans
- Track borrowing history

---

### 2.7 Reservation Management

Users can reserve unavailable books.

Features:

- Create reservation
- Cancel reservation
- Reservation queue
- Reservation expiry
- Availability notification

---

### 2.8 Fine Management

The fine module manages overdue penalties.

Features:

- Automatic fine calculation
- Fine history
- Outstanding fines
- Fine status
- Waiver management
- Payment status

---

### 2.9 Inventory Management

Tracks physical library assets.

Features:

- Book copies
- Damaged books
- Lost books
- Missing books
- Stock verification
- Inventory audit

---

### 2.10 Reports and Analytics

Reports include:

- Total books
- Active members
- Books issued
- Books returned
- Overdue books
- Fine collection
- Most borrowed books
- Most active members
- Inventory statistics

---

### 2.11 Notifications

Notification system supports:

- Due date reminders
- Overdue notifications
- Reservation availability
- Account notifications
- Administrative announcements

---

### 2.12 Audit Logs

Tracks important system activities.

Example:

```text
USER_LOGIN
BOOK_CREATED
BOOK_UPDATED
BOOK_DELETED
BOOK_ISSUED
BOOK_RETURNED
USER_ROLE_CHANGED
FINE_UPDATED