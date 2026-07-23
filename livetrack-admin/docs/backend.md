# Backend setup

Copy `backend/.env.example` to `backend/.env`, replace both JWT secrets with independent random values of at least 32 characters, set the PostgreSQL URL and exact dashboard origin, then run Prisma generate, migrate, and seed. The API listens on port 4000 by default and exposes `GET /health`.

The code is divided into configuration, middleware, feature modules, services, sockets, and utilities. Access tokens are short lived. Refresh tokens are hashed before storage and may be revoked through logout. Device status is derived from `lastSeenAt`: online through 60 seconds, idle through five minutes, then offline.

For production, run `npm run prisma:deploy -w backend` before starting the compiled server.
