# GymFit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build GymFit, a single-app Next.js dashboard that replaces the gym's spreadsheet — membership renewals, payments, store sales, expenses, and an investments view — backed by Postgres, seeded from the existing CSV export.

**Architecture:** One Next.js (App Router) app, no monorepo. Drizzle ORM against Postgres (Docker Compose locally, Neon/Supabase in production). Server-only query modules wrap all DB access; Next.js API routes call them and are the only way the browser touches data; client pages use `@tanstack/react-query` against those routes. A single shared-password session cookie gates everything except `/login`.

**Tech Stack:** Next.js 16, TypeScript, Drizzle ORM, `postgres` (postgres.js), Tailwind CSS 4, Recharts, `@tanstack/react-query`, Zod, Vitest, `csv-parse`, pnpm, Docker Compose, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-19-gymfit-design.md`

## Global Constraints

- All UI copy is Serbian (labels, buttons, error messages, chart titles).
- RSD is the working currency everywhere except the Investments page, which shows RSD and EUR side by side.
- Single shared-password auth (`APP_PASSWORD` + signed session cookie). No per-user accounts, no roles.
- No stored counters: active/not-renewed member counts, per-product monthly sales, per-category monthly expense totals, and the Zarada/Troškovi/Stanje/Podela rollup are always computed by query, never written to a column.
- Expense categories are the fixed enum `zarade_bonusi | rezije | zalihe | odrzavanje | ostalo` — required on every expense, historical or new.
- Package manager is pnpm. Node.js >= 20.11.
- Single Next.js app at the repo root — no `apps/`/`packages/` split.
- Every dependency added must appear in a task's `package.json` diff — no silent extra installs.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `vitest.config.mts`
- Create: `vitest.setup.tsx`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `.nvmrc`
- Create: `docker-compose.yml`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`
- Create: `scripts/tsconfig.json`

**Interfaces:**
- Produces: a running `pnpm dev` Next.js app, `pnpm typecheck`/`pnpm lint`/`pnpm test`/`pnpm build` all exit 0, and `docker compose up -d` starts a local Postgres every later task can connect to at `postgresql://gymfit:gymfit@localhost:5432/gymfit_local`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "gymfit",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20.11"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "probe:db": "tsx --tsconfig scripts/tsconfig.json scripts/probe-db.ts",
    "seed:import": "tsx --tsconfig scripts/tsconfig.json scripts/seed-import.ts"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.101.4",
    "clsx": "^2.1.1",
    "csv-parse": "^5.6.0",
    "drizzle-orm": "^0.45.2",
    "next": "^16.3.0",
    "postgres": "^3.4.9",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "recharts": "^2.15.0",
    "server-only": "^0.0.1",
    "tailwind-merge": "^3.6.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.3.6",
    "@tailwindcss/postcss": "^4.3.3",
    "@testing-library/jest-dom": "^7.0.0",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.3",
    "@types/node": "^22.10.0",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.4",
    "@vitejs/plugin-react": "^5.2.0",
    "dotenv": "^17.4.2",
    "drizzle-kit": "^0.31.10",
    "eslint": "^9.39.5",
    "eslint-config-next": "^16.3.0",
    "jsdom": "^26.1.0",
    "tailwindcss": "^4.3.3",
    "tsx": "^4.23.10",
    "typescript": "^5.9.3",
    "vite": "^6.4.3",
    "vite-tsconfig-paths": "^6.1.1",
    "vitest": "^3.2.7"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`**

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default nextConfig
```

```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

```js
// eslint.config.mjs
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const eslintConfig = [...compat.extends('next/core-web-vitals', 'next/typescript')]

export default eslintConfig
```

- [ ] **Step 4: Write `vitest.config.mts` and `vitest.setup.tsx`**

```ts
// vitest.config.mts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.tsx'],
    globals: true,
  },
})
```

```tsx
// vitest.setup.tsx
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Write `.env.example`, `.gitignore`, `.nvmrc`**

```bash
# .env.example
DATABASE_URL=postgresql://gymfit:gymfit@localhost:5432/gymfit_local
APP_PASSWORD=
SESSION_SECRET=
```

```
# .gitignore
node_modules/
.next/
.env.local
.env*.local
*.tsbuildinfo
next-env.d.ts
coverage/
seed-data/
```

```
20.11.0
```

- [ ] **Step 6: Write `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: gymfit_db
    restart: unless-stopped
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: gymfit
      POSTGRES_PASSWORD: gymfit
      POSTGRES_DB: gymfit_local
    volumes:
      - gymfit_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U gymfit -d gymfit_local']
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  gymfit_pgdata:
```

- [ ] **Step 7: Write the root layout, global styles, and home page**

```css
/* src/app/globals.css */
@import 'tailwindcss';

:root {
  --color-bg: #0a0a0a;
  --color-fg: #f5f5f5;
}

body {
  background: var(--color-bg);
  color: var(--color-fg);
}
```

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GymFit',
  description: 'Interni dashboard za vođenje teretane',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr">
      <body>{children}</body>
    </html>
  )
}
```

```tsx
// src/app/page.tsx
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
```

- [ ] **Step 8: Write `scripts/tsconfig.json`**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["**/*.ts", "../src/**/*.ts"]
}
```

- [ ] **Step 9: Install and verify**

