import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { pgPool } from "@/lib/pg";

const COOKIE_NAME = "qa_session";
const SESSION_TTL_SECONDS = 60 * 60;

type SessionPayload = {
  sub: string;
  exp: number;
  jti: string;
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

function parseSession(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;

  try {
    const expected = Buffer.from(sign(payload), "base64url");
    const provided = Buffer.from(signature, "base64url");

    if (
      expected.length !== provided.length ||
      !timingSafeEqual(expected, provided)
    ) return null;

    const session: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (
      typeof session !== "object" ||
      session === null ||
      !("sub" in session) ||
      typeof session.sub !== "string" ||
      !session.sub.trim() ||
      !("exp" in session) ||
      typeof session.exp !== "number" ||
      !Number.isFinite(session.exp) ||
      session.exp <= Math.floor(Date.now() / 1000) ||
      !("jti" in session) ||
      typeof session.jti !== "string" ||
      !session.jti
    ) return null;

    return {
      sub: session.sub,
      exp: session.exp,
      jti: session.jti,
    };
  } catch {
    return null;
  }
}

export function createSession(userId: string): string {
  if (typeof userId !== "string" || !userId.trim()) {
    throw new Error("A valid user ID is required");
  }

  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    jti: randomUUID(),
  })).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export async function getSessionUserId(
  request: NextRequest
): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = parseSession(token);
  if (!session) return null;

  try {
    const revoked = await pgPool.query(
      `SELECT 1 FROM "RevokedSession"
       WHERE "jti" = $1 AND "expiresAt" > NOW()
       LIMIT 1`,
      [session.jti]
    );

    return revoked.rowCount ? null : session.sub;
  } catch {
    // Fail closed: never authenticate when revocation status is unknown.
    return null;
  }
}

export async function revokeSession(token: string): Promise<void> {
  const session = parseSession(token);
  if (!session) return;

  await pgPool.query(
    `INSERT INTO "RevokedSession" ("jti", "expiresAt")
     VALUES ($1, to_timestamp($2))
     ON CONFLICT ("jti") DO NOTHING`,
    [session.jti, session.exp]
  );
}

export function setSessionCookie(
  response: NextResponse,
  token: string
): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}
