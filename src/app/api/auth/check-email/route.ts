import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();

  const { email } = body;

  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  const user = await db.orm.public.User
    .where({ email })
    .first();

  // Do not reveal whether the email exists.
  // Both existing and non-existing emails receive
  // the same response.
  if (!user) {
    return NextResponse.json({
      exists: false,
      message: "If the email is registered, further action is required.",
    });
  }

  return NextResponse.json({
    exists: false,
    message: "If the email is registered, further action is required.",
  });
}