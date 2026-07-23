# LiveTrack Mobile API integration

The mobile app is ready to connect to the desktop dashboard through the backend API. The desktop app should read device and location records from the same backend that receives these mobile writes.

## Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Login and register responses may return either `accessToken` or `token`. The mobile client stores this value in secure storage and sends it as `Authorization: Bearer <token>`.

## Devices

- `POST /api/devices/register`
- `GET /api/devices/me`

The app generates a UUID on first launch and sends it as `deviceId`. It does not read IMEI, serial number, MAC address, or any prohibited hardware identifier.

## Locations

- `POST /api/locations`
- `POST /api/locations/batch`

Payload:

```json
{
  "id": "unique-location-id",
  "deviceId": "device-uuid",
  "deviceName": "Ali Phone",
  "latitude": 31.5204,
  "longitude": 74.3587,
  "accuracy": 12.4,
  "altitude": 217.0,
  "speed": 2.5,
  "heading": 90,
  "batteryLevel": 76,
  "isCharging": false,
  "recordedAt": "2026-07-23T18:30:00.000+05:00"
}
```

Batch payload:

```json
{
  "locations": []
}
```

The backend should make `id` idempotent so retries cannot create duplicates. The desktop dashboard can subscribe to backend updates or poll by `deviceId`.
