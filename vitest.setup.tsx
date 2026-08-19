import { config } from 'dotenv'
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Vitest doesn't auto-load .env files the way Next.js does. Mirror Next's
// precedence (.env, then .env.local overriding it) so modules that read
// process.env at import time (e.g. src/lib/db/client.ts) work under test.
config({ path: '.env', quiet: true })
config({ path: '.env.local', override: true, quiet: true })

// The `server-only` marker package throws unconditionally unless resolved
// with the `react-server` export condition, which Vitest never sets. Modules
// under test (e.g. src/lib/db/*) import it to guard against client-side
// usage in the app; under test we no-op it so those modules can be imported.
vi.mock('server-only', () => ({}))
