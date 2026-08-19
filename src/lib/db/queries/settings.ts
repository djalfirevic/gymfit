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
