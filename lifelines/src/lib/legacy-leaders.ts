/**
 * The people who lead a legacy small group before they have accounts.
 *
 * Kept as plain data (no database access) so the edit form can use the same
 * parsing as the server.
 */
export interface LegacyLeader {
  name: string
  email: string
}

const EMAIL = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/

/**
 * Accept either a list of { name, email } or the edit form's text, one leader
 * per line as "Name <email>", "Name, email" or just an email. Lines without a
 * usable email are dropped: a leader account cannot exist without one.
 * Duplicate emails keep their first entry.
 */
export function normalizeLegacyLeaders(input: unknown): LegacyLeader[] {
  const entries: Array<{ name?: unknown; email?: unknown }> =
    typeof input === 'string'
      ? input.split('\n').map(parseLine)
      : Array.isArray(input)
        ? input.filter((item): item is { name?: unknown; email?: unknown } =>
            Boolean(item) && typeof item === 'object')
        : []

  const seen = new Set<string>()
  const leaders: LegacyLeader[] = []
  for (const entry of entries) {
    const email = typeof entry.email === 'string' ? entry.email.trim().toLowerCase() : ''
    if (!EMAIL.test(email) || seen.has(email)) continue
    seen.add(email)
    const name = typeof entry.name === 'string' ? entry.name.trim() : ''
    leaders.push({ name: name || email, email })
  }
  return leaders
}

function parseLine(line: string): { name: string; email: string } {
  const text = line.trim()
  const bracketed = text.match(/^(.*?)<([^>]+)>\s*$/)
  if (bracketed) return { name: bracketed[1].replace(/[,\s]+$/, ''), email: bracketed[2] }
  const found = text.match(/[^\s<>,;]+@[^\s<>,;]+/)
  if (!found) return { name: text, email: '' }
  const name = text.replace(found[0], '').replace(/[,;:\-\s]+$/, '').replace(/^[,;:\-\s]+/, '')
  return { name, email: found[0] }
}

/** The edit form's text for a list of leaders: one "Name <email>" per line. */
export function legacyLeadersToText(leaders: unknown): string {
  return normalizeLegacyLeaders(leaders)
    .map(leader => (leader.name && leader.name !== leader.email ? `${leader.name} <${leader.email}>` : leader.email))
    .join('\n')
}
