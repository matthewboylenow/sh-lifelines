-- Leader training courses: ordered lessons with per-user progress.
-- Applied by hand because `prisma migrate` cannot reach the database from the
-- build environment. Idempotent.

CREATE TABLE IF NOT EXISTS courses (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  description   TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lessons (
  id            TEXT PRIMARY KEY,
  "courseId"    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  "videoUrl"    TEXT,
  position      INTEGER NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS lessons_courseId_position_key ON lessons("courseId", position);
CREATE INDEX IF NOT EXISTS lessons_courseId_idx ON lessons("courseId");

CREATE TABLE IF NOT EXISTS lesson_progress (
  id             TEXT PRIMARY KEY,
  "userId"       TEXT NOT NULL REFERENCES users(id)   ON DELETE CASCADE ON UPDATE CASCADE,
  "lessonId"     TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "completedAt"  TIMESTAMP(3),
  "lastPosition" INTEGER NOT NULL DEFAULT 0,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS lesson_progress_userId_lessonId_key ON lesson_progress("userId", "lessonId");
CREATE INDEX IF NOT EXISTS lesson_progress_userId_idx ON lesson_progress("userId");
