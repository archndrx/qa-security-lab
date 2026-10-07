import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const attempts = new Map<
  string,
  { count: number; resetAt: number }
>();

const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 1000;

export async function POST(request: Request) {
  const body = await request.json();

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const clientKey = email.toLowerCase();

  const now = Date.now();
  const existing = attempts.get(clientKey);

  if (!existing || now > existing.resetAt) {
    attempts.set(clientKey, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
  } else {
    existing.count += 1;

    if (existing.count > RATE_LIMIT) {
      return NextResponse.json(
        {
          error: "Too many login attempts",
        },
        { status: 429 }
      );
    }
  }

  const user = await db.orm.public.User
    .where({ email })
    .first();

  if (!user || user.password !== password) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    message: "Login successful",
    userId: user.id,
  });
}