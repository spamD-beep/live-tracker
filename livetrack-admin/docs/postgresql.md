# PostgreSQL

Create a UTF-8 database and a restricted application user:

```sql
CREATE USER livetrack WITH PASSWORD 'choose-a-strong-password';
CREATE DATABASE livetrack OWNER livetrack;
```

Set `DATABASE_URL`, run `npm run prisma:deploy -w backend`, then optionally seed development data. Back up the database with `pg_dump`; restore procedures should be rehearsed. The provided Docker Compose stack persists data in the `livetrack_data` named volume.
