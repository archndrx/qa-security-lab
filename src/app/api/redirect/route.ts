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
  if (
    !target.startsWith("/") ||
    target.startsWith("//") ||
    target.startsWith("/\\") ||
    /%2f|%5c/i.test(target) ||
    /[\u0000-\u001F\u007F]/.test(target) ||
    /\s/.test(target)
  ) {
    return NextResponse.json(
      { error: "Invalid redirect URL" },
      { status: 400 }
    );
  }

  const redirectUrl = new URL(target, request.url);

  return NextResponse.redirect(redirectUrl);
}