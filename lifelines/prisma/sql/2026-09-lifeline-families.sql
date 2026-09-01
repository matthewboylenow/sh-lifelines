-- Group families: a parent LifeLine with subgroups beneath it.
--
-- Several faith sharing groups run at different times and read as near
-- duplicates in the directory. A family lets them sit under one heading —
-- "Faith Sharing" — while each subgroup keeps its own day, time, leader and
-- members.
--
-- A parent is a heading, not something anyone joins: people always join a
-- specific subgroup, because that is where the meeting time lives. A parent's
-- leaders are its coordinators, who see the combined roster across subgroups.
--
-- SET NULL rather than CASCADE: deleting a parent must never take its
-- subgroups — and their members — with it. They become standalone groups.

ALTER TABLE lifelines ADD COLUMN IF NOT EXISTS "parentId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'lifelines_parentId_fkey'
  ) THEN
    ALTER TABLE lifelines
      ADD CONSTRAINT "lifelines_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES lifelines(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "lifelines_parentId_idx" ON lifelines("parentId");
