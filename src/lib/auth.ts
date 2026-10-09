import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "qa_session";
const SESSION_TTL_SECONDS = 60 * 60;

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

export function createSession(userId: string): string {
  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new Error("A valid user ID is required");
  }

  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    })
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}
export function getSessionUserId(request: NextRequest): string | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;

  try {
    const expectedSignature = Buffer.from(sign(payload), "base64url");
    const providedSignature = Buffer.from(signature, "base64url");

    if (
      expectedSignature.length !== providedSignature.length ||
      !timingSafeEqual(expectedSignature, providedSignature)
    ) {
      return null;
    }

    const session: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (
      typeof session !== "object" ||
      session === null ||
      !("sub" in session) ||
      typeof session.sub !== "string" ||
      session.sub.trim().length === 0 ||
      !("exp" in session) ||
      typeof session.exp !== "number" ||
      !Number.isFinite(session.exp) ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return session.sub;
  } catch {
    return null;
  }
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
