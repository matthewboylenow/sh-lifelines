-- Drop the single-leader column left behind by the co-leader migration.
--
-- LifeLines used to have exactly one leader, stored here. Real co-leader
-- support replaced it with the _LifeLineLeaders join table, and the Prisma
-- schema no longer declares this column, so nothing reads or writes it. The
-- values it still held were stale — one pointed at someone who is no longer a
-- leader of that group at all — which makes it a trap for the next person to
-- write a query against this table.
--
-- Every group's real leaders live in _LifeLineLeaders; this drops only the
-- dead column and its foreign key.

ALTER TABLE lifelines DROP COLUMN IF EXISTS "leaderId";
