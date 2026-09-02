# Library Management System ERP

A modern MERN-based enterprise resource planning system for library operations.

## Overview

This project is structured as a full-stack application with a Vite React frontend and a Node.js/Express backend using MongoDB Atlas. The repository is designed for cloud deployment with environment-specific configuration for local development and production.

## Features

- JWT authentication and refresh-token rotation
- Role-based access control
- Books, copies, members, and circulation management
- Issues, returns, renewals, reservations, and fines
- Payments, reports, dashboard, audit logs, and settings

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript |
| Build Tool | Vite |
| Backend | Node.js + Express |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| Authentication | JWT + HttpOnly cookies |
| Security | Helmet, CORS, bcrypt, validation |

## Recommended Cloud Architecture

- Frontend: Vercel or Netlify
- Backend: Render, Railway, or Azure App Service
- Database: MongoDB Atlas

This repository is prepared for that architecture, but actual deployment requires valid provider credentials and environment values that are not stored in source control.

## Local Development

1. Copy the sample environment files:
   - Root: .env.example
   - Frontend: client/.env.example
   - Backend: server/.env.example
2. Fill in the values for your local environment.
3. Install and run the app:

```bash
npm install
npm --prefix client install
npm --prefix server install
npm run dev
```

## Production Environment Variables

Required names:

- NODE_ENV
- PORT
- CLIENT_URL
- MONGODB_URI
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- VITE_API_URL

Never commit real secrets or database credentials to source control.

## Production Notes

- The backend health endpoint is available at /api/v1/health.
- The backend binds to 0.0.0.0 in production.
- CORS is configured through the CLIENT_URL environment variable.
- Cookies are set with HttpOnly and secure settings in production.
- Deployment URLs must be placed in environment variables, not hardcoded into code.

## Security Guidelines

- Do not commit .env files.
- Rotate any credentials already exposed in local files or logs before production use.
- Keep MongoDB Atlas network access restricted to the minimum required IPs or private networking.
- Do not print tokens or secrets in logs or documentation.

## Deployment Checklist

- Frontend build succeeds
- Backend build succeeds
- MongoDB Atlas is reachable
- Health endpoint returns success
- HTTPS is enabled on deployed frontend/backend
- CORS matches deployed frontend origin
- Login, refresh, and logout flow works
- RBAC continues to work in the deployed environment

## Troubleshooting

- If the frontend cannot reach the backend, verify the VITE_API_URL value.
- If the backend fails, confirm PORT, MONGODB_URI, JWT_ACCESS_SECRET, and JWT_REFRESH_SECRET are set.
- If cookies fail in production, verify the deployed frontend/backend domains and SameSite settings.
- If MongoDB fails, check Atlas network access and the connection string format.