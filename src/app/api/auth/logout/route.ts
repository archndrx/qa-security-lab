import { NextRequest, NextResponse } from "next/server";
import { revokeSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("qa_session")?.value;
  let revocationFailed = false;

  if (token) {
    try {
      await revokeSession(token);
    } catch {
      revocationFailed = true;
    }
  }

  const response = revocationFailed
    ? NextResponse.json(
        { message: "Session revocation failed. Please retry logout." },
        { status: 503 }
      )
    : NextResponse.json({ message: "Logout successful" });

  response.cookies.set("qa_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
