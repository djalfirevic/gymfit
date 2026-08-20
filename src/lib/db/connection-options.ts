import type { Options } from 'postgres'

/**
 * Connection settings shared by the app and the CLI scripts.
 *
 * Two things about Neon drive this:
 *
 * 1. Its pooled endpoint (`...-pooler...`) is PgBouncer in transaction mode,
 *    which does not support prepared statements. postgres.js uses them by
 *    default, which surfaces as intermittent "prepared statement already
 *    exists" errors under concurrency. Disabling them on the pooled host only
 *    keeps the direct endpoint fast.
 *
 * 2. Neon suspends idle compute, so the first query after a quiet spell has to
 *    wait for it to wake. The connect timeout has to allow for that cold start
 *    rather than failing the request.
 *
 * Pool size then depends on where this runs. A long-running server wants a real
 * pool; on Vercel every instance is short-lived and sits behind the Neon pooler
 * already, so a large per-instance pool only opens connections that are thrown
 * away moments later.
 */
export function connectionOptions(connectionString: string): Options<Record<string, never>> {
  const isPooled = /-pooler\./.test(connectionString)
  const isServerless = process.env.VERCEL === '1'

  return {
    max: isServerless ? 3 : 10,
    idle_timeout: isServerless ? 10 : 20,
    connect_timeout: 30,
    ...(isPooled ? { prepare: false } : {}),
  }
}
