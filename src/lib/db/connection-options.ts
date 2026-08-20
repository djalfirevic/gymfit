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
 */
export function connectionOptions(connectionString: string): Options<Record<string, never>> {
  const isPooled = /-pooler\./.test(connectionString)

  return {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 30,
    ...(isPooled ? { prepare: false } : {}),
  }
}
