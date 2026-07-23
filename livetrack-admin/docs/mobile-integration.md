# Mobile app integration

1. Explain why location is needed, obtain explicit OS and in-app consent, and register the device while authenticated as its owner.
2. Show a persistent, unambiguous indicator whenever tracking is enabled. Respect the `/stop` state and OS permission revocation immediately.
3. Create a UUID `clientLocationId` for each reading. Queue readings locally when offline, submit batches of at most 100 in chronological order, and retain IDs across retries.
4. Submit measured timestamps, not upload timestamps. Never invent readings or weaken OS permission flows.
5. Store tokens using Keychain/Keystore, refresh access tokens, and erase tokens and queued points on sign-out.

Example:

```json
{"deviceId":"uuid","clientLocationId":"reading-uuid","latitude":24.8607,"longitude":67.0011,"accuracy":8.2,"speed":4.1,"batteryLevel":78,"isCharging":false,"recordedAt":"2026-07-23T10:30:00.000Z"}
```
