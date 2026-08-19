# GymFit — design

Status: approved 2026-08-19, ready for implementation planning.

## What this is

An internal web dashboard for running a single gym: membership renewals,
front-desk payments, store sales (drinks, supplements, day passes), expenses,
and a view of what's been invested and earned. It replaces a Google Sheet that
currently holds four years of this data by hand.

One gym, one shared login, all-Serbian UI. Not a multi-tenant product — see
[Rejected: monorepo / multi-tenant shape](#rejected-monorepo--multi-tenant-shape)
for why that structure was considered and set aside.

## Source data

Four CSVs, and an XLSX with the same four tabs plus five more:

| File / tab | Rows | Columns | Becomes |
|---|---|---|---|
| Members | 1,521 | Ime i prezime, Obnova članarine | `members` |
| Payments | 7,543 | Član, Datum, Cena | `payments` |
| Store | 1,172 | Proizvod, Datum, Cena | `store_products` + `store_sales` |
| Expenses | 1,062 | Datum, Naziv, Cena | `expenses` |
| 2024 / 2025 / 2026 | — | monthly rollups: Zarada, Troškovi, Stanje, Podela, member/product counts | derived by query, not seeded |
| Investments | — | Uloženo, Ukupna zarada, Zarada | `capital_investments` + computed |
| Print | — | blank front-desk check-in template | not used |

The XLSX's extra columns beyond the three data columns per tab are formatting
artifacts (conditional formatting ranges), not data — verified by reading the
sheets directly.

### How the derived numbers work (reverse-engineered from the sheet, confirmed against the screenshots)

- `Stanje` (monthly) = `Zarada` − `Troškovi`, in RSD.
- `Podela` (monthly) = `Stanje` / 2 — a 50/50 split, in RSD.
- Per-year `Ukupna zarada` = sum of that year's `Stanje`, converted to EUR.
- Per-year `Zarada` = sum of that year's `Podela`, converted to EUR (≈ half of `Ukupna zarada`).
- Investments-tab `Ukupna zarada` (€172,968.38) = sum of the three years' `Ukupna zarada` — confirmed to the cent (64,704.70 + 69,826.07 + 38,437.61).
- Investments-tab `Zarada` (€69,125.67) = sum of the three years' `Zarada` — confirmed the same way.
- Investments-tab `Uloženo` (€109,000.00) is a manually entered capital figure, not derived from any transaction table.

None of these need to be stored — they're queries over `payments` + `store_sales`
+ `expenses`, converted at the app's configured exchange rate.

## Decisions

Recorded here so they don't get re-litigated; each has a one-line reason.

- **Single shared password, no per-user accounts.** Matches mingle-translator's
  approach; this is a front-desk tool for one gym, not a multi-user system.
- **All-Serbian UI.** The data and the people running the front desk are Serbian.
- **RSD is the working currency everywhere except the Investments page**, which
  shows RSD and EUR side by side, converted at a single rate the owner can edit
  in Settings (default 117.3, matching the long-standing NBS-managed rate — this
  is what the reverse-engineered math above lines up with).
- **Payments link to members by exact name match at import**, as a nullable FK
  plus the raw name kept alongside. Unmatched payments are reported, not
  dropped, and get a manual relink control in the UI. Rejected alternative:
  text-only, no FK — simpler, but loses "total paid by this member" and makes
  renewal-linked views impossible.
- **Expenses get a fixed category** (Zarade i bonusi, Režije, Zalihe,
  Održavanje, Ostalo), assigned by keyword match on the 112 historical names at
  import, required on the add-expense form going forward. This is what makes
  the sheet's manually-tallied "Dnevnica"/"Čišćenje" monthly counts derivable
  by query instead of hand-tracked. Rejected alternative: free text like the
  source — simpler, but the expense-by-category chart can't group meaningfully.
- **Capital investment is a ledger (`capital_investments`), not a single
  number.** Lets the owner log future capital additions, not just the
  historical €109,000. Rejected alternative: one settings value — matches the
  source exactly but can't grow.
- **No stored counters.** Active/not-renewed member counts, per-product monthly
  sales, per-category monthly expenses — all computed by query. Nothing to
  keep in sync by hand, unlike the original spreadsheet.
- **Recharts for charts** — animates well, idiomatic in React/Next, avoids
  reaching for D3 directly.
- **Docker Compose for local Postgres**, borrowed from `../member` (a larger,
  unrelated project by Ilija) — a plain `postgres:16-alpine` container so local
  dev doesn't depend on a cloud database. Production still uses managed
  Postgres (Neon or Supabase) via Vercel.
- **A GitHub Actions CI workflow** (lint → typecheck → test → build on PRs to
  main), also borrowed from `../member` — cheap to add since the scripts
  already exist.
- **No recurring XLSX-import feature.** The CSVs carry the same core
  transactional data and are simpler to parse; day-to-day entry after the
  initial seed happens through the app's own forms. The XLSX's extra tabs
  (yearly rollups, Investments, Print) are fully accounted for in this design
  without needing a runtime XLSX parser.
- **Decisions log lives inline in README.md / CLAUDE.md**, not a separate
  `docs/adr/` folder — matching mingle-translator's actual pattern (it doesn't
  have a literal ADR folder either; decisions are dated notes in the docs).
  This spec doc is the primary record for the initial build.

