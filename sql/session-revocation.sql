CREATE TABLE IF NOT EXISTS "RevokedSession" (
  "jti" TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "RevokedSession_expiresAt_idx"
  ON "RevokedSession" ("expiresAt");
