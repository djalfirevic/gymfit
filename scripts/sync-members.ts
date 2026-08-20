// scripts/sync-members.ts
// Unlike seed-import.ts (which skips the whole members table if it already
// has rows), this adds only members that don't already exist by name —
// safe to re-run whenever the source spreadsheet gets new members added.
import './load-env'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'csv-parse/sync'
import { db } from './db-client'
import { members } from '../src/lib/db/schema'
import { normalizeName } from '../src/lib/import/match-member'

function parseSerbianDate(raw: string): Date {
  const [day, month, year] = raw.trim().split('.').map(Number)
  if (!day || !month || !year) {
    throw new Error(`Cannot parse date: "${raw}"`)
  }
  const fullYear = year < 100 ? 2000 + year : year
  return new Date(Date.UTC(fullYear, month - 1, day))
}

async function main(): Promise<void> {
  const csvPathArgIndex = process.argv.indexOf('--file')
  const csvPath = csvPathArgIndex >= 0 ? process.argv[csvPathArgIndex + 1] : undefined
  if (!csvPath) {
    console.error('Usage: pnpm sync:members -- --file "/path/to/Members.csv"')
    process.exit(1)
  }

  const content = readFileSync(resolve(csvPath), 'utf-8')
  const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]

  const existing = await db.select({ fullName: members.fullName }).from(members)
  const existingNames = new Set(existing.map((member) => normalizeName(member.fullName)))

  const toInsert: { fullName: string; membershipRenewalDate: Date }[] = []
  for (const row of rows) {
    const fullName = row['Ime i prezime']
    const renewalRaw = row['Obnova članarine']
    if (!fullName || !renewalRaw) continue
    if (existingNames.has(normalizeName(fullName))) continue
    toInsert.push({ fullName, membershipRenewalDate: parseSerbianDate(renewalRaw) })
  }

  if (toInsert.length === 0) {
    console.log('No new members found — database already has everyone in the CSV.')
    process.exit(0)
  }

  console.log(`Found ${toInsert.length} new member(s):`)
  for (const member of toInsert) {
    console.log(`  - ${member.fullName} (obnova: ${member.membershipRenewalDate.toISOString().slice(0, 10)})`)
  }

  await db.transaction(async (tx) => {
    for (const member of toInsert) {
      await tx.insert(members).values(member)
    }
  })

  console.log(`Inserted ${toInsert.length} new member(s).`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
