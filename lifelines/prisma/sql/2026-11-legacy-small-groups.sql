-- Legacy small groups: carried over from before LifeLines. Leaders manage them
-- from their dashboard; the public site never shows them. Applied by hand (see
-- the other files in this folder).
ALTER TABLE lifelines ADD COLUMN IF NOT EXISTS "isLegacy" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE lifelines ADD COLUMN IF NOT EXISTS "legacyLeaders" JSONB;
ALTER TABLE lifelines ADD COLUMN IF NOT EXISTS "legacyNotes" TEXT;
CREATE INDEX IF NOT EXISTS "lifelines_isLegacy_idx" ON lifelines ("isLegacy");

-- The guarantee, enforced by the database rather than trusted to every code
-- path: a legacy group can never be visible to the public.
ALTER TABLE lifelines DROP CONSTRAINT IF EXISTS lifelines_legacy_never_visible;
ALTER TABLE lifelines ADD CONSTRAINT lifelines_legacy_never_visible
  CHECK (NOT "isLegacy" OR "isVisible" = false);
