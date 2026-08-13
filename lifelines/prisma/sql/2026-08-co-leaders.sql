-- Co-leader support: a LifeLine may have any number of leaders, all equal.
--
-- Applied by hand because `prisma migrate` cannot reach the database from the
-- build environment. Idempotent and safe to re-run.

-- Prisma implicit many-to-many for the "LifeLineLeaders" relation.
-- A = lifelines.id, B = users.id (models ordered alphabetically).
CREATE TABLE IF NOT EXISTS "_LifeLineLeaders" (
  "A" TEXT NOT NULL REFERENCES lifelines(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "B" TEXT NOT NULL REFERENCES users(id)     ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "_LifeLineLeaders_AB_unique" ON "_LifeLineLeaders"("A","B");
CREATE INDEX IF NOT EXISTS "_LifeLineLeaders_B_index" ON "_LifeLineLeaders"("B");

-- Carry every existing single-leader assignment across.
INSERT INTO "_LifeLineLeaders" ("A","B")
SELECT id, "leaderId" FROM lifelines WHERE "leaderId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- lifelines."leaderId" is deliberately left in place so the currently deployed
-- site keeps working until this branch ships. Prisma ignores the extra nullable
-- column. Once deployed and verified, it can be dropped:
--
--   ALTER TABLE lifelines DROP COLUMN "leaderId";
