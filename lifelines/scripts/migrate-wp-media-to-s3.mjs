/**
 * Copy the LifeLines training media off the WordPress site into S3.
 *
 * Files are stored privately; the app serves them through a short-lived signed
 * link (see /api/resources/[id]/media), so nothing here is publicly readable.
 *
 * Usage:
 *   node scripts/migrate-wp-media-to-s3.mjs            # dry run
 *   node scripts/migrate-wp-media-to-s3.mjs --apply
 *
 * Needs AWS_* credentials and DATABASE_URL.
 */
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { neon } from '@neondatabase/serverless'
import { randomUUID } from 'crypto'

const WP = process.env.WP_BASE_URL || 'https://lifelines.sainthelen.org'
const APPLY = process.argv.includes('--apply')
const BUCKET = process.env.AWS_S3_BUCKET_NAME
const REGION = process.env.AWS_REGION || 'us-east-1'

for (const v of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET_NAME', 'DATABASE_URL']) {
  if (!process.env[v]) { console.error(`${v} is not set`); process.exit(1) }
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})
const sql = neon(process.env.DATABASE_URL)

const decode = s => String(s || '')
  .replace(/&#8217;|&#039;|&apos;/g, "'")
  .replace(/&#8211;|&ndash;/g, '–')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&nbsp;/g, ' ')
  .trim()

function classify(title) {
  const t = title.toLowerCase()
  if (t.includes('training') || t.includes('communication')) return 'LEADER_FAITH_FORMATION'
  if (t.includes('week') || t.includes('series') || t.includes('sanctuary')) return 'SERIES_PROGRAMS'
  return 'LEADER_FAITH_FORMATION'
}

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

const media = await fetchMedia()
const plan = media.map(m => {
  const filename = m.source_url.split('/').pop()
  return {
    title: decode((m.title && m.title.rendered) || filename),
    sourceUrl: m.source_url,
    key: `resources/${filename}`,
    mime: m.mime_type,
    resourceType: classify(decode((m.title && m.title.rendered) || filename)),
  }
}).sort((a, b) => a.title.localeCompare(b.title))

console.log(`${plan.length} files to migrate from ${WP}\n`)
if (!APPLY) {
  for (const p of plan) console.log(`  ${p.mime.padEnd(12)} ${p.key}`)
  console.log('\nDRY RUN — nothing transferred. Re-run with --apply.')
  process.exit(0)
}

const existing = await sql`SELECT "fileUrl", "videoUrl" FROM resources`
const seenKeys = new Set(
  existing.flatMap(r => [r.fileUrl, r.videoUrl]).filter(Boolean).map(u => String(u).split('/').pop())
)

let copied = 0, skipped = 0, failed = 0
for (const p of plan) {
  const filename = p.key.split('/').pop()
  if (seenKeys.has(filename)) { skipped++; console.log(`  skip (already imported) ${filename}`); continue }

  try {
    // Skip the transfer if the object is already in the bucket from a prior run.
    let present = true
    try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: p.key })) }
    catch { present = false }

    if (!present) {
      const res = await fetch(p.sourceUrl)
      if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`)
      const body = Buffer.from(await res.arrayBuffer())
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: p.key,
        Body: body,
        ContentType: p.mime,
        Metadata: { 'migrated-from': 'wordpress' },
      }))
      console.log(`  copied ${(body.length / 1048576).toFixed(1).padStart(6)} MB  ${filename}`)
    } else {
      console.log(`  already in bucket        ${filename}`)
    }

    // Media is private, so the record stores the S3 key rather than a URL the
    // browser could fetch directly. The app signs it on demand.
    const isVideo = p.mime.startsWith('video/')
    await sql`
      INSERT INTO resources (id, title, description, "resourceType", "videoUrl", "fileUrl",
                             "fileName", "isActive", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${p.title}, ${null}, ${p.resourceType}::"ResourceType",
              ${isVideo ? `s3://${p.key}` : null}, ${isVideo ? null : `s3://${p.key}`},
              ${isVideo ? null : filename}, true, NOW(), NOW())`
    copied++
  } catch (e) {
    failed++
    console.error(`  FAILED ${filename}: ${e.message}`)
  }
}

console.log(`\nMigrated ${copied} | skipped ${skipped} | failed ${failed}`)
