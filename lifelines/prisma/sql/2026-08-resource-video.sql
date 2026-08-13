-- Resources can carry a video (YouTube, Vimeo, or a direct file URL) that plays
-- inline, alongside the existing external link and uploaded file options.
--
-- Applied by hand because `prisma migrate` cannot reach the database from the
-- build environment. Idempotent.
ALTER TABLE resources ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
