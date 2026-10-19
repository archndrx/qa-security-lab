
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
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
    !body.email.trim()
  ) {
    return NextResponse.json(
      { error: "Valid email is required" },
      { status: 400 }
    );
  }

  const email = body.email.trim().toLowerCase();

  try {
    await db.orm.public.User
      .where({ email })
      .first();

    // Keep the response identical for existing and unknown emails.
    return NextResponse.json({
      exists: false,
      message: "If the email is registered, further action is required.",
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to process request" },
      { status: 500 }
    );
  }
}
