# Socket.IO

Connect to the API origin and pass the access token as `auth.token`. Invalid and expired tokens are rejected during the handshake.

- `device:location` — newly persisted location and device summary
- `device:online` / `device:offline` — status transition
- `device:updated` — metadata, tracking, or idle-state change
- `device:removed` — `{ id }`

Clients should reconnect with backoff, keep the last server snapshot visible, and refetch device and summary endpoints on reconnect.
