import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { connectionOptions } from '../src/lib/db/connection-options'
import * as schema from '../src/lib/db/schema'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const queryClient = postgres(connectionString, connectionOptions(connectionString))
export const db = drizzle(queryClient, { schema })
