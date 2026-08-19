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
