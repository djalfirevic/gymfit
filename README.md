# GymFit

An internal dashboard for running a single gym: membership renewals, front-desk
payments, store sales, expenses, and a view of what's been invested and
earned. Built to replace a four-year-old Google Sheet.

One gym, one shared login, all-Serbian UI.

## Stack

- **Frontend/backend:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4, `@tanstack/react-query`, Recharts
- **Database:** PostgreSQL, via Drizzle ORM — Docker Compose locally, Neon/Supabase in production
- **Auth:** a single shared password (`APP_PASSWORD`) and a signed session cookie — no per-user accounts
- **Hosting:** Vercel + managed Postgres
- **Tests:** Vitest

## Quick start

```bash
pnpm install
cp .env.example .env.local     # fill in APP_PASSWORD and SESSION_SECRET — see below
docker compose up -d           # local Postgres, exposed on host port 5434
pnpm db:migrate                # creates all 7 tables
pnpm dev
```

Open http://localhost:3000 and log in with the `APP_PASSWORD` you set.

Local Postgres is published on host port **5434**, not the default 5432 —
this repo's `docker-compose.yml` remaps it to avoid clashing with other
Postgres instances a dev machine may already have running on 5432/5433.
`.env.example`'s `DATABASE_URL` already points at `5434`; if you change the
Docker Compose port mapping, update `.env.local` to match.

### Environment

| Variable | Needed for |
|---|---|
| `DATABASE_URL` | Postgres connection string. Docker Compose's default is already in `.env.example`. |
| `APP_PASSWORD` | The shared password for the app. |
| `SESSION_SECRET` | Signs the session cookie. 32+ random bytes — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |

## Seeding from the spreadsheet export

Copy the four CSVs (`Members.csv`, `Payments.csv`, `Store.csv`, `Expenses.csv`)
into `seed-data/` (gitignored — real member data never gets committed), then:

```bash
pnpm seed:import
```

It's idempotent: if a table already has rows, that table's import is skipped
rather than duplicating or overwriting anything, so re-running after a crash
is always safe. It prints which payments didn't match a member by name (fix
those from the Payments page's relink control) and how the historical
expenses were auto-categorized.

**Run `pnpm seed:import` before doing any manual testing of the Store page**
(or before any manual testing at all, on a clean database). `store_products`
and `store_sales` have no delete route in the app by design, and the seed
importer skips a table entirely if it already has any rows — so a single
manually-created test product permanently blocks the real Store CSV import
from ever running on that database. If you need a scratch database for UI
testing, use a separate one rather than the machine you intend to seed.

Not seeded — enter these once through the app after first deploy:
- The historical capital investment, from the Investments page.
- The RSD→EUR exchange rate (defaults to 117.3), from the Settings page.

## How the numbers work

- `Stanje` (monthly) = `Zarada` (payments + store sales) − `Troškovi` (expenses).
- `Podela` = `Stanje` / 2 — a 50/50 split.
- The Investments page converts RSD to EUR at the rate set in Settings.
- Active/not-renewed member counts, per-product monthly sales, and
  per-category monthly expense totals are computed on every request — nothing
  is cached in a column that could drift out of sync.

See `docs/superpowers/specs/2026-08-19-gymfit-design.md` for the full design,
including what was deliberately left out and why.

## Screens

Login → Dashboard (stat cards, multi-year earnings chart, expense-by-category
chart) → Members → Payments → Store (products + sales) → Expenses →
Investments → Settings.

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest |
| `pnpm db:generate` | Generate a migration from `src/lib/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm probe:db` | Smoke-check every table against a real database |
| `pnpm seed:import` | Import the four CSVs from `seed-data/` |

## Deployment

Vercel + managed Postgres (Neon or Supabase). Set the environment variables in
the project settings and run `pnpm db:migrate` against the production database
once. See `db/README.md` if someone else is provisioning the database.
