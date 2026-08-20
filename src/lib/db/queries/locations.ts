import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { locations } from '@/lib/db/schema'

export type Location = typeof locations.$inferSelect

export async function listLocations(): Promise<Location[]> {
  return db.select().from(locations).orderBy(asc(locations.name))
}

export async function createLocation(input: {
  name: string
  address: string
  latitude: string
  longitude: string
}): Promise<Location> {
  const [row] = await db.insert(locations).values(input).returning()
  return row
}

export async function updateLocation(
  id: number,
  input: Partial<{ name: string; address: string; latitude: string; longitude: string }>,
): Promise<Location | undefined> {
  const [row] = await db.update(locations).set(input).where(eq(locations.id, id)).returning()
  return row
}

export async function deleteLocation(id: number): Promise<void> {
  await db.delete(locations).where(eq(locations.id, id))
}
