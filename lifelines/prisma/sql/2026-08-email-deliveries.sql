-- Track what happened to an email after the provider accepted it.
--
-- Sending is not delivering. Without this an admin cannot tell a leader who
-- never received their invitation from one who received it and ignored it, and
-- those two need completely different follow-up.
--
-- providerId is Resend's message id, which its webhooks report events against.
-- It is nullable because a send can fail before an id is issued, and unique so
-- a webhook retry updates the same row rather than inserting a duplicate.

CREATE TABLE IF NOT EXISTS email_deliveries (
  id            TEXT PRIMARY KEY,
  "providerId"  TEXT UNIQUE,
  recipient     TEXT NOT NULL,
  subject       TEXT NOT NULL,
  kind          TEXT NOT NULL,
  "sentAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" TIMESTAMP(3),
  "openedAt"    TIMESTAMP(3),
  "clickedAt"   TIMESTAMP(3),
  "bouncedAt"   TIMESTAMP(3),
  "complainedAt" TIMESTAMP(3),
  "lastEvent"   TEXT,
  "lastError"   TEXT,
  "userId"      TEXT,
  CONSTRAINT email_deliveries_userId_fkey FOREIGN KEY ("userId")
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "email_deliveries_userId_idx" ON email_deliveries("userId");
CREATE INDEX IF NOT EXISTS "email_deliveries_recipient_idx" ON email_deliveries(recipient);
