-- Member self-service portal ("Manage My LifeLines")
--
-- This project manages its schema with `prisma db push` rather than migrations,
-- so this file records the DDL that was applied by hand. It is idempotent and
-- safe to re-run; `prisma db push` from prisma/schema.prisma produces the same
-- result.

-- Distinguish a member who chose to leave from one a leader removed. The two
-- mean very different things pastorally, so they are separate statuses rather
-- than one REMOVED bucket.
ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'LEFT';

-- Members have no user account, so they identify themselves by receiving a
-- short-lived link at the email address already on file against their
-- inquiries. Only the SHA-256 of the token is stored.
CREATE TABLE IF NOT EXISTS member_portal_tokens (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS member_portal_tokens_email_idx ON member_portal_tokens(email);
