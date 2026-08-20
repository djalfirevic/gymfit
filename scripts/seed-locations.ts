// scripts/seed-locations.ts
// Inserts the gym's own locations, skipping any whose name is already present —
// safe to re-run against a database that has been seeded before.
import './load-env'
import { db } from './db-client'
import { locations } from '../src/lib/db/schema'

const SEED = [
  {
    name: 'GymFit teretana',
    address: 'Pavla Vuisica 46, 11283 Beograd (Altina)',
    // Place coordinates from the Google Maps listing. Note these are the
    // pin's own !3d/!4d values, not the map viewport centre in the URL's
    // @-prefixed part, which sits ~1.6km west.
    latitude: '44.8514798',
    longitude: '20.3500288',
  },
]

async function main(): Promise<void> {
  const existing = await db.select({ name: locations.name }).from(locations)
  const existingNames = new Set(existing.map((row) => row.name))

  const missing = SEED.filter((location) => !existingNames.has(location.name))
  if (missing.length === 0) {
    console.log(`All ${SEED.length} location(s) already present, nothing to insert.`)
    return
  }

  const inserted = await db.insert(locations).values(missing).returning()
  for (const location of inserted) {
    console.log(`Inserted "${location.name}" (${location.latitude}, ${location.longitude})`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
