#!/usr/bin/env node
/**
 * Pull each LifeLine's featured image off the old WordPress site and into S3.
 *
 * The images were hot-linked from lifelines.sainthelen.org/wp-content/..., so
 * they broke the moment that domain started serving this app instead. This
 * copies them into our own bucket and repoints imageUrl at /api/images/...,
 * which cannot break that way again.
 *
 * Dry run by default. Pass --apply to download, upload, and write.
 *
 *   node scripts/import-lifeline-images.mjs --source https://<wp-host>
 *   node scripts/import-lifeline-images.mjs --source https://<wp-host> --apply
 *
 * Re-runnable: a LifeLine already pointing at /api/images/ is skipped, so a
 * partial run can simply be repeated.
 */

import { neon } from '@neondatabase/serverless'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { execFileSync } from 'child_process'

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const sourceIndex = args.indexOf('--source')
const SOURCE = sourceIndex !== -1 ? args[sourceIndex + 1]?.replace(/\/$/, '') : null
// Staging hosts often carry a certificate for a different name. These are
// public images and nothing secret is sent, so a hostname mismatch is not worth
// failing the migration over.
const INSECURE = args.includes('--insecure')

if (!SOURCE) {
  console.error('Missing --source <base url of the WordPress site>')
  process.exit(1)
}

const BUCKET = process.env.AWS_S3_BUCKET_NAME
const KEY_PREFIX = 'lifelines/'
const SERVE_PREFIX = '/api/images/'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}
if (!BUCKET) {
  console.error('AWS_S3_BUCKET_NAME is not set')
  process.exit(1)
}

/**
 * Fetch one image.
 *
 * curl rather than fetch() so --insecure stays confined to these calls: a
 * staging host usually presents a certificate for a different name, and
 * relaxing that globally would also relax it for the database and S3.
 */
function download(url) {
  const flags = ['-sS', '--fail', '--max-time', '60', '--location']
  if (INSECURE) flags.push('--insecure')
  return execFileSync('curl', [...flags, url], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  })
}

const sql = neon(process.env.DATABASE_URL)
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })

const CONTENT_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

/** The path portion of an old WordPress URL, remapped onto the source host. */
function sourceUrlFor(imageUrl) {
  try {
    return `${SOURCE}${new URL(imageUrl).pathname}`
  } catch {
    return null
  }
}

/**
 * Name the object after the group rather than after whatever WordPress called
 * it, so the bucket can be read at a glance. The id stands in when a group has
 * no slug, so the key stays unique rather than collapsing to a blank name.
 */
function keyFor(imageUrl, row) {
  const extension = new URL(imageUrl).pathname.split('.').pop()?.toLowerCase() || 'jpg'
  return `${KEY_PREFIX}${row.slug || row.id}.${extension}`
}

async function alreadyInS3(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return true
  } catch {
    return false
  }
}

const rows = await sql`
  SELECT id, title, slug, "imageUrl"
  FROM lifelines
  WHERE "imageUrl" IS NOT NULL
  ORDER BY title
`

const pending = rows.filter(r => !r.imageUrl.startsWith(SERVE_PREFIX))
const done = rows.length - pending.length

console.log(`${rows.length} LifeLines carry an image`)
console.log(`  ${done} already migrated`)
console.log(`  ${pending.length} to do`)
console.log(APPLY ? '\nAPPLYING\n' : '\nDRY RUN — pass --apply to write\n')

let migrated = 0
const failures = []

for (const row of pending) {
  const from = sourceUrlFor(row.imageUrl)
  if (!from) {
    failures.push({ title: row.title, reason: `unreadable URL: ${row.imageUrl}` })
    continue
  }

  const key = keyFor(row.imageUrl, row)
  const extension = key.split('.').pop()?.toLowerCase() ?? ''
  const contentType = CONTENT_TYPES[extension]

  if (!contentType) {
    failures.push({ title: row.title, reason: `unsupported file type: .${extension}` })
    continue
  }

  const servePath = SERVE_PREFIX + key

  if (!APPLY) {
    console.log(`  ${row.title}\n    ${from}\n    -> ${servePath}`)
    migrated++
    continue
  }

  try {
    if (!(await alreadyInS3(key))) {
      const body = download(from)
      if (body.length === 0) throw new Error('source returned an empty file')

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      )
      console.log(`  ${row.title} — ${(body.length / 1024).toFixed(0)}KB -> ${key}`)
    } else {
      console.log(`  ${row.title} — already in S3, repointing`)
    }

    await sql`UPDATE lifelines SET "imageUrl" = ${servePath} WHERE id = ${row.id}`
    migrated++
  } catch (error) {
    failures.push({ title: row.title, reason: error.message })
    console.log(`  ${row.title} — FAILED: ${error.message}`)
  }
}

console.log(`\n${migrated} ${APPLY ? 'migrated' : 'ready'}`)

if (failures.length) {
  console.log(`\n${failures.length} could not be migrated:`)
  for (const f of failures) console.log(`  ${f.title}: ${f.reason}`)
}

const withoutImage = await sql`SELECT count(*)::int AS c FROM lifelines WHERE "imageUrl" IS NULL`
if (withoutImage[0].c > 0) {
  console.log(`\n${withoutImage[0].c} LifeLines have no image at all and fall back to the default.`)
}
