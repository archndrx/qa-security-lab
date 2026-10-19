CREATE TABLE IF NOT EXISTS "LoginRateLimit" (
  "email" TEXT PRIMARY KEY,
  "count" INTEGER NOT NULL DEFAULT 0 CHECK ("count" >= 0),
  "resetAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "LoginRateLimit_resetAt_idx"
  ON "LoginRateLimit" ("resetAt");
