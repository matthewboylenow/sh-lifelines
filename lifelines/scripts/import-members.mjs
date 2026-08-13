/**
 * Import LifeLine members/inquiries from a CSV export of the WordPress site.
 *
 * Expected columns: Name, Phone, Email, Status, LifeLine Title, Date Created
 *
 * Usage:
 *   node scripts/import-members.mjs <file.csv>            # dry run, writes nothing
 *   node scripts/import-members.mjs <file.csv> --apply    # perform the import
 *
 * Requires DATABASE_URL. Uses Neon's HTTP driver so it works from environments
 * where the Postgres TCP port is unreachable.
 */
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'

const file = process.argv[2]
const APPLY = process.argv.includes('--apply')
if (!file) {
  console.error('Usage: node scripts/import-members.mjs <file.csv> [--apply]')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}
const sql = neon(process.env.DATABASE_URL)

/** Minimal RFC-4180 CSV parser: handles quoted fields, escaped quotes, CRLF. */
function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(v => v.trim()))
}

const decodeEntities = s => s
  .replace(/&#8217;|&#039;|&apos;/g, "'")
  .replace(/&#8211;|&ndash;/g, '–')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ')

/** Loose key for title matching — ignores punctuation, case and entity noise. */
const normTitle = s => decodeEntities(s).toLowerCase()
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/[^a-z0-9]+/g, ' ').trim()

/** Matches src/lib/phone.ts so numbers are stored in one consistent shape. */
function normalizePhone(p) {
  const d = String(p || '').replace(/\D/g, '')
  if (!d) return null
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return `+${d}`
}

const STATUS_MAP = { joined: 'JOINED', undecided: 'UNDECIDED', not_joined: 'NOT_JOINED' }
// When one person appears twice for the same LifeLine, keep the most settled
// outcome rather than whichever row happened to come last.
const STATUS_RANK = { JOINED: 3, NOT_JOINED: 2, UNDECIDED: 1 }

const raw = parseCsv(readFileSync(file, 'utf8').replace(/^﻿/, ''))
const header = raw[0].map(h => h.trim())
const idx = name => header.indexOf(name)
const col = { name: idx('Name'), phone: idx('Phone'), email: idx('Email'), status: idx('Status'), title: idx('LifeLine Title'), date: idx('Date Created') }
for (const [k, v] of Object.entries(col)) {
  if (v === -1) { console.error(`Missing required column for "${k}"`); process.exit(1) }
}

const lifelines = await sql`SELECT id, title FROM lifelines`
const byTitle = new Map(lifelines.map(l => [normTitle(l.title), l]))

const skipped = []
const merged = new Map() // key: email + lifeLineId

for (let i = 1; i < raw.length; i++) {
  const r = raw[i]
  const lineNo = i + 1
  const name = (r[col.name] || '').trim()
  const email = (r[col.email] || '').trim().toLowerCase()
  const title = (r[col.title] || '').trim()
  const statusRaw = (r[col.status] || '').trim().toLowerCase()

  if (!title) { skipped.push({ lineNo, name, reason: 'no LifeLine title' }); continue }
  const ll = byTitle.get(normTitle(title))
  if (!ll) { skipped.push({ lineNo, name, reason: `no LifeLine matching "${decodeEntities(title)}"` }); continue }
  if (!name) { skipped.push({ lineNo, name, reason: 'no name' }); continue }

  const status = STATUS_MAP[statusRaw]
  if (!status) { skipped.push({ lineNo, name, reason: `unrecognised status "${statusRaw}"` }); continue }

  const dateStr = (r[col.date] || '').trim()
  const createdAt = dateStr && !Number.isNaN(Date.parse(dateStr)) ? new Date(dateStr) : new Date()

  const key = `${email}||${ll.id}`
  const candidate = {
    name, email: email || null, phone: normalizePhone(r[col.phone]),
    status, createdAt, lifeLineId: ll.id, lifeLineTitle: ll.title,
  }
  const existing = merged.get(key)
  if (!existing) { merged.set(key, candidate); continue }

  // Collapse duplicates: strongest status wins, earliest date is the true
  // first contact, and keep any phone number we have.
  if (STATUS_RANK[candidate.status] > STATUS_RANK[existing.status]) existing.status = candidate.status
  if (candidate.createdAt < existing.createdAt) existing.createdAt = candidate.createdAt
  if (!existing.phone && candidate.phone) existing.phone = candidate.phone
}

const records = [...merged.values()]
const byStatus = records.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {})

console.log(`Parsed ${raw.length - 1} rows from ${file}`)
console.log(`  → ${records.length} unique member records (${raw.length - 1 - records.length - skipped.length} duplicates merged)`)
console.log(`  → by status:`, byStatus)
console.log(`  → with phone: ${records.filter(r => r.phone).length} | without: ${records.filter(r => !r.phone).length}`)
console.log(`  → skipped: ${skipped.length}`)
for (const s of skipped) console.log(`      line ${s.lineNo}: ${s.name || '(no name)'} — ${s.reason}`)

if (!APPLY) {
  console.log('\nDRY RUN — nothing written. Re-run with --apply to import.')
  const sample = records.slice(0, 5)
  console.log('\nSample of what would be created:')
  for (const r of sample) {
    console.log(`  ${r.name} <${r.email}> ${r.phone || '(no phone)'} [${r.status}] → ${r.lifeLineTitle} (${r.createdAt.toISOString().slice(0, 10)})`)
  }
  process.exit(0)
}

// Skip anyone already recorded against the same LifeLine so the import can be
// re-run safely after a partial failure.
const existingRows = await sql`SELECT LOWER("personEmail") AS email, "lifeLineId" FROM inquiries WHERE "personEmail" IS NOT NULL`
const already = new Set(existingRows.map(e => `${e.email}||${e.lifeLineId}`))

let created = 0, skippedExisting = 0, failed = 0
for (const r of records) {
  if (already.has(`${r.email}||${r.lifeLineId}`)) { skippedExisting++; continue }
  try {
    await sql`
      INSERT INTO inquiries (id, "personName", "personEmail", "personPhone", status, source,
                             "lifeLineId", "createdAt", "updatedAt", "joinedAt")
      VALUES (${randomUUID()}, ${r.name}, ${r.email}, ${r.phone}, ${r.status}::"InquiryStatus",
              'OTHER'::"InquirySource", ${r.lifeLineId}, ${r.createdAt}, NOW(),
              ${r.status === 'JOINED' ? r.createdAt : null})`
    created++
  } catch (e) {
    failed++
    console.error(`  FAILED ${r.name} <${r.email}> → ${r.lifeLineTitle}: ${e.message.split('\n')[0]}`)
  }
}

console.log(`\nImported: ${created} | already present: ${skippedExisting} | failed: ${failed}`)
