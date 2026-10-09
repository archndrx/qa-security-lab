
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";

const attempts = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
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
  const now = Date.now();

  let existing = attempts.get(email);

  if (existing && now > existing.resetAt) {
    attempts.delete(email);
    existing = undefined;
  }

  if (existing && existing.count >= RATE_LIMIT) {
    return NextResponse.json(
      { error: "Too many login attempts" },
      { status: 429 }
    );
  }

  const user = await db.orm.public.User.where({ email }).first();

  const passwordHash =
    user && typeof user.password === "string"
      ? user.password
      : null;

  const passwordValid = passwordHash
    ? await bcrypt.compare(password, passwordHash)
    : false;

  if (!user || !passwordValid) {
    if (!existing) {
      attempts.set(email, {
        count: 1,
        resetAt: now + WINDOW_MS,
      });
    } else {
      existing.count += 1;
    }

    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  // Successful login does not consume the failed-attempt allowance.
  attempts.delete(email);

  const token = createSession(String(user.id));
  const response = NextResponse.json({
    message: "Login successful",
    userId: user.id,
  });

  setSessionCookie(response, token);
  return response;
}