### Rejected: monorepo / multi-tenant shape

`../member` (Ilija's project) is a multi-tenant SaaS: Turborepo, separate
web/admin/api apps, Fastify, Better Auth, Stripe, Twilio, Cloudinary, Neon,
Railway. None of that fits here — GymFit is one gym, one login, one
Next.js app with API routes, same shape as mingle-translator. Only two things
were worth taking from it: Docker Compose for local Postgres, and the CI
workflow shape — both listed above.

## Stack

Next.js (App Router) + TypeScript + Drizzle ORM + Postgres + Tailwind 4 +
Recharts + Vitest, pnpm. Local Postgres via Docker Compose; production
Postgres via Neon or Supabase. Deployed on Vercel. GitHub Actions CI.

Single app, no monorepo — package.json, drizzle schema, and Next.js app all
live at the repo root, same layout as mingle-translator.

## Data model

```
members
  id, full_name, membership_renewal_date, created_at

payments
  id, member_id (nullable FK -> members), member_name_raw, paid_at, amount, created_at

store_products
  id, name, default_price, active

store_sales
  id, product_id (FK -> store_products), sold_at, price, quantity (default 1), created_at

expenses
  id, expense_date, description, amount,
  category (enum: zarade_bonusi | rezije | zalihe | odrzavanje | ostalo), created_at

capital_investments
  id, invested_at, amount_eur, note, created_at

settings
  key, value        -- currently one row: rsd_to_eur_rate
```

Active/not-renewed member counts, per-product monthly sales, per-category
monthly expense totals, and the Zarada/Troškovi/Stanje/Podela rollups are all
queries against these tables — nothing duplicated.

## Import pipeline

A one-time, idempotent seed script (`pnpm seed:import`) reads the four CSVs:

1. Insert members.
2. Insert payments, matching `Član` to `members.full_name` by exact string;
   unmatched rows get `member_id = null` and are listed in a printed report at
   the end (loud, not silent).
3. Insert the six `store_products` (Čokoladica, Dnevni termin, Kolagen, Nocco,
   Pre-workout, Protein) seeded from the distinct `Proizvod` values, then
   insert `store_sales` against them.
4. Insert expenses, applying a keyword→category lookup over the 112 distinct
   historical `Naziv` values (e.g. "Dnevnica"/"Bonus" → Zarade i bonusi;
   "Gradska čistoća"/"Internet"/utility-bill names → Režije;
   "Kolagen"/"Nocco"/"Čokoladica"/"Pre-workout"/"Protein"/"Članske karte" →
   Zalihe; "Čišćenje"/"Hemija"/"Kese"/toilet-supply names → Održavanje;
   anything unmatched → Ostalo). The mapping table lives in the seed script,
   reviewable and editable before the real import runs.

Not seeded: the historical €109,000 capital investment (no source date) and
the RSD→EUR exchange rate default (117.3, editable). Both are entered once
through the app after first deploy.

## Screens

- **Login** — shared password, session cookie.
- **Dashboard** — stat cards (active members, not-renewed, this month's
  earnings/expenses), multi-year Zarada line + stacked-bar chart, expense-by-
  category chart, recent activity.
- **Members** — list, search, add/edit, overdue renewals flagged.
- **Payments** — list, add, filter by member/date; unmatched-payment relink
  control.
- **Store** — product catalog (add/edit product + default price), sales log
  (add sale with quantity), per-product monthly chart.
- **Expenses** — list, add/edit with required category, monthly chart by
  category.
- **Investments** — Uloženo/Ukupna zarada/Zarada cards in RSD and EUR, capital
  ledger (add entries), exchange-rate setting.
- **Settings** — exchange rate, app info.

Visual direction: dark theme built around the black/white GYMFIT logo, bold
high-contrast type, animated counters and chart entrances, subtle
gradient/glow accents on stat cards. Exact palette and chart specifics are
worked out at implementation time using the `dataviz` skill, not fixed here.

## Testing

Vitest, same as mingle-translator: unit tests for the import matching/
categorization logic (the parts most likely to silently misbehave on messy
real data) and for any derived-metric queries (rollup math, EUR conversion).

## Deployment

Vercel + managed Postgres (Neon or Supabase), same as mingle-translator.
`pnpm db:migrate` against the production database once. Local dev runs
Postgres via `docker compose up`.

## Docs

- `README.md` — what this is, quick start, screens, decisions, same spirit as
  mingle-translator's but opening with a clearer "what this is" section per
  the `member` project's style, since this README needs to stand on its own
  for someone who's never seen the spreadsheet.
- `CLAUDE.md` — repo-specific engineering notes, if any accumulate during
  implementation.
- `db/README.md` — handoff doc for whoever provisions the production
  database, same shape as mingle-translator's.
