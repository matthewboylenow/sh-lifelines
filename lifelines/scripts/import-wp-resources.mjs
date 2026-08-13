/**
 * Import resources from the WordPress LifeLines site.
 *
 * The WordPress `resources` post type holds almost nothing (its links live in
 * ACF fields, which are not exposed to unauthenticated REST callers). The real
 * material is in the media library: the leader-training videos and audio.
 * This pulls those in as Resource records pointing at their public URLs.
 *
 * Usage:
 *   node scripts/import-wp-resources.mjs            # dry run, writes nothing
 *   node scripts/import-wp-resources.mjs --apply
 *
 * Requires DATABASE_URL. Uses Neon's HTTP driver so it runs where Postgres TCP
 * is unreachable.
 */
import { neon } from '@neondatabase/serverless'
import { randomUUID } from 'crypto'

const WP = process.env.WP_BASE_URL || 'https://lifelines.sainthelen.org'
const APPLY = process.argv.includes('--apply')

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}
const sql = neon(process.env.DATABASE_URL)

const decode = s => String(s || '')
  .replace(/&#8217;|&#039;|&apos;/g, "'")
  .replace(/&#8211;|&ndash;/g, '–')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&nbsp;/g, ' ')
  .trim()

/** Everything non-image in the media library, across all pages. */
async function fetchMedia() {
  const items = []
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`${WP}/wp-json/wp/v2/media?per_page=100&page=${page}`)
    if (!res.ok) break
    const batch = await res.json()
    if (!Array.isArray(batch) || batch.length === 0) break
    items.push(...batch)
    if (batch.length < 100) break
  }
  return items.filter(m => !String(m.mime_type || '').startsWith('image/'))
}

// Leader-training material is formation content; anything else defaults to the
// same bucket rather than guessing a category that may be wrong.
function classify(title) {
  const t = title.toLowerCase()
  if (t.includes('training') || t.includes('leader')) return 'LEADER_FAITH_FORMATION'
  if (t.includes('week') || t.includes('series') || t.includes('sanctuary')) return 'SERIES_PROGRAMS'
  return 'LEADER_FAITH_FORMATION'
}

const media = await fetchMedia()
console.log(`Found ${media.length} non-image media items on ${WP}`)

const candidates = media.map(m => {
  const title = decode((m.title && m.title.rendered) || m.slug || 'Untitled')
  const isVideo = String(m.mime_type).startsWith('video/')
  return {
    title,
    url: m.source_url,
    mime: m.mime_type,
    resourceType: classify(title),
    // Video and audio both play in the browser; audio still lands in videoUrl
    // because that is the field the player reads.
    videoUrl: isVideo ? m.source_url : null,
    fileUrl: isVideo ? null : m.source_url,
    fileName: isVideo ? null : m.source_url.split('/').pop(),
  }
}).sort((a, b) => a.title.localeCompare(b.title))

const existing = await sql`SELECT title, "videoUrl", "fileUrl" FROM resources`
const seen = new Set(existing.flatMap(r => [r.videoUrl, r.fileUrl].filter(Boolean)))

const toCreate = candidates.filter(c => !seen.has(c.url))
const already = candidates.length - toCreate.length

console.log(`  ${toCreate.length} new, ${already} already imported\n`)
for (const c of toCreate) {
  console.log(`  ${c.mime.padEnd(12)} ${c.resourceType.padEnd(24)} ${c.title}`)
}

if (!APPLY) {
  console.log('\nDRY RUN — nothing written. Re-run with --apply to import.')
  process.exit(0)
}

let created = 0
for (const c of toCreate) {
  await sql`
    INSERT INTO resources (id, title, description, "resourceType", "videoUrl", "fileUrl",
                           "fileName", "isActive", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${c.title}, ${null}, ${c.resourceType}::"ResourceType",
            ${c.videoUrl}, ${c.fileUrl}, ${c.fileName}, true, NOW(), NOW())`
  created++
}
console.log(`\nImported ${created} resources.`)
