-- Let a resource appear on the public home page as well as the leaders'
-- Resources page. Applied by hand (see the other files in this folder).
ALTER TABLE resources ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT false;
