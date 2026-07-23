# LiveTrack Admin

LiveTrack Admin is a consent-based location operations platform. Authorized mobile apps publish GPS readings to a secured Node API; administrators and viewers monitor device state, routes, and activity from a live React dashboard.

> This project deliberately does not implement stealth tracking, permission bypasses, or hidden monitoring. Mobile clients must show tracking state and obtain informed, revocable consent.

## Quick start

Requirements: Node.js 22+, PostgreSQL 15+, npm.

```bash
npm install
copy backend\.env.example backend\.env
copy dashboard\.env.example dashboard\.env
npm run prisma:generate -w backend
npm run prisma:migrate -w backend
npm run dev
```

Open `http://localhost:5173` and create a real account from the sign-up tab. The first registered user becomes the admin.

If an older local database was seeded before this change, remove only the old sample records:

```bash
npm run clear-demo-data -w backend
```

## Commands

```bash
npm run dev                 # API and dashboard
npm run build               # production builds
npm test                    # backend tests
npm run lint                # strict TypeScript checks
npm run clear-demo-data -w backend
npm run prisma:deploy -w backend
docker compose up --build
```

More detail is in [docs/backend.md](docs/backend.md), [docs/dashboard.md](docs/dashboard.md), [docs/api.md](docs/api.md), [docs/mobile-integration.md](docs/mobile-integration.md), and [docs/deployment.md](docs/deployment.md).
