#!/usr/bin/env node
/**
 * Rename LifeLine images in S3 after their group.
 *
 * They arrived from WordPress named by Unsplash id — lifelines/2025/01/
 * frgotjfqahm.jpg — which says nothing about which group it belongs to. This
 * renames each to its group's slug, so the bucket can be read at a glance and
 * a wrong image is obvious rather than needing a lookup.
 *
 * Dry run by default. Pass --apply to copy, repoint, and remove the old key.
 *
 *   node scripts/rename-lifeline-images.mjs
 *   node scripts/rename-lifeline-images.mjs --apply
 *
 * Re-runnable: a group already at its slug key is skipped.
 */

import { neon } from '@neondatabase/serverless'
import {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'

const APPLY = process.argv.includes('--apply')

const BUCKET = process.env.AWS_S3_BUCKET_NAME
const KEY_PREFIX = 'lifelines/'
const SERVE_PREFIX = '/api/images/'

if (!process.env.DATABASE_URL || !BUCKET) {
  console.error('DATABASE_URL and AWS_S3_BUCKET_NAME must both be set')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })

const rows = await sql`
  SELECT id, title, slug, "imageUrl"
  FROM lifelines
  WHERE "imageUrl" LIKE ${SERVE_PREFIX + '%'}
  ORDER BY title
`

console.log(`${rows.length} images hosted by us`)
console.log(APPLY ? '\nAPPLYING\n' : '\nDRY RUN — pass --apply to write\n')

let renamed = 0
let skipped = 0
const failures = []

for (const row of rows) {
  const oldKey = row.imageUrl.slice(SERVE_PREFIX.length)
  const extension = oldKey.split('.').pop()?.toLowerCase() ?? 'jpg'
  // Fall back to the id when a group somehow has no slug, so the key is still
  // unique and traceable rather than colliding on a blank name.
  const name = row.slug || row.id
  const newKey = `${KEY_PREFIX}${name}.${extension}`

  if (oldKey === newKey) {
    skipped++
    continue
  }

  if (!APPLY) {
    console.log(`  ${row.title}\n    ${oldKey}\n    -> ${newKey}`)
    renamed++
    continue
  }

  try {
    // Copy first, repoint, then remove the original — so a failure part way
    // through never leaves a group pointing at a key that is already gone.
    await s3.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${oldKey}`,
        Key: newKey,
        MetadataDirective: 'COPY',
      })
    )

    await sql`UPDATE lifelines SET "imageUrl" = ${SERVE_PREFIX + newKey} WHERE id = ${row.id}`
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: oldKey }))

    console.log(`  ${row.title} -> ${newKey}`)
    renamed++
  } catch (error) {
    failures.push({ title: row.title, reason: error.message })
    console.log(`  ${row.title} — FAILED: ${error.message}`)
  }
}

console.log(`\n${renamed} ${APPLY ? 'renamed' : 'to rename'}${skipped ? `, ${skipped} already named` : ''}`)

if (failures.length) {
  console.log(`\n${failures.length} failed:`)
  for (const f of failures) console.log(`  ${f.title}: ${f.reason}`)
  process.exitCode = 1
}

if (APPLY && !failures.length) {
  // Confirm every group's image is actually retrievable under its new name.
  let missing = 0
  for (const row of await sql`SELECT title, "imageUrl" FROM lifelines WHERE "imageUrl" LIKE ${SERVE_PREFIX + '%'}`) {
    try {
      await s3.send(
        new HeadObjectCommand({ Bucket: BUCKET, Key: row.imageUrl.slice(SERVE_PREFIX.length) })
      )
    } catch {
      missing++
      console.log(`  MISSING IN S3: ${row.title} -> ${row.imageUrl}`)
    }
  }
  console.log(missing ? `\n${missing} images are missing from S3` : '\nEvery image verified present in S3')
}
