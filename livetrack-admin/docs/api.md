# API

All routes use JSON. Except register, login, refresh and health, send `Authorization: Bearer <accessToken>`.

## Authentication

- `POST /api/auth/register` — fullName, email, password
- `POST /api/auth/login` — email, password
- `POST /api/auth/refresh` — refreshToken
- `POST /api/auth/logout` — refreshToken
- `GET /api/auth/me`

## Devices and locations

- `POST /api/devices/register`
- `GET /api/devices`, `GET/PATCH/DELETE /api/devices/:id`
- `POST /api/devices/:id/start`, `POST /api/devices/:id/stop`
- `POST /api/locations`, `POST /api/locations/batch`
- `GET /api/locations/latest`
- `GET /api/devices/:id/locations?page=1&limit=50&from=<ISO>&to=<ISO>`
- `GET /api/devices/:id/route?from=<ISO>&to=<ISO>`
- `GET /api/devices/:id/statistics?from=<ISO>&to=<ISO>`

Location payload fields are `deviceId`, unique `clientLocationId`, `latitude`, `longitude`, optional accuracy/altitude/speed/heading/batteryLevel/isCharging, and ISO `recordedAt`.

## Dashboard and administration

- `GET /api/dashboard/summary`
- `GET /api/dashboard/online-devices`
- `GET /api/dashboard/recent-activity`
- `GET/POST /api/users`, `PATCH /api/users/:id` (admin)
