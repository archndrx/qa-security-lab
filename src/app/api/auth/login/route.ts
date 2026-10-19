import { NextRequest, NextResponse } from "next/server";
import { pgPool } from "@/lib/pg";
import { createSession, setSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";

const RATE_LIMIT = 5;
const WINDOW_SECONDS = 60;

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("email" in body) ||
    typeof body.email !== "string" ||
    !("password" in body) ||
    typeof body.password !== "string" ||
    !body.email.trim() ||
    !body.password
  ) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const email = body.email.trim().toLowerCase();
  const password = body.password;
  let client: PoolClient | undefined;
  let transactionOpen = false;

  try {
    client = await pgPool.connect();
    await client.query("BEGIN");
    transactionOpen = true;

    // Serialize login attempts for the same normalized email.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [email]
    );

    const limitResult = await client.query<{
      count: number;
      active: boolean;
    }>(
      `SELECT
         "count",
         ("resetAt" > NOW()) AS active
       FROM "LoginRateLimit"
       WHERE "email" = $1
       FOR UPDATE`,
      [email]
    );

    const limit = limitResult.rows[0];

    if (limit?.active && limit.count >= RATE_LIMIT) {
      await client.query("COMMIT");
      transactionOpen = false;

      return NextResponse.json(
        { error: "Too many login attempts" },
        { status: 429 }
      );
    }

    const userResult = await client.query<{
      id: string | number;
      password: string;
    }>(
      `SELECT "id", "password"
       FROM "User"
       WHERE "email" = $1
       LIMIT 1`,
      [email]
    );

    const user = userResult.rows[0];

    const passwordHash = user?.password;
    const passwordValid = passwordHash
      ? await bcrypt.compare(password, passwordHash)
      : false;

    if (!user || !passwordValid) {
      await client.query(
        `INSERT INTO "LoginRateLimit"
           ("email", "count", "resetAt", "updatedAt")
         VALUES ($1, 1, NOW() + ($2 * INTERVAL '1 second'), NOW())
         ON CONFLICT ("email") DO UPDATE SET
           "count" = CASE
             WHEN "LoginRateLimit"."resetAt" <= NOW() THEN 1
             ELSE "LoginRateLimit"."count" + 1
           END,
           "resetAt" = CASE
             WHEN "LoginRateLimit"."resetAt" <= NOW()
               THEN NOW() + ($2 * INTERVAL '1 second')
             ELSE "LoginRateLimit"."resetAt"
           END,
           "updatedAt" = NOW()`,
        [email, WINDOW_SECONDS]
      );

      await client.query("COMMIT");
      transactionOpen = false;

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    await client.query(
      `DELETE FROM "LoginRateLimit" WHERE "email" = $1`,
      [email]
    );

    await client.query("COMMIT");
    transactionOpen = false;

    const token = createSession(String(user.id));
    const response = NextResponse.json({
      message: "Login successful",
      userId: user.id,
    });

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    if (transactionOpen && client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original failure.
      }
    }

    console.error("Login request failed:", error);

    return NextResponse.json(
      { error: "Login service temporarily unavailable" },
      { status: 503 }
    );
  } finally {
    client?.release();
  }
}
