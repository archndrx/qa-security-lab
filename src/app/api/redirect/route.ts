import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");

  if (!target) {
    return NextResponse.json(
      { error: "URL is required" },
      { status: 400 }
    );
  }

  // Only allow internal relative paths.
  if (!target.startsWith("/") || target.startsWith("//")) {
    return NextResponse.json(
      { error: "Invalid redirect URL" },
      { status: 400 }
    );
  }

  const redirectUrl = new URL(target, request.url);

  return NextResponse.redirect(redirectUrl);
}