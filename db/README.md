# Database setup — for whoever provisions this

## What this is

GymFit's database: members, payments, store sales, expenses, capital
investments, and one settings row (the RSD→EUR exchange rate). Seven tables,
small — comparable in size to the CSV export it replaces (a few thousand rows
total), growing by a few hundred rows a month.

## Sizing

Nothing here is demanding. The smallest available Postgres tier is enough —
a handful of users, occasional reads, and no bulk-write spikes beyond the
one-time historical import.

**PostgreSQL 13 or newer.** Developed and verified on 16.

## Steps

```bash
# 1. Create the database (any name; we use gymfit)
psql "host=<host> port=5432 dbname=postgres user=<admin> sslmode=require" \
  -c "CREATE DATABASE gymfit;"

# 2. Point DATABASE_URL at it and run migrations from the app repo
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/gymfit?sslmode=require" pnpm db:migrate
```

There is no `pg_trgm` or other extension dependency — plain Postgres is
enough.

### A dedicated role, rather than handing over the admin account

```sql
CREATE ROLE gymfit_app WITH LOGIN PASSWORD '<generate a strong one>';

GRANT CONNECT ON DATABASE gymfit TO gymfit_app;
GRANT USAGE ON SCHEMA public, drizzle TO gymfit_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public, drizzle TO gymfit_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public, drizzle TO gymfit_app;
```

**Schema changes** are applied with `drizzle-kit`, which needs `CREATE` on the
schema:

```sql
GRANT CREATE ON SCHEMA public, drizzle TO gymfit_app;
```

…or keep it out and run migrations with the admin connection string only when
a migration is due.

## What to send back

```
postgresql://<user>:<password>@<host>:5432/gymfit?sslmode=require
```

`sslmode=require` matters. Send it privately; it goes into `DATABASE_URL` and
nowhere else — never sent to a browser.

### Network access

The app runs on Vercel, whose egress IPs are not fixed on the standard plan.
Allow public access with the firewall open to the hosting provider's Azure/AWS
services, relying on the strong password and required TLS — simplest and
sufficient at this scale.

## Verifying it worked

```sql
SELECT count(*) FROM members;              -- 1521 once seeded
SELECT count(*) FROM payments;              -- 6021 once seeded
SELECT count(*) FROM store_sales;           -- 1172 once seeded
SELECT count(*) FROM expenses;              -- 1062 once seeded
```

## Backups

Rely on the hosting provider's automated backups (Neon and Supabase both
include point-in-time recovery on their free/starter tiers). No custom backup
tooling is needed at this scale.
