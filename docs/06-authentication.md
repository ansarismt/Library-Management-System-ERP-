Register
   ↓
Validate input
   ↓
Check email
   ↓
Hash password
   ↓
Create user
   ↓
Login
   ↓
Verify password
   ↓
Generate Access Token
   ↓
Generate Refresh Token
   ↓
Store hashed refresh token
   ↓
Return access token

POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me

Access token = 15 minutes
Refresh token = 7 days
Refresh token stored in HTTP-only cookie
Password hashed using bcrypt
Refresh token stored hashed in MongoDB