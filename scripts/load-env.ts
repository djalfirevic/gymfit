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