Run: `pnpm install`
Expected: installs without error.

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: all three exit 0 (the home page redirect will fail to build cleanly without a `/dashboard` route yet — if `pnpm build` errors on the missing route, that's expected at this step; confirm `pnpm typecheck` and `pnpm lint` pass, and defer full `pnpm build` verification to Task 13 once `/dashboard` exists).

Run: `docker compose up -d && docker compose ps`
Expected: `gymfit_db` shows `healthy`.

Run: `pnpm dev` (start, then Ctrl+C after confirming it boots)
Expected: server starts on `http://localhost:3000` without crashing.

- [ ] **Step 10: Commit**

```bash
git add package.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs \
  vitest.config.mts vitest.setup.tsx .env.example .gitignore .nvmrc docker-compose.yml \
  src/app/layout.tsx src/app/globals.css src/app/page.tsx scripts/tsconfig.json pnpm-lock.yaml
git commit -m "chore: scaffold Next.js + Tailwind + Vitest + Docker Postgres"
```

---

### Task 2: Drizzle schema, DB client, and migrations

**Files:**
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/client.ts`
- Create: `drizzle.config.ts`
- Create: `scripts/probe-db.ts`

**Interfaces:**
- Consumes: `DATABASE_URL` from `.env.local` (Task 1's Docker Postgres).
- Produces: `db` (Drizzle instance) from `src/lib/db/client.ts`; tables `members`, `payments`, `storeProducts`, `storeSales`, `expenses`, `capitalInvestments`, `settings`, and enum `expenseCategory` from `src/lib/db/schema.ts` — every later task imports from here.

- [ ] **Step 1: Write the schema**

```ts
// src/lib/db/schema.ts
import { boolean, date, integer, numeric, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const expenseCategory = pgEnum('expense_category', [
  'zarade_bonusi',
  'rezije',
  'zalihe',
  'odrzavanje',
  'ostalo',
])

export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  membershipRenewalDate: date('membership_renewal_date', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  memberId: integer('member_id').references(() => members.id),
  memberNameRaw: text('member_name_raw').notNull(),
  paidAt: date('paid_at', { mode: 'date' }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const storeProducts = pgTable('store_products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  defaultPrice: numeric('default_price', { precision: 12, scale: 2 }).notNull(),
  active: boolean('active').notNull().default(true),
})

export const storeSales = pgTable('store_sales', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .notNull()
    .references(() => storeProducts.id),
  soldAt: date('sold_at', { mode: 'date' }).notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  expenseDate: date('expense_date', { mode: 'date' }).notNull(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  category: expenseCategory('category').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const capitalInvestments = pgTable('capital_investments', {
  id: serial('id').primaryKey(),
  investedAt: date('invested_at', { mode: 'date' }).notNull(),
  amountEur: numeric('amount_eur', { precision: 12, scale: 2 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
```

- [ ] **Step 2: Write the DB client**

```ts
// src/lib/db/client.ts
import 'server-only'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const queryClient = postgres(connectionString)
export const db = drizzle(queryClient, { schema })
```

- [ ] **Step 3: Write `drizzle.config.ts`**

```ts
// drizzle.config.ts
import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// dotenv's auto-load form (`import 'dotenv/config'`) only reads `.env`, not
// `.env.local` — but `.env.local` is what Step 4 below has developers
// actually create. Load both, `.env.local` taking precedence, so this CLI
// config sees the same DATABASE_URL Next.js and Vitest see.
config({ path: '.env', quiet: true })
config({ path: '.env.local', override: true, quiet: true })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
})
```

- [ ] **Step 4: Copy env and generate/run the migration**

```bash
cp .env.example .env.local
```

Edit `.env.local` and leave `DATABASE_URL` as the Docker default (`postgresql://gymfit:gymfit@localhost:5432/gymfit_local`).

Run: `docker compose up -d`
Run: `pnpm db:generate`
Expected: creates `drizzle/0000_*.sql` covering all 7 tables and the `expense_category` enum.

Run: `pnpm db:migrate`
Expected: exits 0, applies the migration.

- [ ] **Step 5: Write `scripts/load-env.ts`, then the DB probe script**

Any script that imports `./db-client` needs `.env.local` loaded before `db-client`'s own top-level `DATABASE_URL` check runs. Under native ESM, a module's whole import graph evaluates before that module's own top-level statements — so `config(...)` calls placed textually above an `import { db } from './db-client'` line do NOT run first; only the relative order of sibling `import` *statements* does. `scripts/load-env.ts` is a side-effecting module every such script imports first:

```ts
// scripts/load-env.ts
import { config } from 'dotenv'

// dotenv's auto-load form only reads `.env`, not `.env.local` — but
// `.env.local` is what developers actually create. Load both, `.env.local`
// taking precedence, so CLI scripts see the same DATABASE_URL that Next.js
// and Vitest see.
//
// This must be the FIRST import in any file that also imports `./db-client`
// (directly or transitively): under native ESM, a module's entire
// dependency graph is evaluated before that module's own top-level
// statements run, so placing these `config(...)` calls textually above an
// `import './db-client'` line does not delay db-client's evaluation — only
// the relative order of sibling import statements does. Importing this
// module first guarantees it fully evaluates (including these calls)
// before `./db-client` is evaluated.
config({ path: '.env', quiet: true })
config({ path: '.env.local', override: true, quiet: true })
```

```ts
// scripts/probe-db.ts
import './load-env'
import { db } from './db-client'
import { capitalInvestments, expenses, members, payments, settings, storeProducts, storeSales } from '../src/lib/db/schema'

async function main() {
  const [memberCount] = await db.select().from(members)
  const [paymentCount] = await db.select().from(payments)
  const [productCount] = await db.select().from(storeProducts)
  const [saleCount] = await db.select().from(storeSales)
  const [expenseCount] = await db.select().from(expenses)
  const [investmentCount] = await db.select().from(capitalInvestments)
  const [settingCount] = await db.select().from(settings)

  console.log('members table reachable:', memberCount !== undefined || true)
  console.log('payments table reachable:', paymentCount !== undefined || true)
  console.log('store_products table reachable:', productCount !== undefined || true)
  console.log('store_sales table reachable:', saleCount !== undefined || true)
  console.log('expenses table reachable:', expenseCount !== undefined || true)
  console.log('capital_investments table reachable:', investmentCount !== undefined || true)
  console.log('settings table reachable:', settingCount !== undefined || true)
  console.log('All 7 tables probed successfully.')
  process.exit(0)
}

main().catch((error) => {
  console.error('Probe failed:', error)
  process.exit(1)
})
```

Run: `pnpm probe:db`
Expected: prints all 7 "reachable" lines and "All 7 tables probed successfully." with exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema.ts src/lib/db/client.ts drizzle.config.ts scripts/probe-db.ts drizzle/
git commit -m "feat: add Drizzle schema and Postgres migrations for all 7 tables"
```

---

### Task 3: Currency and expense-category helpers (TDD)

**Files:**
- Create: `src/lib/currency.ts`
- Create: `src/lib/currency.test.ts`
- Create: `src/lib/expenses/categorize.ts`
- Create: `src/lib/expenses/categorize.test.ts`

**Interfaces:**
- Produces: `formatRsd(amount: number): string`, `formatEur(amount: number): string`, `convertRsdToEur(amountRsd: number, rate: number): number` from `src/lib/currency.ts`. `ExpenseCategory` type, `EXPENSE_CATEGORIES: ExpenseCategory[]`, `EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string>`, `categorizeExpense(description: string): ExpenseCategory` from `src/lib/expenses/categorize.ts` — the API layer (Task 9) and seed script (Task 12) both import these.

- [ ] **Step 1: Write failing tests for currency helpers**

```ts
// src/lib/currency.test.ts
import { describe, expect, it } from 'vitest'
import { convertRsdToEur, formatEur, formatRsd } from './currency'

describe('convertRsdToEur', () => {
  it('divides by the given rate', () => {
    expect(convertRsdToEur(1173, 117.3)).toBeCloseTo(10, 5)
  })

  it('throws on a non-positive rate', () => {
    expect(() => convertRsdToEur(1000, 0)).toThrow()
    expect(() => convertRsdToEur(1000, -5)).toThrow()
  })
})

describe('formatRsd', () => {
  it('includes the whole-number amount with no decimals', () => {
    const result = formatRsd(653900)
    expect(result).toContain('653')
    expect(result).toContain('900')
    expect(result).not.toContain('.00')
  })
})

describe('formatEur', () => {
  it('includes two decimal places', () => {
    const result = formatEur(172968.3761)
    expect(result).toContain('172')
    expect(result).toMatch(/38\b|37\b/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- currency`
Expected: FAIL — `src/lib/currency.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/currency.ts`**

```ts
// src/lib/currency.ts
export function convertRsdToEur(amountRsd: number, rate: number): number {
  if (!(rate > 0)) {
    throw new Error(`Invalid RSD→EUR rate: ${rate}`)
  }
  return amountRsd / rate
}

export function formatRsd(amount: number): string {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.round(amount * 100) / 100)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- currency`
Expected: PASS.

- [ ] **Step 5: Write failing tests for expense categorization**

```ts
// src/lib/expenses/categorize.test.ts
import { describe, expect, it } from 'vitest'
import { categorizeExpense } from './categorize'

describe('categorizeExpense', () => {
  it('categorizes payroll/per-diem entries', () => {
    expect(categorizeExpense('Dnevnica - Aleksandra')).toBe('zarade_bonusi')
    expect(categorizeExpense('Bonus Andrej')).toBe('zarade_bonusi')
    expect(categorizeExpense('Dmevnice')).toBe('zarade_bonusi')
  })

  it('categorizes utility bills', () => {
    expect(categorizeExpense('Gradska čistoća - avgust 2025')).toBe('rezije')
    expect(categorizeExpense('Internet')).toBe('rezije')
    expect(categorizeExpense('mts: april')).toBe('rezije')
  })

  it('categorizes supply restocks', () => {
    expect(categorizeExpense('Kolagen (2 kutije)')).toBe('zalihe')
    expect(categorizeExpense('Članske karte 500 kom')).toBe('zalihe')
    expect(categorizeExpense('Čokoladice')).toBe('zalihe')
  })

  it('categorizes cleaning/maintenance', () => {
    expect(categorizeExpense('Čišćenje')).toBe('odrzavanje')
    expect(categorizeExpense('Zapušenje WC šolje')).toBe('odrzavanje')
    expect(categorizeExpense('Dezinsekcija i deratizacija')).toBe('odrzavanje')
  })

  it('falls back to Ostalo for anything unmatched', () => {
    expect(categorizeExpense('Baterije za vagu')).toBe('ostalo')
  })

  it('is case-insensitive', () => {
    expect(categorizeExpense('KOLAGEN')).toBe('zalihe')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm test -- categorize`
Expected: FAIL — `src/lib/expenses/categorize.ts` does not exist.

- [ ] **Step 7: Implement `src/lib/expenses/categorize.ts`**

```ts
// src/lib/expenses/categorize.ts
export const EXPENSE_CATEGORIES = ['zarade_bonusi', 'rezije', 'zalihe', 'odrzavanje', 'ostalo'] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  zarade_bonusi: 'Zarade i bonusi',
  rezije: 'Režije',
  zalihe: 'Zalihe',
  odrzavanje: 'Održavanje',
  ostalo: 'Ostalo',
}

type Rule = { category: ExpenseCategory; keywords: string[] }

const RULES: Rule[] = [
  {
    category: 'zarade_bonusi',
    keywords: ['dnevnica', 'dnevnice', 'dmevnice', 'bonus'],
  },
  {
    category: 'rezije',
    keywords: ['gradska čistoća', 'gradska cistoca', 'internet', 'mts', 'struja', 'telekom', 'račun', 'racun'],
  },
  {
    category: 'zalihe',
    keywords: [
      'kolagen',
      'nocco',
      'čokoladic',
      'cokoladic',
      'pre-workout',
      'protein',
      'članske karte',
      'clanske karte',
    ],
  },
  {
    category: 'odrzavanje',
    keywords: [
      'čišćenje',
      'ciscenje',
      'hemija',
      'kese',
      'toalet',
      ' wc ',
      'wc šolj',
      'dezinsekcija',
      'deratizacija',
      'asepsol',
      'džak',
      'dzak',
      'kant',
      'klim',
    ],
  },
]

export function categorizeExpense(description: string): ExpenseCategory {
  const normalized = ` ${description.toLowerCase()} `
  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.category
    }
  }
  return 'ostalo'
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm test -- categorize`
Expected: PASS — all 6 tests green.

- [ ] **Step 9: Commit**

```bash
git add src/lib/currency.ts src/lib/currency.test.ts src/lib/expenses/categorize.ts src/lib/expenses/categorize.test.ts
git commit -m "feat: add RSD/EUR currency helpers and expense auto-categorization"
```

---

### Task 4: Auth — session cookie, login route, route protection

**Files:**
- Create: `src/lib/auth/session.ts`
- Create: `src/lib/auth/session.test.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/middleware.ts`

**Interfaces:**
- Consumes: `APP_PASSWORD`, `SESSION_SECRET` env vars.
- Produces: `SESSION_COOKIE_NAME: string`, `SESSION_MAX_AGE: number` (seconds), `createSessionToken(issuedAtMs?: number): Promise<string>`, `verifySessionToken(token: string | undefined | null): Promise<boolean>` from `src/lib/auth/session.ts`. These use the Web Crypto API (`crypto.subtle`), not Node's `node:crypto`, so `verifySessionToken` works identically whether `middleware.ts` runs on the Edge or Node.js middleware runtime — no runtime-config decision needed.

- [ ] **Step 1: Write failing tests for the session token**

```ts
// src/lib/auth/session.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { createSessionToken, verifySessionToken } from './session'

describe('session tokens', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'a'.repeat(32)
  })

  it('verifies a freshly created token', async () => {
    const token = await createSessionToken()
    expect(await verifySessionToken(token)).toBe(true)
  })

  it('rejects a tampered token', async () => {
    const token = await createSessionToken()
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a')
    expect(await verifySessionToken(tampered)).toBe(false)
  })

  it('rejects an expired token', async () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000
    const token = await createSessionToken(thirtyOneDaysAgo)
    expect(await verifySessionToken(token)).toBe(false)
  })

  it('rejects a missing token', async () => {
    expect(await verifySessionToken(null)).toBe(false)
    expect(await verifySessionToken(undefined)).toBe(false)
  })

  it('rejects a malformed token', async () => {
    expect(await verifySessionToken('not-a-token')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- session`
Expected: FAIL — `src/lib/auth/session.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/auth/session.ts`**

```ts
// src/lib/auth/session.ts
export const SESSION_COOKIE_NAME = 'gymfit_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days, in seconds

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set to at least 32 characters')
  }
  return secret
}

async function importKey(): Promise<CryptoKey> {
  const secretBytes = new TextEncoder().encode(getSecret())
  return crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function createSessionToken(issuedAtMs: number = Date.now()): Promise<string> {
  const payload = `session.${issuedAtMs}`
  const key = await importKey()
  const signatureBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return `${payload}.${toBase64Url(signatureBytes)}`
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [marker, issuedAtRaw] = parts
  if (marker !== 'session') return false
  const issuedAtMs = Number(issuedAtRaw)
  if (!Number.isFinite(issuedAtMs)) return false
  const ageSeconds = (Date.now() - issuedAtMs) / 1000
  if (ageSeconds < 0 || ageSeconds > SESSION_MAX_AGE) return false
  const expected = await createSessionToken(issuedAtMs)
  return expected === token
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- session`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Write the login and logout routes**

```ts
// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server'
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth/session'

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: string }
  const expected = process.env.APP_PASSWORD
  if (!expected) {
    return NextResponse.json({ error: 'APP_PASSWORD nije podešen na serveru' }, { status: 500 })
  }
  if (body.password !== expected) {
    return NextResponse.json({ error: 'Pogrešna lozinka' }, { status: 401 })
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return response
}
```

```ts
// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth/session'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}
```

- [ ] **Step 6: Write the auth middleware**

```ts
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/session'

const PUBLIC_PATHS = new Set(['/login', '/api/auth/login'])

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next()
  }
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (await verifySessionToken(token)) {
    return NextResponse.next()
  }
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const loginUrl = new URL('/login', request.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 7: Verify manually**

Add to `.env.local`:

```
APP_PASSWORD=test-password
SESSION_SECRET=<paste output of: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

Run: `pnpm dev`, then in another terminal:

```bash
curl -i -c /tmp/gymfit-cookie.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' -d '{"password":"wrong"}'
# Expected: 401

curl -i -c /tmp/gymfit-cookie.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' -d '{"password":"test-password"}'
# Expected: 200, Set-Cookie: gymfit_session=...

curl -i -b /tmp/gymfit-cookie.txt http://localhost:3000/dashboard
# Expected: not redirected to /login (200 or the not-found page, since /dashboard doesn't exist yet — but NOT a redirect)

curl -i http://localhost:3000/dashboard
# Expected: 307/308 redirect to /login
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/auth/session.ts src/lib/auth/session.test.ts src/app/api/auth/login/route.ts \
  src/app/api/auth/logout/route.ts src/middleware.ts
git commit -m "feat: add shared-password session auth and route protection"
```

---

### Task 5: Members backend — query module + API routes (TDD on status logic)

**Files:**
- Create: `src/lib/dates.ts` (plain shared utility, not `server-only` — reused by Task 14's client-side overdue-highlighting)
- Create: `src/lib/db/queries/members.ts`
- Create: `src/lib/db/queries/members.test.ts`
- Create: `src/app/api/members/route.ts`
- Create: `src/app/api/members/[id]/route.ts`

**Interfaces:**
- Consumes: `db`, `members` from Task 2.
- Produces: `Member` type, `memberStatus(renewalDate: Date, today?: Date): 'active' | 'not_renewed'`, `listMembers()`, `getMember(id)`, `createMember(input)`, `updateMember(id, input)`, `deleteMember(id)`, `countMembersByStatus(today?)` from `src/lib/db/queries/members.ts`. Routes `GET/POST /api/members`, `PATCH/DELETE /api/members/[id]`.

- [ ] **Step 1: Write failing test for the pure status function**

```ts
// src/lib/db/queries/members.test.ts
import { describe, expect, it } from 'vitest'
import { memberStatus } from './members'

describe('memberStatus', () => {
  it('is active when the renewal date is today or later', () => {
    const today = new Date('2026-08-19')
    expect(memberStatus(new Date('2026-08-19'), today)).toBe('active')
    expect(memberStatus(new Date('2026-08-20'), today)).toBe('active')
  })

  it('is not_renewed when the renewal date is in the past', () => {
    const today = new Date('2026-08-19')
    expect(memberStatus(new Date('2026-08-18'), today)).toBe('not_renewed')
    expect(memberStatus(new Date('2024-01-01'), today)).toBe('not_renewed')
  })

  it('compares by calendar day, not time-of-day', () => {
    // Postgres `date` columns round-trip as UTC midnight; `today` defaults to
    // the real current instant, which is virtually never midnight. A renewal
    // date on today's calendar day must still count as active even though
    // its Date object is numerically earlier than "right now".
    const todayAtNoon = new Date('2026-08-19T12:00:00Z')
    expect(memberStatus(new Date('2026-08-19T00:00:00Z'), todayAtNoon)).toBe('active')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- members`
Expected: FAIL — `src/lib/db/queries/members.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/db/queries/members.ts`**

`toDateKey` lives in `src/lib/dates.ts` — a plain, non-`server-only` shared
utility — not inline here, so the members page (Task 14, a client component)
can reuse the exact same calendar-day comparison for its overdue-renewal
highlighting without duplicating the logic (and risking the same time-of-day
bug this function exists to fix).

```ts
// src/lib/dates.ts
export function toDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}
```

```ts
// src/lib/db/queries/members.ts
import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { members } from '@/lib/db/schema'
import { toDateKey } from '@/lib/dates'

export type Member = typeof members.$inferSelect

export function memberStatus(renewalDate: Date, today: Date = new Date()): 'active' | 'not_renewed' {
  return toDateKey(renewalDate) >= toDateKey(today) ? 'active' : 'not_renewed'
}

export async function listMembers(): Promise<Member[]> {
  return db.select().from(members).orderBy(asc(members.fullName))
}

export async function getMember(id: number): Promise<Member | undefined> {
  const rows = await db.select().from(members).where(eq(members.id, id))
  return rows[0]
}

export async function createMember(input: { fullName: string; membershipRenewalDate: Date }): Promise<Member> {
  const [row] = await db.insert(members).values(input).returning()
  return row
}

export async function updateMember(
  id: number,
  input: Partial<{ fullName: string; membershipRenewalDate: Date }>,
): Promise<Member | undefined> {
  const [row] = await db.update(members).set(input).where(eq(members.id, id)).returning()
  return row
}

export async function deleteMember(id: number): Promise<void> {
  await db.delete(members).where(eq(members.id, id))
}

export async function countMembersByStatus(
  today: Date = new Date(),
): Promise<{ active: number; notRenewed: number; total: number }> {
  const all = await db.select({ membershipRenewalDate: members.membershipRenewalDate }).from(members)
  let active = 0
  for (const row of all) {
    if (memberStatus(new Date(row.membershipRenewalDate), today) === 'active') active++
  }
  return { active, notRenewed: all.length - active, total: all.length }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- members`
Expected: PASS.

- [ ] **Step 5: Write the API routes**

```ts
// src/app/api/members/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createMember, listMembers } from '@/lib/db/queries/members'

const createSchema = z.object({
  fullName: z.string().min(1),
  membershipRenewalDate: z.coerce.date(),
})

export async function GET() {
  const rows = await listMembers()
  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const body = createSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  const member = await createMember(body.data)
  return NextResponse.json(member, { status: 201 })
}
```

```ts
// src/app/api/members/[id]/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { deleteMember, updateMember } from '@/lib/db/queries/members'

const updateSchema = z.object({
  fullName: z.string().min(1).optional(),
  membershipRenewalDate: z.coerce.date().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = updateSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  const member = await updateMember(Number(id), body.data)
  if (!member) {
    return NextResponse.json({ error: 'Član nije pronađen' }, { status: 404 })
  }
  return NextResponse.json(member)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await deleteMember(Number(id))
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Verify manually against the running dev server**

Run: `pnpm dev`, then (with the login cookie from Task 4's manual check):

```bash
curl -s -b /tmp/gymfit-cookie.txt -X POST http://localhost:3000/api/members \
  -H 'Content-Type: application/json' -d '{"fullName":"Test Testić","membershipRenewalDate":"2027-01-01"}'
# Expected: 201, JSON with id

curl -s -b /tmp/gymfit-cookie.txt http://localhost:3000/api/members
# Expected: 200, array containing "Test Testić"
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/queries/members.ts src/lib/db/queries/members.test.ts \
  src/app/api/members/route.ts "src/app/api/members/[id]/route.ts"
git commit -m "feat: add members query module and CRUD API routes"
```

---

### Task 6: Payments backend — member matching (TDD) + query module + API routes

**Files:**
- Create: `src/lib/import/match-member.ts`
- Create: `src/lib/import/match-member.test.ts`
- Create: `src/lib/db/queries/payments.ts`
- Create: `src/app/api/payments/route.ts`
- Create: `src/app/api/payments/[id]/route.ts`

**Interfaces:**
- Consumes: `members` type shape `{ id: number; fullName: string }`.
- Produces: `normalizeName(name: string): string`, `matchMemberIdByName(rawName: string, members: { id: number; fullName: string }[]): number | null` from `src/lib/import/match-member.ts` — reused by Task 12's seed script. `Payment` type, `listPayments(filter?: { memberId?: number })`, `createPayment(input)`, `relinkPayment(id, memberId)`, `deletePayment(id)`, `unmatchedPayments()` from `src/lib/db/queries/payments.ts`. Routes `GET/POST /api/payments`, `PATCH/DELETE /api/payments/[id]`.

- [ ] **Step 1: Write failing tests for member matching**

```ts
// src/lib/import/match-member.test.ts
import { describe, expect, it } from 'vitest'
import { matchMemberIdByName, normalizeName } from './match-member'

const roster = [
  { id: 1, fullName: 'Aleksandar Mažić' },
  { id: 2, fullName: 'Uroš Korać' },
]

describe('normalizeName', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeName('  Aleksandar   Mažić ')).toBe('aleksandar mažić')
  })
})

describe('matchMemberIdByName', () => {
  it('matches on exact name', () => {
    expect(matchMemberIdByName('Aleksandar Mažić', roster)).toBe(1)
  })

  it('matches case- and whitespace-insensitively', () => {
    expect(matchMemberIdByName('  uroš korać', roster)).toBe(2)
  })

  it('returns null when no member matches', () => {
    expect(matchMemberIdByName('Nepostojeći Član', roster)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- match-member`
Expected: FAIL — `src/lib/import/match-member.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/import/match-member.ts`**

```ts
// src/lib/import/match-member.ts
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function matchMemberIdByName(
  rawName: string,
  members: { id: number; fullName: string }[],
): number | null {
  const normalized = normalizeName(rawName)
  const match = members.find((member) => normalizeName(member.fullName) === normalized)
  return match ? match.id : null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- match-member`
Expected: PASS.

- [ ] **Step 5: Implement the payments query module**

```ts
// src/lib/db/queries/payments.ts
import 'server-only'
import { desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { members, payments } from '@/lib/db/schema'
import { matchMemberIdByName } from '@/lib/import/match-member'

export type Payment = typeof payments.$inferSelect

export async function listPayments(filter?: { memberId?: number }): Promise<Payment[]> {
  const query = db.select().from(payments).orderBy(desc(payments.paidAt))
  if (filter?.memberId !== undefined) {
    return query.where(eq(payments.memberId, filter.memberId))
  }
  return query
}

export async function createPayment(input: {
  memberNameRaw: string
  paidAt: Date
  amount: string
}): Promise<Payment> {
  const roster = await db.select({ id: members.id, fullName: members.fullName }).from(members)
  const memberId = matchMemberIdByName(input.memberNameRaw, roster)
  const [row] = await db
    .insert(payments)
    .values({ ...input, memberId })
    .returning()
  return row
}

export async function relinkPayment(id: number, memberId: number): Promise<Payment | undefined> {
  const [row] = await db.update(payments).set({ memberId }).where(eq(payments.id, id)).returning()
  return row
}

export async function deletePayment(id: number): Promise<void> {
  await db.delete(payments).where(eq(payments.id, id))
}

export async function unmatchedPayments(): Promise<Payment[]> {
  return db.select().from(payments).where(isNull(payments.memberId)).orderBy(desc(payments.paidAt))
}
```

- [ ] **Step 6: Write the API routes**

```ts
// src/app/api/payments/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createPayment, listPayments } from '@/lib/db/queries/payments'

const createSchema = z.object({
  memberNameRaw: z.string().min(1),
  paidAt: z.coerce.date(),
  amount: z.string().min(1),
})

export async function GET(request: Request) {
  const url = new URL(request.url)
  const memberIdParam = url.searchParams.get('memberId')
  const rows = await listPayments(memberIdParam ? { memberId: Number(memberIdParam) } : undefined)
  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const body = createSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  const payment = await createPayment(body.data)
  return NextResponse.json(payment, { status: 201 })
}
```

```ts
// src/app/api/payments/[id]/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { deletePayment, relinkPayment } from '@/lib/db/queries/payments'

const relinkSchema = z.object({ memberId: z.number().int().positive() })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = relinkSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  const payment = await relinkPayment(Number(id), body.data.memberId)
  if (!payment) {
    return NextResponse.json({ error: 'Uplata nije pronađena' }, { status: 404 })
  }
  return NextResponse.json(payment)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await deletePayment(Number(id))
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 7: Verify manually**

```bash
curl -s -b /tmp/gymfit-cookie.txt -X POST http://localhost:3000/api/payments \
  -H 'Content-Type: application/json' \
  -d '{"memberNameRaw":"Test Testić","paidAt":"2026-08-19","amount":"4000"}'
# Expected: 201, memberId set to the id created in Task 5's manual check

curl -s -b /tmp/gymfit-cookie.txt -X POST http://localhost:3000/api/payments \
  -H 'Content-Type: application/json' \
  -d '{"memberNameRaw":"Nepostojeći Član","paidAt":"2026-08-19","amount":"4000"}'
# Expected: 201, memberId null
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/import/match-member.ts src/lib/import/match-member.test.ts \
  src/lib/db/queries/payments.ts src/app/api/payments/route.ts "src/app/api/payments/[id]/route.ts"
git commit -m "feat: add payment-to-member matching and payments CRUD API"
```

---

### Task 7: Store backend — products + sales query modules and API routes

**Files:**
- Create: `src/lib/db/queries/store.ts`
- Create: `src/app/api/store/products/route.ts`
- Create: `src/app/api/store/products/[id]/route.ts`
- Create: `src/app/api/store/sales/route.ts`
- Create: `src/app/api/store/sales/[id]/route.ts`

**Interfaces:**
- Produces: `StoreProduct`, `StoreSale` types; `listProducts()`, `createProduct(input)`, `updateProduct(id, input)`; `listSales(filter?: { productId?: number })`, `createSale(input)`, `deleteSale(id)`; `monthlyProductCounts(year: number): Promise<{ productName: string; month: number; count: number }[]>` from `src/lib/db/queries/store.ts`. Routes `GET/POST /api/store/products`, `PATCH /api/store/products/[id]`, `GET/POST /api/store/sales`, `DELETE /api/store/sales/[id]`.

- [ ] **Step 1: Implement `src/lib/db/queries/store.ts`**

```ts
// src/lib/db/queries/store.ts
import 'server-only'
import { asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { storeProducts, storeSales } from '@/lib/db/schema'

export type StoreProduct = typeof storeProducts.$inferSelect
export type StoreSale = typeof storeSales.$inferSelect

export async function listProducts(): Promise<StoreProduct[]> {
  return db.select().from(storeProducts).orderBy(asc(storeProducts.name))
}

export async function createProduct(input: { name: string; defaultPrice: string }): Promise<StoreProduct> {
  const [row] = await db.insert(storeProducts).values(input).returning()
  return row
}

export async function updateProduct(
  id: number,
  input: Partial<{ name: string; defaultPrice: string; active: boolean }>,
): Promise<StoreProduct | undefined> {
  const [row] = await db.update(storeProducts).set(input).where(eq(storeProducts.id, id)).returning()
  return row
}

export async function listSales(filter?: { productId?: number }): Promise<StoreSale[]> {
  const query = db.select().from(storeSales).orderBy(desc(storeSales.soldAt))
  if (filter?.productId !== undefined) {
    return query.where(eq(storeSales.productId, filter.productId))
  }
  return query
}

export async function createSale(input: {
  productId: number
  soldAt: Date
  price: string
  quantity?: number
}): Promise<StoreSale> {
  const [row] = await db
    .insert(storeSales)
    .values({ quantity: 1, ...input })
    .returning()
  return row
}

export async function deleteSale(id: number): Promise<void> {
  await db.delete(storeSales).where(eq(storeSales.id, id))
}

export async function monthlyProductCounts(
  year: number,
): Promise<{ productName: string; month: number; count: number }[]> {
  const rows = await db.execute(sql`
    select ${storeProducts.name} as "productName",
           extract(month from ${storeSales.soldAt})::int as month,
           sum(${storeSales.quantity})::int as count
    from ${storeSales}
    join ${storeProducts} on ${storeProducts.id} = ${storeSales.productId}
    where extract(year from ${storeSales.soldAt}) = ${year}
    group by "productName", month
    order by month
  `)
  return rows as unknown as { productName: string; month: number; count: number }[]
}
```

- [ ] **Step 2: Write the API routes**

```ts
// src/app/api/store/products/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createProduct, listProducts } from '@/lib/db/queries/store'

const createSchema = z.object({ name: z.string().min(1), defaultPrice: z.string().min(1) })

export async function GET() {
  return NextResponse.json(await listProducts())
}

export async function POST(request: Request) {
  const body = createSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  return NextResponse.json(await createProduct(body.data), { status: 201 })
}
```

```ts
// src/app/api/store/products/[id]/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { updateProduct } from '@/lib/db/queries/store'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  defaultPrice: z.string().min(1).optional(),
  active: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = updateSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  const product = await updateProduct(Number(id), body.data)
  if (!product) {
    return NextResponse.json({ error: 'Proizvod nije pronađen' }, { status: 404 })
  }
  return NextResponse.json(product)
}
```

```ts
// src/app/api/store/sales/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSale, listSales } from '@/lib/db/queries/store'

const createSchema = z.object({
  productId: z.number().int().positive(),
  soldAt: z.coerce.date(),
  price: z.string().min(1),
  quantity: z.number().int().positive().optional(),
})

export async function GET(request: Request) {
  const url = new URL(request.url)
  const productIdParam = url.searchParams.get('productId')
  const rows = await listSales(productIdParam ? { productId: Number(productIdParam) } : undefined)
  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const body = createSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  return NextResponse.json(await createSale(body.data), { status: 201 })
}
```

```ts
// src/app/api/store/sales/[id]/route.ts
import { NextResponse } from 'next/server'
import { deleteSale } from '@/lib/db/queries/store'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await deleteSale(Number(id))
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Verify manually**

```bash
curl -s -b /tmp/gymfit-cookie.txt -X POST http://localhost:3000/api/store/products \
  -H 'Content-Type: application/json' -d '{"name":"Protein","defaultPrice":"3500"}'
# Expected: 201, capture the returned id as PRODUCT_ID

curl -s -b /tmp/gymfit-cookie.txt -X POST http://localhost:3000/api/store/sales \
  -H 'Content-Type: application/json' \
  -d '{"productId":PRODUCT_ID,"soldAt":"2026-08-19","price":"3500","quantity":2}'
# Expected: 201, quantity 2

curl -s -b /tmp/gymfit-cookie.txt http://localhost:3000/api/store/products
# Expected: 200, includes "Protein"
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/queries/store.ts src/app/api/store
git commit -m "feat: add store products/sales query module and CRUD API"
```

---

### Task 8: Expenses backend — query module + API routes

**Files:**
- Create: `src/lib/db/queries/expenses.ts`
- Create: `src/app/api/expenses/route.ts`
- Create: `src/app/api/expenses/[id]/route.ts`

**Interfaces:**
- Consumes: `ExpenseCategory`, `EXPENSE_CATEGORIES` from Task 3's `src/lib/expenses/categorize.ts`.
- Produces: `Expense` type, `listExpenses(filter?: { category?: ExpenseCategory })`, `createExpense(input)`, `updateExpense(id, input)`, `deleteExpense(id)`, `monthlyExpensesByCategory(year: number): Promise<{ category: ExpenseCategory; month: number; total: number }[]>` from `src/lib/db/queries/expenses.ts`. Routes `GET/POST /api/expenses`, `PATCH/DELETE /api/expenses/[id]`.

- [ ] **Step 1: Implement `src/lib/db/queries/expenses.ts`**

```ts
// src/lib/db/queries/expenses.ts
import 'server-only'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { expenses } from '@/lib/db/schema'
import type { ExpenseCategory } from '@/lib/expenses/categorize'

export type Expense = typeof expenses.$inferSelect

export async function listExpenses(filter?: { category?: ExpenseCategory }): Promise<Expense[]> {
  const query = db.select().from(expenses).orderBy(desc(expenses.expenseDate))
  if (filter?.category) {
    return query.where(eq(expenses.category, filter.category))
  }
  return query
}

export async function createExpense(input: {
  expenseDate: Date
  description: string
  amount: string
  category: ExpenseCategory
}): Promise<Expense> {
  const [row] = await db.insert(expenses).values(input).returning()
  return row
}

export async function updateExpense(
  id: number,
  input: Partial<{ expenseDate: Date; description: string; amount: string; category: ExpenseCategory }>,
): Promise<Expense | undefined> {
  const [row] = await db.update(expenses).set(input).where(eq(expenses.id, id)).returning()
  return row
}

export async function deleteExpense(id: number): Promise<void> {
  await db.delete(expenses).where(eq(expenses.id, id))
}

export async function monthlyExpensesByCategory(
  year: number,
): Promise<{ category: ExpenseCategory; month: number; total: number }[]> {
  const rows = await db.execute(sql`
    select ${expenses.category} as category,
           extract(month from ${expenses.expenseDate})::int as month,
           sum(${expenses.amount})::numeric as total
    from ${expenses}
    where extract(year from ${expenses.expenseDate}) = ${year}
    group by category, month
    order by month
  `)
  return (rows as unknown as { category: ExpenseCategory; month: number; total: string }[]).map((row) => ({
    ...row,
    total: Number(row.total),
  }))
}
```

- [ ] **Step 2: Write the API routes**

```ts
// src/app/api/expenses/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { EXPENSE_CATEGORIES } from '@/lib/expenses/categorize'
import { createExpense, listExpenses } from '@/lib/db/queries/expenses'

const createSchema = z.object({
  expenseDate: z.coerce.date(),
  description: z.string().min(1),
  amount: z.string().min(1),
  category: z.enum(EXPENSE_CATEGORIES),
})

export async function GET(request: Request) {
  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const rows = await listExpenses(category ? { category: category as (typeof EXPENSE_CATEGORIES)[number] } : undefined)
  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const body = createSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  return NextResponse.json(await createExpense(body.data), { status: 201 })
}
```

```ts
// src/app/api/expenses/[id]/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { EXPENSE_CATEGORIES } from '@/lib/expenses/categorize'
import { deleteExpense, updateExpense } from '@/lib/db/queries/expenses'

const updateSchema = z.object({
  expenseDate: z.coerce.date().optional(),
  description: z.string().min(1).optional(),
  amount: z.string().min(1).optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = updateSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  const expense = await updateExpense(Number(id), body.data)
  if (!expense) {
    return NextResponse.json({ error: 'Trošak nije pronađen' }, { status: 404 })
  }
  return NextResponse.json(expense)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await deleteExpense(Number(id))
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Verify manually**

```bash
curl -s -b /tmp/gymfit-cookie.txt -X POST http://localhost:3000/api/expenses \
  -H 'Content-Type: application/json' \
  -d '{"expenseDate":"2026-08-19","description":"Hemija","amount":"2900","category":"odrzavanje"}'
# Expected: 201

curl -s -b /tmp/gymfit-cookie.txt http://localhost:3000/api/expenses
# Expected: 200, includes the row just created
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/queries/expenses.ts src/app/api/expenses
git commit -m "feat: add expenses query module and CRUD API"
```

---

### Task 9: Investments & settings backend — ledger, exchange rate, dashboard rollups (TDD on the formulas)

**Files:**
- Create: `src/lib/db/queries/settings.ts`
- Create: `src/lib/db/queries/investments.ts`
- Create: `src/lib/db/queries/dashboard.ts`
- Create: `src/lib/db/queries/dashboard.test.ts`
- Create: `src/app/api/settings/route.ts`
- Create: `src/app/api/investments/route.ts`
- Create: `src/app/api/investments/[id]/route.ts`
- Create: `src/app/api/dashboard/route.ts`

**Interfaces:**
- Produces: `getExchangeRate()`, `setExchangeRate(rate)` from `src/lib/db/queries/settings.ts`. `CapitalInvestment` type, `listCapitalInvestments()`, `createCapitalInvestment(input)`, `deleteCapitalInvestment(id)`, `totalInvestedEur()` from `src/lib/db/queries/investments.ts`. Pure functions `computeMonthRollup(zarada: number, troskovi: number): { stanje: number; podela: number }` and `computeYearlyEurTotals(rows: { stanje: number; podela: number }[], rate: number): { ukupnaZaradaEur: number; zaradaEur: number }`, plus DB-backed `monthlyRollup(year)` and `yearlyTotalsEur(year)`, from `src/lib/db/queries/dashboard.ts`. Routes `GET/PATCH /api/settings`, `GET/POST /api/investments`, `DELETE /api/investments/[id]`, `GET /api/dashboard?year=`.

- [ ] **Step 1: Implement `src/lib/db/queries/settings.ts`**

```ts
// src/lib/db/queries/settings.ts
import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { settings } from '@/lib/db/schema'

const EXCHANGE_RATE_KEY = 'rsd_to_eur_rate'
const DEFAULT_EXCHANGE_RATE = 117.3

export async function getSetting(key: string): Promise<string | null> {
  const rows = await db.select().from(settings).where(eq(settings.key, key))
  return rows[0]?.value ?? null
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } })
}

export async function getExchangeRate(): Promise<number> {
  const value = await getSetting(EXCHANGE_RATE_KEY)
  return value ? Number(value) : DEFAULT_EXCHANGE_RATE
}

export async function setExchangeRate(rate: number): Promise<void> {
  if (!(rate > 0)) {
    throw new Error(`Invalid exchange rate: ${rate}`)
  }
  await setSetting(EXCHANGE_RATE_KEY, String(rate))
}

export { DEFAULT_EXCHANGE_RATE, EXCHANGE_RATE_KEY }
```

- [ ] **Step 2: Implement `src/lib/db/queries/investments.ts`**

```ts
// src/lib/db/queries/investments.ts
import 'server-only'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { capitalInvestments } from '@/lib/db/schema'

export type CapitalInvestment = typeof capitalInvestments.$inferSelect

export async function listCapitalInvestments(): Promise<CapitalInvestment[]> {
  return db.select().from(capitalInvestments).orderBy(desc(capitalInvestments.investedAt))
}

export async function createCapitalInvestment(input: {
  investedAt: Date
  amountEur: string
  note?: string
}): Promise<CapitalInvestment> {
  const [row] = await db.insert(capitalInvestments).values(input).returning()
  return row
}

export async function deleteCapitalInvestment(id: number): Promise<void> {
  await db.delete(capitalInvestments).where(eq(capitalInvestments.id, id))
}

export async function totalInvestedEur(): Promise<number> {
  const [row] = (await db.execute(
    sql`select coalesce(sum(${capitalInvestments.amountEur}), 0)::numeric as total from ${capitalInvestments}`,
  )) as unknown as { total: string }[]
  return Number(row.total)
}
```

- [ ] **Step 3: Write failing tests for the rollup formulas**

```ts
// src/lib/db/queries/dashboard.test.ts
import { describe, expect, it } from 'vitest'
import { computeMonthRollup, computeYearlyEurTotals } from './dashboard'

describe('computeMonthRollup', () => {
  it('matches the spreadsheet formula: Stanje = Zarada - Troškovi, Podela = Stanje / 2', () => {
    const result = computeMonthRollup(653900, 19200)
    expect(result.stanje).toBe(634700)
    expect(result.podela).toBe(317350)
  })
})

describe('computeYearlyEurTotals', () => {
  it('sums Stanje and Podela across months and converts to EUR at the given rate', () => {
    const rows = [
      { stanje: 634700, podela: 317350 },
      { stanje: 641193, podela: 320596.5 },
    ]
    const rate = 117.3283
    const result = computeYearlyEurTotals(rows, rate)
    expect(result.ukupnaZaradaEur).toBeCloseTo((634700 + 641193) / rate, 2)
    expect(result.zaradaEur).toBeCloseTo((317350 + 320596.5) / rate, 2)
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test -- dashboard`
Expected: FAIL — `src/lib/db/queries/dashboard.ts` does not exist.

- [ ] **Step 5: Implement `src/lib/db/queries/dashboard.ts`**

```ts
// src/lib/db/queries/dashboard.ts
import 'server-only'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { expenses, payments, storeSales } from '@/lib/db/schema'
import { getExchangeRate } from './settings'

export type MonthlyRollup = { month: number; zarada: number; troskovi: number; stanje: number; podela: number }

export function computeMonthRollup(zarada: number, troskovi: number): { stanje: number; podela: number } {
  const stanje = zarada - troskovi
  return { stanje, podela: stanje / 2 }
}

export function computeYearlyEurTotals(
  rows: { stanje: number; podela: number }[],
  rate: number,
): { ukupnaZaradaEur: number; zaradaEur: number } {
  if (!(rate > 0)) {
    throw new Error(`Invalid RSD→EUR rate: ${rate}`)
  }
  const stanjeSum = rows.reduce((sum, row) => sum + row.stanje, 0)
  const podelaSum = rows.reduce((sum, row) => sum + row.podela, 0)
  return { ukupnaZaradaEur: stanjeSum / rate, zaradaEur: podelaSum / rate }
}

async function monthlyIncome(year: number): Promise<Map<number, number>> {
  const paymentRows = (await db.execute(sql`
    select extract(month from ${payments.paidAt})::int as month, sum(${payments.amount})::numeric as total
    from ${payments}
    where extract(year from ${payments.paidAt}) = ${year}
    group by month
  `)) as unknown as { month: number; total: string }[]
  const saleRows = (await db.execute(sql`
    select extract(month from ${storeSales.soldAt})::int as month,
           sum(${storeSales.price} * ${storeSales.quantity})::numeric as total
    from ${storeSales}
    where extract(year from ${storeSales.soldAt}) = ${year}
    group by month
  `)) as unknown as { month: number; total: string }[]
  const income = new Map<number, number>()
  for (const row of [...paymentRows, ...saleRows]) {
    income.set(row.month, (income.get(row.month) ?? 0) + Number(row.total))
  }
  return income
}

async function monthlyExpenseTotals(year: number): Promise<Map<number, number>> {
  const rows = (await db.execute(sql`
    select extract(month from ${expenses.expenseDate})::int as month, sum(${expenses.amount})::numeric as total
    from ${expenses}
    where extract(year from ${expenses.expenseDate}) = ${year}
    group by month
  `)) as unknown as { month: number; total: string }[]
  const totals = new Map<number, number>()
  for (const row of rows) {
    totals.set(row.month, Number(row.total))
  }
  return totals
}

export async function monthlyRollup(year: number): Promise<MonthlyRollup[]> {
  const [income, expenseTotals] = await Promise.all([monthlyIncome(year), monthlyExpenseTotals(year)])
  const result: MonthlyRollup[] = []
  for (let month = 1; month <= 12; month++) {
    const zarada = income.get(month) ?? 0
    const troskovi = expenseTotals.get(month) ?? 0
    const { stanje, podela } = computeMonthRollup(zarada, troskovi)
    result.push({ month, zarada, troskovi, stanje, podela })
  }
  return result
}

export async function yearlyTotalsEur(year: number): Promise<{ ukupnaZaradaEur: number; zaradaEur: number }> {
  const rows = await monthlyRollup(year)
  const rate = await getExchangeRate()
  return computeYearlyEurTotals(rows, rate)
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test -- dashboard`
Expected: PASS.

- [ ] **Step 7: Write the API routes**

```ts
// src/app/api/settings/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getExchangeRate, setExchangeRate } from '@/lib/db/queries/settings'

const updateSchema = z.object({ rsdToEurRate: z.number().positive() })

export async function GET() {
  return NextResponse.json({ rsdToEurRate: await getExchangeRate() })
}

export async function PATCH(request: Request) {
  const body = updateSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  await setExchangeRate(body.data.rsdToEurRate)
  return NextResponse.json({ rsdToEurRate: body.data.rsdToEurRate })
}
```

```ts
// src/app/api/investments/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createCapitalInvestment, listCapitalInvestments, totalInvestedEur } from '@/lib/db/queries/investments'

const createSchema = z.object({
  investedAt: z.coerce.date(),
  amountEur: z.string().min(1),
  note: z.string().optional(),
})

export async function GET() {
  const [entries, total] = await Promise.all([listCapitalInvestments(), totalInvestedEur()])
  return NextResponse.json({ entries, totalInvestedEur: total })
}

export async function POST(request: Request) {
  const body = createSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  return NextResponse.json(await createCapitalInvestment(body.data), { status: 201 })
}
```

```ts
// src/app/api/investments/[id]/route.ts
import { NextResponse } from 'next/server'
import { deleteCapitalInvestment } from '@/lib/db/queries/investments'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await deleteCapitalInvestment(Number(id))
  return NextResponse.json({ ok: true })
}
```

```ts
// src/app/api/dashboard/route.ts
import { NextResponse } from 'next/server'
import { countMembersByStatus } from '@/lib/db/queries/members'
import { monthlyExpensesByCategory } from '@/lib/db/queries/expenses'
import { monthlyRollup, yearlyTotalsEur } from '@/lib/db/queries/dashboard'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const year = Number(url.searchParams.get('year')) || new Date().getFullYear()
  const [memberCounts, rollup, yearlyTotals, expensesByCategory] = await Promise.all([
    countMembersByStatus(),
    monthlyRollup(year),
    yearlyTotalsEur(year),
    monthlyExpensesByCategory(year),
  ])
  return NextResponse.json({ year, memberCounts, rollup, yearlyTotals, expensesByCategory })
}
```

- [ ] **Step 8: Verify manually**

```bash
curl -s -b /tmp/gymfit-cookie.txt http://localhost:3000/api/dashboard?year=2026 | head -c 500
# Expected: 200, JSON with memberCounts/rollup/yearlyTotals/expensesByCategory
```

- [ ] **Step 9: Commit**

```bash
git add src/lib/db/queries/settings.ts src/lib/db/queries/investments.ts \
  src/lib/db/queries/dashboard.ts src/lib/db/queries/dashboard.test.ts \
  src/app/api/settings src/app/api/investments src/app/api/dashboard
git commit -m "feat: add settings, investments, and dashboard rollup backend"
```

---

### Task 10: Seed/import script

**Files:**
- Create: `scripts/seed-import.ts`
- Create: `seed-data/.gitkeep`

**Interfaces:**
- Consumes: `db` from `scripts/db-client.ts` (Task 2 — NOT `src/lib/db/client.ts`: that module is marked `server-only`, which throws unconditionally under `tsx`'s runtime since tsx doesn't set the `react-server` export condition Next's bundler uses to no-op the guard; `scripts/db-client.ts` is the same postgres+drizzle setup without that guard, added during Task 2 for exactly this reason), schema tables from Task 2; `matchMemberIdByName` from Task 6; `categorizeExpense` from Task 3.
- Produces: `pnpm seed:import [--dir ./seed-data]` — reads `Members.csv`, `Payments.csv`, `Store.csv`, `Expenses.csv` from the given directory and upserts them. Skips a table's import (with a printed message) if it already has any rows, so a re-run after a crash-and-restart is safe but never overwrites live data entered later through the app; each table's import runs inside one transaction so a mid-import crash leaves that table untouched rather than half-populated.

- [ ] **Step 1: Write `scripts/seed-import.ts`**

```ts
// scripts/seed-import.ts
import './load-env'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'csv-parse/sync'
import { eq } from 'drizzle-orm'
import { db } from './db-client'
import { expenses, members, payments, storeProducts, storeSales } from '../src/lib/db/schema'
import { categorizeExpense } from '../src/lib/expenses/categorize'
import { matchMemberIdByName } from '../src/lib/import/match-member'

function parseSerbianDate(raw: string): Date {
  const [day, month, year] = raw.trim().split('.').map(Number)
  if (!day || !month || !year) {
    throw new Error(`Cannot parse date: "${raw}"`)
  }
  const fullYear = year < 100 ? 2000 + year : year
  return new Date(Date.UTC(fullYear, month - 1, day))
}

function readCsv(path: string): Record<string, string>[] {
  const content = readFileSync(path, 'utf-8')
  return parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]
}

async function importMembers(dir: string): Promise<void> {
  const [existing] = await db.select().from(members).limit(1)
  if (existing) {
    console.log('Members: table already has rows, skipping.')
    return
  }
  const rows = readCsv(resolve(dir, 'Members.csv'))
  await db.transaction(async (tx) => {
    for (const row of rows) {
      const fullName = row['Ime i prezime']
      const renewalRaw = row['Obnova članarine']
      if (!fullName || !renewalRaw) continue
      await tx.insert(members).values({ fullName, membershipRenewalDate: parseSerbianDate(renewalRaw) })
    }
  })
  console.log(`Members: inserted ${rows.length} rows.`)
}

async function importPayments(dir: string): Promise<void> {
  const [existing] = await db.select().from(payments).limit(1)
  if (existing) {
    console.log('Payments: table already has rows, skipping.')
    return
  }
  const rows = readCsv(resolve(dir, 'Payments.csv'))
  const roster = await db.select({ id: members.id, fullName: members.fullName }).from(members)
  const unmatched: string[] = []
  let inserted = 0
  await db.transaction(async (tx) => {
    for (const row of rows) {
      const memberNameRaw = row['Član']
      const dateRaw = row['Datum']
      const amountRaw = row['Cena']
      if (!memberNameRaw || !dateRaw || !amountRaw) continue
      const memberId = matchMemberIdByName(memberNameRaw, roster)
      if (memberId === null) unmatched.push(memberNameRaw)
      await tx.insert(payments).values({
        memberId,
        memberNameRaw,
        paidAt: parseSerbianDate(dateRaw),
        amount: amountRaw,
      })
      inserted++
    }
  })
  console.log(`Payments: inserted ${inserted} of ${rows.length} CSV rows (the rest were blank).`)
  if (unmatched.length > 0) {
    const distinct = [...new Set(unmatched)]
    console.log(`Payments: ${unmatched.length} rows (${distinct.length} distinct names) did not match a member:`)
    for (const name of distinct) console.log(`  - ${name}`)
  }
}

async function importStore(dir: string): Promise<void> {
  const [existing] = await db.select().from(storeSales).limit(1)
  if (existing) {
    console.log('Store: sales table already has rows, skipping.')
    return
  }
  const rows = readCsv(resolve(dir, 'Store.csv'))
  const productNames = [...new Set(rows.map((row) => row['Proizvod']).filter(Boolean))]
  const productIdByName = new Map<string, number>()
  for (const name of productNames) {
    const [existingProduct] = await db.select().from(storeProducts).where(eq(storeProducts.name, name))
    if (existingProduct) {
      productIdByName.set(name, existingProduct.id)
      continue
    }
    const firstPrice = rows.find((row) => row['Proizvod'] === name)?.['Cena'] ?? '0'
    const [created] = await db.insert(storeProducts).values({ name, defaultPrice: firstPrice }).returning()
    productIdByName.set(name, created.id)
  }
  await db.transaction(async (tx) => {
    for (const row of rows) {
      const name = row['Proizvod']
      const dateRaw = row['Datum']
      const priceRaw = row['Cena']
      if (!name || !dateRaw || !priceRaw) continue
      const productId = productIdByName.get(name)
      if (!productId) continue
      await tx.insert(storeSales).values({ productId, soldAt: parseSerbianDate(dateRaw), price: priceRaw, quantity: 1 })
    }
  })
  console.log(`Store: seeded ${productNames.length} products, inserted ${rows.length} sales.`)
}

async function importExpenses(dir: string): Promise<void> {
  const [existing] = await db.select().from(expenses).limit(1)
  if (existing) {
    console.log('Expenses: table already has rows, skipping.')
    return
  }
  const rows = readCsv(resolve(dir, 'Expenses.csv'))
  const categoryCounts: Record<string, number> = {}
  await db.transaction(async (tx) => {
    for (const row of rows) {
      const dateRaw = row['Datum']
      const description = row['Naziv']
      const amountRaw = row['Cena']
      if (!dateRaw || !description || !amountRaw) continue
      const category = categorizeExpense(description)
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1
      await tx.insert(expenses).values({ expenseDate: parseSerbianDate(dateRaw), description, amount: amountRaw, category })
    }
  })
  console.log(`Expenses: inserted ${rows.length} rows.`)
  console.log('Expenses by category:', categoryCounts)
}

async function main(): Promise<void> {
  const dirArgIndex = process.argv.indexOf('--dir')
  const dir = dirArgIndex >= 0 ? process.argv[dirArgIndex + 1] : './seed-data'
  console.log(`Importing from ${resolve(dir)}`)
  await importMembers(dir)
  await importPayments(dir)
  await importStore(dir)
  await importExpenses(dir)
  console.log('Done.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 2: Create the seed-data placeholder**

```
# seed-data/.gitkeep
```

(`seed-data/` is already gitignored from Task 1 — CSVs with real member data never get committed.)

- [ ] **Step 3: Verify against real data**

```bash
mkdir -p seed-data
cp "/Users/djuro/Downloads/GymFit Members - Members.csv" seed-data/Members.csv
cp "/Users/djuro/Downloads/GymFit Members - Payments.csv" seed-data/Payments.csv
cp "/Users/djuro/Downloads/GymFit Members - Store.csv" seed-data/Store.csv
cp "/Users/djuro/Downloads/GymFit Members - Expenses.csv" seed-data/Expenses.csv
```

Run: `pnpm seed:import`
Expected: prints inserted counts for all four tables (1521 members, 7543 payments, 1172 store sales, 1062 expenses) plus the unmatched-payments report and the expenses-by-category breakdown; exits 0.

Run: `pnpm seed:import` again
Expected: prints "already has rows, skipping" for all four — proves idempotency.

Run: `pnpm probe:db`
Expected: still passes.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-import.ts seed-data/.gitkeep package.json pnpm-lock.yaml
git commit -m "feat: add idempotent CSV seed-import script"
```

---

### Task 11: Shared UI shell and components

**Files:**
- Create: `src/app/providers.tsx`
- Create: `src/app/(app)/layout.tsx`
- Create: `src/components/shell/Nav.tsx`
- Create: `src/components/ui/StatCard.tsx`
- Create: `src/components/ui/Table.tsx`
- Create: `src/components/ui/Modal.tsx`
- Create: `src/components/ui/Field.tsx`
- Create: `src/components/ui/Button.tsx`

**Interfaces:**
- Produces: `<Providers>` (react-query provider), `<AppLayout>` (route group layout with nav), `<Nav>`, `<StatCard label value hint? />`, `<Table columns rows />`, `<Modal open onClose title children />`, `<Field label htmlFor children />`, `<Button variant? ...props />` — every page task (12–18) imports these instead of rebuilding table/modal/form chrome.

- [ ] **Step 1: Write the React Query provider**

```tsx
// src/app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient())
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
```

Update `src/app/layout.tsx` to wrap children:

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'GymFit',
  description: 'Interni dashboard za vođenje teretane',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Write the nav and the `(app)` layout**

```tsx
// src/components/shell/Nav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const LINKS = [
  { href: '/dashboard', label: 'Pregled' },
  { href: '/members', label: 'Članovi' },
  { href: '/payments', label: 'Uplate' },
  { href: '/store', label: 'Prodavnica' },
  { href: '/expenses', label: 'Troškovi' },
  { href: '/investments', label: 'Investicije' },
  { href: '/settings', label: 'Podešavanja' },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1 p-4">
      <div className="mb-6 text-lg font-bold tracking-tight text-white">GYMFIT</div>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={clsx(
            'rounded-md px-3 py-2 text-sm font-medium transition-colors',
            pathname.startsWith(link.href) ? 'bg-white text-black' : 'text-neutral-300 hover:bg-neutral-800',
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
```

```tsx
// src/app/(app)/layout.tsx
import { Nav } from '@/components/shell/Nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-neutral-800 bg-neutral-950">
        <Nav />
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Write the shared UI primitives**

```tsx
// src/components/ui/StatCard.tsx
export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 shadow-sm transition-transform hover:-translate-y-0.5">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
      {hint && <div className="mt-1 text-xs text-neutral-500">{hint}</div>}
    </div>
  )
}
```

```tsx
// src/components/ui/Table.tsx
export function Table<T extends { id: number | string }>({
  columns,
  rows,
}: {
  columns: { key: string; label: string; render: (row: T) => React.ReactNode }[]
  rows: T[]
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-900 text-neutral-400">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-2 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-neutral-800 hover:bg-neutral-900/60">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-2">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

```tsx
// src/components/ui/Modal.tsx
'use client'

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white" aria-label="Zatvori">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

```tsx
// src/components/ui/Field.tsx
export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label htmlFor={htmlFor} className="mb-1 block text-sm text-neutral-400">
        {label}
      </label>
      {children}
    </div>
  )
}
```

```tsx
// src/components/ui/Button.tsx
import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return (
    <button
      className={clsx(
        'rounded-md px-4 py-2 text-sm font-medium transition-colors',
        variant === 'primary' && 'bg-white text-black hover:bg-neutral-200',
        variant === 'secondary' && 'border border-neutral-700 text-white hover:bg-neutral-800',
        variant === 'danger' && 'bg-red-900 text-white hover:bg-red-800',
        className,
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass (no pages consume these components yet, but they must compile standalone).

- [ ] **Step 5: Commit**

```bash
git add src/app/providers.tsx src/app/layout.tsx "src/app/(app)/layout.tsx" src/components
git commit -m "feat: add react-query provider, app shell nav, and shared UI primitives"
```

---

### Task 12: Login page

**Files:**
- Create: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/login` from Task 4.
- Produces: `/login` — a form that posts the password and redirects to `/dashboard` on success.

- [ ] **Step 1: Write the login page**

```tsx
// src/app/login/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setSubmitting(false)
    if (!response.ok) {
      const body = await response.json()
      setError(body.error ?? 'Greška pri prijavi')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-950 p-8">
        <h1 className="mb-6 text-center text-2xl font-bold tracking-tight text-white">GYMFIT</h1>
        <Field label="Lozinka" htmlFor="password">
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
            required
          />
        </Field>
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Prijavljivanje...' : 'Prijavi se'}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Verify manually**

Run: `pnpm dev`, open `http://localhost:3000/login` in a browser, submit the wrong password (see the error), then the correct `APP_PASSWORD` (redirects to `/dashboard`, which 404s until Task 13 — that 404 is expected here).

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: add login page"
```

---

### Task 13: Dashboard page

**Files:**
- Create: `src/components/charts/YearOverYearChart.tsx`
- Create: `src/components/charts/ExpensesByCategoryChart.tsx`
- Create: `src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `GET /api/dashboard?year=` (Task 9), `<StatCard>` (Task 11), `formatRsd`/`formatEur` (Task 3).
- Produces: `/dashboard` — stat cards, a multi-year Zarada line chart (fetches 2024/2025/2026 in parallel), and an expense-by-category bar chart for the selected year.

- [ ] **Step 1: Write the year-over-year chart**

```tsx
// src/components/charts/YearOverYearChart.tsx
'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec']
const YEAR_COLORS: Record<number, string> = { 2024: '#60a5fa', 2025: '#f87171', 2026: '#facc15' }

export function YearOverYearChart({ data }: { data: { year: number; rollup: { month: number; zarada: number }[] }[] }) {
  const chartData = MONTH_LABELS.map((label, index) => {
    const month = index + 1
    const row: Record<string, number | string> = { month: label }
    for (const yearData of data) {
      row[String(yearData.year)] = yearData.rollup.find((entry) => entry.month === month)?.zarada ?? 0
    }
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="month" stroke="#a3a3a3" />
        <YAxis stroke="#a3a3a3" />
        <Tooltip contentStyle={{ background: '#171717', border: '1px solid #404040' }} />
        {data.map((yearData) => (
          <Line
            key={yearData.year}
            type="monotone"
            dataKey={String(yearData.year)}
            stroke={YEAR_COLORS[yearData.year] ?? '#a3a3a3'}
            strokeWidth={2}
            dot={false}
            animationDuration={600}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Write the expenses-by-category chart**

```tsx
// src/components/charts/ExpensesByCategoryChart.tsx
'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '@/lib/expenses/categorize'

export function ExpensesByCategoryChart({
  data,
}: {
  data: { category: ExpenseCategory; month: number; total: number }[]
}) {
  const totalsByCategory = new Map<ExpenseCategory, number>()
  for (const row of data) {
    totalsByCategory.set(row.category, (totalsByCategory.get(row.category) ?? 0) + row.total)
  }
  const chartData = Array.from(totalsByCategory.entries()).map(([category, total]) => ({
    category: EXPENSE_CATEGORY_LABELS[category],
    total,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="category" stroke="#a3a3a3" />
        <YAxis stroke="#a3a3a3" />
        <Tooltip contentStyle={{ background: '#171717', border: '1px solid #404040' }} />
        <Bar dataKey="total" fill="#f5f5f5" radius={[4, 4, 0, 0]} animationDuration={600} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: Write the dashboard page**

```tsx
// src/app/(app)/dashboard/page.tsx
'use client'

import { useQueries } from '@tanstack/react-query'
import { ExpensesByCategoryChart } from '@/components/charts/ExpensesByCategoryChart'
import { YearOverYearChart } from '@/components/charts/YearOverYearChart'
import { StatCard } from '@/components/ui/StatCard'
import { formatRsd } from '@/lib/currency'
import type { ExpenseCategory } from '@/lib/expenses/categorize'

type DashboardResponse = {
  year: number
  memberCounts: { active: number; notRenewed: number; total: number }
  rollup: { month: number; zarada: number; troskovi: number; stanje: number; podela: number }[]
  yearlyTotals: { ukupnaZaradaEur: number; zaradaEur: number }
  expensesByCategory: { category: ExpenseCategory; month: number; total: number }[]
}

async function fetchDashboard(year: number): Promise<DashboardResponse> {
  const response = await fetch(`/api/dashboard?year=${year}`)
  if (!response.ok) throw new Error('Failed to load dashboard')
  return response.json()
}

export default function DashboardPage() {
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 2, currentYear - 1, currentYear]

  const queries = useQueries({
    queries: years.map((year) => ({ queryKey: ['dashboard', year], queryFn: () => fetchDashboard(year) })),
  })
  const currentYearQuery = queries[queries.length - 1]

  if (queries.some((query) => query.isLoading)) {
    return <p className="text-neutral-400">Učitavanje...</p>
  }

  const yearOverYearData = queries
    .map((query, index) => (query.data ? { year: years[index], rollup: query.data.rollup } : null))
    .filter((entry): entry is { year: number; rollup: DashboardResponse['rollup'] } => entry !== null)

  const current = currentYearQuery.data

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-white">Pregled</h1>

      {current && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Aktivni članovi" value={String(current.memberCounts.active)} />
          <StatCard label="Neobnovljeno" value={String(current.memberCounts.notRenewed)} />
          <StatCard
            label={`Zarada ovaj mesec (${current.year})`}
            value={formatRsd(current.rollup[new Date().getMonth()]?.zarada ?? 0)}
          />
          <StatCard
            label={`Troškovi ovaj mesec (${current.year})`}
            value={formatRsd(current.rollup[new Date().getMonth()]?.troskovi ?? 0)}
          />
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Zarada po mesecima po godinama</h2>
        <YearOverYearChart data={yearOverYearData} />
      </div>

      {current && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Troškovi po kategoriji ({current.year})</h2>
          <ExpensesByCategoryChart data={current.expensesByCategory} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: all pass (this is the first task where `pnpm build` is expected to fully succeed, since `/dashboard` now exists).

Run: `pnpm dev`, log in, confirm `/dashboard` renders stat cards and both charts without console errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/charts "src/app/(app)/dashboard"
git commit -m "feat: add dashboard page with year-over-year and category charts"
```

---

### Task 14: Members page

**Files:**
- Create: `src/app/(app)/members/page.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/members`, `PATCH/DELETE /api/members/[id]` (Task 5); `<Table>`, `<Modal>`, `<Field>`, `<Button>` (Task 11).
- Produces: `/members` — searchable list, add/edit modal, overdue renewals highlighted in red.

- [ ] **Step 1: Write the members page**

```tsx
// src/app/(app)/members/page.tsx
'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import { toDateKey } from '@/lib/dates'

type Member = { id: number; fullName: string; membershipRenewalDate: string }

async function fetchMembers(): Promise<Member[]> {
  const response = await fetch('/api/members')
  if (!response.ok) throw new Error('Failed to load members')
  return response.json()
}

export default function MembersPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [fullName, setFullName] = useState('')
  const [renewalDate, setRenewalDate] = useState('')

  const filtered = useMemo(
    () => (data ?? []).filter((member) => member.fullName.toLowerCase().includes(search.toLowerCase())),
    [data, search],
  )

  function openCreate() {
    setEditing(null)
    setFullName('')
    setRenewalDate('')
    setModalOpen(true)
  }

  function openEdit(member: Member) {
    setEditing(member)
    setFullName(member.fullName)
    setRenewalDate(member.membershipRenewalDate.slice(0, 10))
    setModalOpen(true)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const payload = { fullName, membershipRenewalDate: renewalDate }
    const response = editing
      ? await fetch(`/api/members/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      alert(body.error ?? 'Greška pri čuvanju člana')
      return
    }
    setModalOpen(false)
    queryClient.invalidateQueries({ queryKey: ['members'] })
  }

  async function handleDelete(id: number) {
    if (!confirm('Obrisati člana?')) return
    const response = await fetch(`/api/members/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      alert('Greška pri brisanju člana')
      return
    }
    queryClient.invalidateQueries({ queryKey: ['members'] })
  }

  if (isLoading) return <p className="text-neutral-400">Učitavanje...</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Članovi</h1>
        <Button onClick={openCreate}>+ Novi član</Button>
      </div>

      <input
        placeholder="Pretraga po imenu..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
      />

      <Table<Member>
        rows={filtered}
        columns={[
          { key: 'fullName', label: 'Ime i prezime', render: (row) => row.fullName },
          {
            key: 'renewal',
            label: 'Obnova članarine',
            render: (row) => {
              const overdue = toDateKey(new Date(row.membershipRenewalDate)) < toDateKey(new Date())
              return (
                <span className={overdue ? 'font-medium text-red-400' : 'text-neutral-200'}>
                  {new Date(row.membershipRenewalDate).toLocaleDateString('sr-RS')}
                </span>
              )
            },
          },
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => openEdit(row)}>
                  Izmeni
                </Button>
                <Button variant="danger" onClick={() => handleDelete(row.id)}>
                  Obriši
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Izmena člana' : 'Novi član'}>
        <form onSubmit={handleSubmit}>
          <Field label="Ime i prezime" htmlFor="fullName">
            <input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Obnova članarine" htmlFor="renewalDate">
            <input
              id="renewalDate"
              type="date"
              value={renewalDate}
              onChange={(event) => setRenewalDate(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Button type="submit" className="w-full">
            Sačuvaj
          </Button>
        </form>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: pass.

Manual: `pnpm dev`, log in, go to `/members`, add a member, edit it, search for it, delete it — confirm each round-trips against the API.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/members"
git commit -m "feat: add members page with search, add/edit, and overdue flagging"
```

---

### Task 15: Payments page

**Files:**
- Create: `src/app/(app)/payments/page.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/payments`, `PATCH /api/payments/[id]` (Task 6), `GET /api/members` (Task 5).
- Produces: `/payments` — list with member/date filter, add form, and a relink control for payments with no matched member.

- [ ] **Step 1: Write the payments page**

```tsx
// src/app/(app)/payments/page.tsx
'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import { formatRsd } from '@/lib/currency'

type Payment = { id: number; memberId: number | null; memberNameRaw: string; paidAt: string; amount: string }
type Member = { id: number; fullName: string }

async function fetchPayments(): Promise<Payment[]> {
  const response = await fetch('/api/payments')
  if (!response.ok) throw new Error('Failed to load payments')
  return response.json()
}

async function fetchMembers(): Promise<Member[]> {
  const response = await fetch('/api/members')
  if (!response.ok) throw new Error('Failed to load members')
  return response.json()
}

export default function PaymentsPage() {
  const queryClient = useQueryClient()
  const { data: payments, isLoading } = useQuery({ queryKey: ['payments'], queryFn: fetchPayments })
  const { data: members } = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const [modalOpen, setModalOpen] = useState(false)
  const [memberNameRaw, setMemberNameRaw] = useState('')
  const [paidAt, setPaidAt] = useState('')
  const [amount, setAmount] = useState('')
  const [relinking, setRelinking] = useState<Payment | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberNameRaw, paidAt, amount }),
    })
    setModalOpen(false)
    setMemberNameRaw('')
    setPaidAt('')
    setAmount('')
    queryClient.invalidateQueries({ queryKey: ['payments'] })
  }

  async function handleRelink(memberId: number) {
    if (!relinking) return
    await fetch(`/api/payments/${relinking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })
    setRelinking(null)
    queryClient.invalidateQueries({ queryKey: ['payments'] })
  }

  if (isLoading) return <p className="text-neutral-400">Učitavanje...</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Uplate</h1>
        <Button onClick={() => setModalOpen(true)}>+ Nova uplata</Button>
      </div>

      <Table<Payment>
        rows={payments ?? []}
        columns={[
          { key: 'member', label: 'Član', render: (row) => row.memberNameRaw },
          {
            key: 'status',
            label: '',
            render: (row) =>
              row.memberId === null ? (
                <button className="text-xs font-medium text-yellow-400 underline" onClick={() => setRelinking(row)}>
                  Nije povezano — poveži
                </button>
              ) : null,
          },
          { key: 'date', label: 'Datum', render: (row) => new Date(row.paidAt).toLocaleDateString('sr-RS') },
          { key: 'amount', label: 'Iznos', render: (row) => formatRsd(Number(row.amount)) },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova uplata">
        <form onSubmit={handleSubmit}>
          <Field label="Ime člana" htmlFor="memberNameRaw">
            <input
              id="memberNameRaw"
              value={memberNameRaw}
              onChange={(event) => setMemberNameRaw(event.target.value)}
              list="member-names"
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
            <datalist id="member-names">
              {(members ?? []).map((member) => (
                <option key={member.id} value={member.fullName} />
              ))}
            </datalist>
          </Field>
          <Field label="Datum" htmlFor="paidAt">
            <input
              id="paidAt"
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Iznos (RSD)" htmlFor="amount">
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Button type="submit" className="w-full">
            Sačuvaj
          </Button>
        </form>
      </Modal>

      <Modal open={relinking !== null} onClose={() => setRelinking(null)} title="Poveži uplatu sa članom">
        <div className="flex flex-col gap-2">
          {(members ?? []).map((member) => (
            <button
              key={member.id}
              onClick={() => handleRelink(member.id)}
              className="rounded-md border border-neutral-700 px-3 py-2 text-left text-white hover:bg-neutral-800"
            >
              {member.fullName}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: pass.

Manual: add a payment with a name that doesn't match any member, confirm the "Nije povezano" link appears, click it, pick a member, confirm it clears.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/payments"
git commit -m "feat: add payments page with add form and unmatched-payment relink"
```

---

### Task 16: Store page

**Files:**
- Create: `src/components/charts/ProductCountsChart.tsx`
- Create: `src/app/(app)/store/page.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/store/products`, `PATCH /api/store/products/[id]`, `GET/POST /api/store/sales` (Task 7).
- Produces: `/store` — product catalog management, a sales log with quantity, and a per-product monthly chart. `GET /api/store/sales?year=` is not implemented server-side; the page fetches all sales and derives the current-year monthly counts client-side, matching how the dashboard derives its own aggregates.

- [ ] **Step 1: Write the product-counts chart**

```tsx
// src/components/charts/ProductCountsChart.tsx
'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec']
const COLORS = ['#60a5fa', '#f87171', '#facc15', '#4ade80', '#a78bfa', '#fb923c']

export function ProductCountsChart({ data }: { data: { productName: string; soldAt: string; quantity: number }[] }) {
  const productNames = [...new Set(data.map((row) => row.productName))]
  const chartData = MONTH_LABELS.map((label, index) => {
    const month = index + 1
    const row: Record<string, number | string> = { month: label }
    for (const productName of productNames) {
      row[productName] = data
        .filter((entry) => entry.productName === productName && new Date(entry.soldAt).getMonth() + 1 === month)
        .reduce((sum, entry) => sum + entry.quantity, 0)
    }
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="month" stroke="#a3a3a3" />
        <YAxis stroke="#a3a3a3" />
        <Tooltip contentStyle={{ background: '#171717', border: '1px solid #404040' }} />
        <Legend />
        {productNames.map((name, index) => (
          <Bar key={name} dataKey={name} stackId="products" fill={COLORS[index % COLORS.length]} animationDuration={600} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Write the store page**

```tsx
// src/app/(app)/store/page.tsx
'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ProductCountsChart } from '@/components/charts/ProductCountsChart'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import { formatRsd } from '@/lib/currency'

type Product = { id: number; name: string; defaultPrice: string; active: boolean }
type Sale = { id: number; productId: number; soldAt: string; price: string; quantity: number }

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('/api/store/products')
  if (!response.ok) throw new Error('Failed to load products')
  return response.json()
}

async function fetchSales(): Promise<Sale[]> {
  const response = await fetch('/api/store/sales')
  if (!response.ok) throw new Error('Failed to load sales')
  return response.json()
}

export default function StorePage() {
  const queryClient = useQueryClient()
  const { data: products, isLoading: productsLoading } = useQuery({ queryKey: ['store-products'], queryFn: fetchProducts })
  const { data: sales, isLoading: salesLoading } = useQuery({ queryKey: ['store-sales'], queryFn: fetchSales })

  const [productModalOpen, setProductModalOpen] = useState(false)
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')

  const [saleModalOpen, setSaleModalOpen] = useState(false)
  const [saleProductId, setSaleProductId] = useState('')
  const [saleDate, setSaleDate] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [saleQuantity, setSaleQuantity] = useState('1')

  async function handleCreateProduct(event: React.FormEvent) {
    event.preventDefault()
    await fetch('/api/store/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: productName, defaultPrice: productPrice }),
    })
    setProductModalOpen(false)
    setProductName('')
    setProductPrice('')
    queryClient.invalidateQueries({ queryKey: ['store-products'] })
  }

  async function handleCreateSale(event: React.FormEvent) {
    event.preventDefault()
    await fetch('/api/store/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: Number(saleProductId),
        soldAt: saleDate,
        price: salePrice,
        quantity: Number(saleQuantity),
      }),
    })
    setSaleModalOpen(false)
    setSaleDate('')
    setSalePrice('')
    setSaleQuantity('1')
    queryClient.invalidateQueries({ queryKey: ['store-sales'] })
  }

  if (productsLoading || salesLoading) return <p className="text-neutral-400">Učitavanje...</p>

  const productById = new Map((products ?? []).map((product) => [product.id, product]))
  const chartData = (sales ?? []).map((sale) => ({
    productName: productById.get(sale.productId)?.name ?? '?',
    soldAt: sale.soldAt,
    quantity: sale.quantity,
  }))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Prodavnica</h1>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Prodaja po proizvodu i mesecu</h2>
        <ProductCountsChart data={chartData} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Proizvodi</h2>
          <Button onClick={() => setProductModalOpen(true)}>+ Novi proizvod</Button>
        </div>
        <Table<Product>
          rows={products ?? []}
          columns={[
            { key: 'name', label: 'Naziv', render: (row) => row.name },
            { key: 'price', label: 'Cena', render: (row) => formatRsd(Number(row.defaultPrice)) },
            { key: 'active', label: 'Aktivan', render: (row) => (row.active ? 'Da' : 'Ne') },
          ]}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Prodaja</h2>
          <Button onClick={() => setSaleModalOpen(true)}>+ Nova prodaja</Button>
        </div>
        <Table<Sale>
          rows={sales ?? []}
          columns={[
            { key: 'product', label: 'Proizvod', render: (row) => productById.get(row.productId)?.name ?? '?' },
            { key: 'date', label: 'Datum', render: (row) => new Date(row.soldAt).toLocaleDateString('sr-RS') },
            { key: 'quantity', label: 'Količina', render: (row) => String(row.quantity) },
            { key: 'price', label: 'Cena', render: (row) => formatRsd(Number(row.price)) },
          ]}
        />
      </div>

      <Modal open={productModalOpen} onClose={() => setProductModalOpen(false)} title="Novi proizvod">
        <form onSubmit={handleCreateProduct}>
          <Field label="Naziv" htmlFor="productName">
            <input
              id="productName"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Cena (RSD)" htmlFor="productPrice">
            <input
              id="productPrice"
              type="number"
              value={productPrice}
              onChange={(event) => setProductPrice(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Button type="submit" className="w-full">
            Sačuvaj
          </Button>
        </form>
      </Modal>

      <Modal open={saleModalOpen} onClose={() => setSaleModalOpen(false)} title="Nova prodaja">
        <form onSubmit={handleCreateSale}>
          <Field label="Proizvod" htmlFor="saleProductId">
            <select
              id="saleProductId"
              value={saleProductId}
              onChange={(event) => setSaleProductId(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            >
              <option value="" disabled>
                Izaberi proizvod
              </option>
              {(products ?? []).map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Datum" htmlFor="saleDate">
            <input
              id="saleDate"
              type="date"
              value={saleDate}
              onChange={(event) => setSaleDate(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Cena (RSD)" htmlFor="salePrice">
            <input
              id="salePrice"
              type="number"
              value={salePrice}
              onChange={(event) => setSalePrice(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Količina" htmlFor="saleQuantity">
            <input
              id="saleQuantity"
              type="number"
              min="1"
              value={saleQuantity}
              onChange={(event) => setSaleQuantity(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Button type="submit" className="w-full">
            Sačuvaj
          </Button>
        </form>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: pass.

Manual: add a product, add a sale against it with quantity 3, confirm the chart and table both reflect it.

- [ ] **Step 4: Commit**

```bash
git add src/components/charts/ProductCountsChart.tsx "src/app/(app)/store"
git commit -m "feat: add store page with product catalog, sales log, and monthly chart"
```

---

### Task 17: Expenses page

**Files:**
- Create: `src/app/(app)/expenses/page.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/expenses`, `PATCH/DELETE /api/expenses/[id]` (Task 8); `ExpensesByCategoryChart` (Task 13); `EXPENSE_CATEGORIES`, `EXPENSE_CATEGORY_LABELS` (Task 3).
- Produces: `/expenses` — list, add/edit with required category, and the category chart for the current year.

- [ ] **Step 1: Write the expenses page**

```tsx
// src/app/(app)/expenses/page.tsx
'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ExpensesByCategoryChart } from '@/components/charts/ExpensesByCategoryChart'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import { formatRsd } from '@/lib/currency'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '@/lib/expenses/categorize'

type Expense = { id: number; expenseDate: string; description: string; amount: string; category: ExpenseCategory }

async function fetchExpenses(): Promise<Expense[]> {
  const response = await fetch('/api/expenses')
  if (!response.ok) throw new Error('Failed to load expenses')
  return response.json()
}

async function fetchDashboardExpenses(year: number): Promise<{ category: ExpenseCategory; month: number; total: number }[]> {
  const response = await fetch(`/api/dashboard?year=${year}`)
  if (!response.ok) throw new Error('Failed to load dashboard')
  const body = await response.json()
  return body.expensesByCategory
}

export default function ExpensesPage() {
  const queryClient = useQueryClient()
  const { data: expenses, isLoading } = useQuery({ queryKey: ['expenses'], queryFn: fetchExpenses })
  const currentYear = new Date().getFullYear()
  const { data: categoryData } = useQuery({
    queryKey: ['dashboard-expenses', currentYear],
    queryFn: () => fetchDashboardExpenses(currentYear),
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [expenseDate, setExpenseDate] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('ostalo')

  function openCreate() {
    setEditing(null)
    setExpenseDate('')
    setDescription('')
    setAmount('')
    setCategory('ostalo')
    setModalOpen(true)
  }

  function openEdit(expense: Expense) {
    setEditing(expense)
    setExpenseDate(expense.expenseDate.slice(0, 10))
    setDescription(expense.description)
    setAmount(expense.amount)
    setCategory(expense.category)
    setModalOpen(true)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const payload = { expenseDate, description, amount, category }
    if (editing) {
      await fetch(`/api/expenses/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    setModalOpen(false)
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-expenses', currentYear] })
  }

  async function handleDelete(id: number) {
    if (!confirm('Obrisati trošak?')) return
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
  }

  if (isLoading) return <p className="text-neutral-400">Učitavanje...</p>

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Troškovi</h1>
        <Button onClick={openCreate}>+ Novi trošak</Button>
      </div>

      {categoryData && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Troškovi po kategoriji ({currentYear})</h2>
          <ExpensesByCategoryChart data={categoryData} />
        </div>
      )}

      <Table<Expense>
        rows={expenses ?? []}
        columns={[
          { key: 'date', label: 'Datum', render: (row) => new Date(row.expenseDate).toLocaleDateString('sr-RS') },
          { key: 'description', label: 'Naziv', render: (row) => row.description },
          { key: 'category', label: 'Kategorija', render: (row) => EXPENSE_CATEGORY_LABELS[row.category] },
          { key: 'amount', label: 'Iznos', render: (row) => formatRsd(Number(row.amount)) },
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => openEdit(row)}>
                  Izmeni
                </Button>
                <Button variant="danger" onClick={() => handleDelete(row.id)}>
                  Obriši
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Izmena troška' : 'Novi trošak'}>
        <form onSubmit={handleSubmit}>
          <Field label="Datum" htmlFor="expenseDate">
            <input
              id="expenseDate"
              type="date"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Naziv" htmlFor="description">
            <input
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Iznos (RSD)" htmlFor="amount">
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Kategorija" htmlFor="category">
            <select
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            >
              {EXPENSE_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {EXPENSE_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" className="w-full">
            Sačuvaj
          </Button>
        </form>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: pass.

Manual: add an expense, edit its category, delete it, confirm the category chart updates after invalidation.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/expenses"
git commit -m "feat: add expenses page with category-required form and category chart"
```

---

### Task 18: Investments and Settings pages

**Files:**
- Create: `src/app/(app)/investments/page.tsx`
- Create: `src/app/(app)/settings/page.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/investments`, `DELETE /api/investments/[id]`, `GET/PATCH /api/settings`, `GET /api/dashboard` (Tasks 9); `formatRsd`/`formatEur`/`convertRsdToEur` (Task 3).
- Produces: `/investments` — RSD+EUR stat cards, capital ledger with add/delete; `/settings` — exchange-rate editor.

- [ ] **Step 1: Write the investments page**

```tsx
// src/app/(app)/investments/page.tsx
'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { Table } from '@/components/ui/Table'
import { formatEur, formatRsd } from '@/lib/currency'

type CapitalInvestment = { id: number; investedAt: string; amountEur: string; note: string | null }
type InvestmentsResponse = { entries: CapitalInvestment[]; totalInvestedEur: number }

async function fetchInvestments(): Promise<InvestmentsResponse> {
  const response = await fetch('/api/investments')
  if (!response.ok) throw new Error('Failed to load investments')
  return response.json()
}

async function fetchDashboard(year: number) {
  const response = await fetch(`/api/dashboard?year=${year}`)
  if (!response.ok) throw new Error('Failed to load dashboard')
  return response.json() as Promise<{ yearlyTotals: { ukupnaZaradaEur: number; zaradaEur: number } }>
}

export default function InvestmentsPage() {
  const queryClient = useQueryClient()
  const { data: investments, isLoading } = useQuery({ queryKey: ['investments'], queryFn: fetchInvestments })
  const currentYear = new Date().getFullYear()
  const { data: dashboard } = useQuery({ queryKey: ['dashboard', currentYear], queryFn: () => fetchDashboard(currentYear) })

  const [modalOpen, setModalOpen] = useState(false)
  const [investedAt, setInvestedAt] = useState('')
  const [amountEur, setAmountEur] = useState('')
  const [note, setNote] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    await fetch('/api/investments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ investedAt, amountEur, note: note || undefined }),
    })
    setModalOpen(false)
    setInvestedAt('')
    setAmountEur('')
    setNote('')
    queryClient.invalidateQueries({ queryKey: ['investments'] })
  }

  async function handleDelete(id: number) {
    if (!confirm('Obrisati unos ulaganja?')) return
    await fetch(`/api/investments/${id}`, { method: 'DELETE' })
    queryClient.invalidateQueries({ queryKey: ['investments'] })
  }

  if (isLoading) return <p className="text-neutral-400">Učitavanje...</p>

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Investicije</h1>
        <Button onClick={() => setModalOpen(true)}>+ Novo ulaganje</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Uloženo" value={formatEur(investments?.totalInvestedEur ?? 0)} />
        <StatCard
          label={`Ukupna zarada (${currentYear})`}
          value={dashboard ? formatEur(dashboard.yearlyTotals.ukupnaZaradaEur) : '—'}
        />
        <StatCard label={`Zarada (${currentYear})`} value={dashboard ? formatEur(dashboard.yearlyTotals.zaradaEur) : '—'} />
      </div>

      <Table<CapitalInvestment>
        rows={investments?.entries ?? []}
        columns={[
          { key: 'date', label: 'Datum', render: (row) => new Date(row.investedAt).toLocaleDateString('sr-RS') },
          { key: 'amount', label: 'Iznos (EUR)', render: (row) => formatEur(Number(row.amountEur)) },
          { key: 'note', label: 'Napomena', render: (row) => row.note ?? '' },
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <Button variant="danger" onClick={() => handleDelete(row.id)}>
                Obriši
              </Button>
            ),
          },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo ulaganje">
        <form onSubmit={handleSubmit}>
          <Field label="Datum" htmlFor="investedAt">
            <input
              id="investedAt"
              type="date"
              value={investedAt}
              onChange={(event) => setInvestedAt(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Iznos (EUR)" htmlFor="amountEur">
            <input
              id="amountEur"
              type="number"
              step="0.01"
              value={amountEur}
              onChange={(event) => setAmountEur(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Napomena" htmlFor="note">
            <input
              id="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
            />
          </Field>
          <Button type="submit" className="w-full">
            Sačuvaj
          </Button>
        </form>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Write the settings page**

```tsx
// src/app/(app)/settings/page.tsx
'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'

async function fetchSettings(): Promise<{ rsdToEurRate: number }> {
  const response = await fetch('/api/settings')
  if (!response.ok) throw new Error('Failed to load settings')
  return response.json()
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings })
  const [rate, setRate] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data) setRate(String(data.rsdToEurRate))
  }, [data])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rsdToEurRate: Number(rate) }),
    })
    setSaved(true)
    queryClient.invalidateQueries({ queryKey: ['settings'] })
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) return <p className="text-neutral-400">Učitavanje...</p>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Podešavanja</h1>
      <form onSubmit={handleSubmit} className="max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <Field label="Kurs RSD → EUR" htmlFor="rate">
          <input
            id="rate"
            type="number"
            step="0.0001"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
            required
          />
        </Field>
        <Button type="submit">{saved ? 'Sačuvano ✓' : 'Sačuvaj'}</Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: all pass — this is the full route set, so `pnpm build` now covers every page.

Manual: on `/settings`, change the rate, save, confirm `/investments`' EUR figures shift accordingly on reload; add and delete a capital investment entry.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/investments" "src/app/(app)/settings"
git commit -m "feat: add investments page (RSD+EUR) and exchange-rate settings page"
```

---

### Task 19: CI, README, db handoff doc, and final seeded verification

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `README.md`
- Create: `db/README.md`
- Modify: `.gitignore` (confirm `db/*.sql` is not ignored — the handoff files must be committed)

**Interfaces:**
- Produces: CI that runs lint/typecheck/test/build on every PR to `main`; a README a new developer or the gym owner can follow end to end; a `db/README.md` for whoever provisions production Postgres.

- [ ] **Step 1: Write the CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-typecheck-test-build:
    name: Lint • Typecheck • Test • Build
    runs-on: ubuntu-latest
    timeout-minutes: 15
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: gymfit
          POSTGRES_PASSWORD: gymfit
          POSTGRES_DB: gymfit_local
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U gymfit -d gymfit_local"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://gymfit:gymfit@localhost:5432/gymfit_local
      APP_PASSWORD: ci-password
      SESSION_SECRET: ci-session-secret-at-least-32-characters-long
    steps:
      - uses: actions/checkout@v5

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Run migrations
        run: pnpm db:migrate

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build
```

- [ ] **Step 2: Write `README.md`**

```markdown
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

\`\`\`bash
pnpm install
cp .env.example .env.local     # fill in APP_PASSWORD and SESSION_SECRET — see below
docker compose up -d           # local Postgres
pnpm db:migrate                # creates all 7 tables
pnpm dev
\`\`\`

Open http://localhost:3000 and log in with the `APP_PASSWORD` you set.

### Environment

| Variable | Needed for |
|---|---|
| `DATABASE_URL` | Postgres connection string. Docker Compose's default is already in `.env.example`. |
| `APP_PASSWORD` | The shared password for the app. |
| `SESSION_SECRET` | Signs the session cookie. 32+ random bytes — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |

## Seeding from the spreadsheet export

Copy the four CSVs (`Members.csv`, `Payments.csv`, `Store.csv`, `Expenses.csv`)
into `seed-data/` (gitignored — real member data never gets committed), then:

\`\`\`bash
pnpm seed:import
\`\`\`

It's idempotent: if a table already has rows, that table's import is skipped
rather than duplicating or overwriting anything, so re-running after a crash
is always safe. It prints which payments didn't match a member by name (fix
those from the Payments page's relink control) and how the historical
expenses were auto-categorized.

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
```

- [ ] **Step 3: Write `db/README.md`**

```markdown
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

\`\`\`bash
# 1. Create the database (any name; we use gymfit)
psql "host=<host> port=5432 dbname=postgres user=<admin> sslmode=require" \
  -c "CREATE DATABASE gymfit;"

# 2. Point DATABASE_URL at it and run migrations from the app repo
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/gymfit?sslmode=require" pnpm db:migrate
\`\`\`

There is no `pg_trgm` or other extension dependency — plain Postgres is
enough.

### A dedicated role, rather than handing over the admin account

\`\`\`sql
CREATE ROLE gymfit_app WITH LOGIN PASSWORD '<generate a strong one>';

GRANT CONNECT ON DATABASE gymfit TO gymfit_app;
GRANT USAGE ON SCHEMA public, drizzle TO gymfit_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public, drizzle TO gymfit_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public, drizzle TO gymfit_app;
\`\`\`

**Schema changes** are applied with `drizzle-kit`, which needs `CREATE` on the
schema:

\`\`\`sql
GRANT CREATE ON SCHEMA public, drizzle TO gymfit_app;
\`\`\`

…or keep it out and run migrations with the admin connection string only when
a migration is due.

## What to send back

\`\`\`
postgresql://<user>:<password>@<host>:5432/gymfit?sslmode=require
\`\`\`

`sslmode=require` matters. Send it privately; it goes into `DATABASE_URL` and
nowhere else — never sent to a browser.

### Network access

The app runs on Vercel, whose egress IPs are not fixed on the standard plan.
Allow public access with the firewall open to the hosting provider's Azure/AWS
services, relying on the strong password and required TLS — simplest and
sufficient at this scale.

## Verifying it worked

\`\`\`sql
SELECT count(*) FROM members;              -- 1521 once seeded
SELECT count(*) FROM payments;              -- 7543 once seeded
SELECT count(*) FROM store_sales;           -- 1172 once seeded
SELECT count(*) FROM expenses;              -- 1062 once seeded
\`\`\`

## Backups

Rely on the hosting provider's automated backups (Neon and Supabase both
include point-in-time recovery on their free/starter tiers). No custom backup
tooling is needed at this scale.
```

- [ ] **Step 4: Verify `.gitignore` doesn't exclude `db/`**

Read `.gitignore` from Task 1 and confirm `db/` is not in it (it isn't — only `seed-data/` is ignored, and `db/` is a different, committed directory).

- [ ] **Step 5: Run the full verification suite**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: all four pass.

Run: `pnpm probe:db`
Expected: passes.

If `seed-data/` wasn't already populated from Task 10, repeat Task 10 Step 3 to seed real data, then confirm on `/dashboard` that the 2024/2025/2026 lines render and the stat cards show plausible numbers (active/not-renewed member counts in the hundreds, not zero).

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml README.md db/README.md
git commit -m "docs: add CI workflow, project README, and database handoff doc"
```

---

## Self-Review Notes

- **Spec coverage:** every spec section maps to a task — data model (Task 2), currency/EUR conversion (Tasks 3, 9), payment matching (Task 6), expense categorization (Tasks 3, 10), capital ledger (Tasks 9, 18), no-stored-counters (Tasks 5, 8, 9 all compute), Docker Compose (Task 1), CI (Task 19), all 8 screens (Tasks 12–18 plus dashboard in 13), README/db README (Task 19).
- **Type consistency checked:** `ExpenseCategory` (Task 3) flows unchanged through Task 8's query module, Task 8's API routes, Task 10's seed script, and Tasks 13/17's UI. `matchMemberIdByName` (Task 6) is reused verbatim by Task 10's seed script, same signature. `computeMonthRollup`/`computeYearlyEurTotals` (Task 9) are the single source of the Stanje/Podela/EUR formulas — Task 9's own DB-backed functions are the only callers, and the dashboard/investments pages (Tasks 13, 18) only ever consume their output via `/api/dashboard`, never reimplement the math.
- **No placeholders:** every step has runnable code; no task says "add validation" without showing the Zod schema, and no task references a function not defined in an earlier task's Interfaces block.
