import { NextRequest, NextResponse } from "next/server";
import { pgPool } from "@/lib/pg";
import { getSessionUserId } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  const userId = getSessionUserId(request);

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

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
    !("name" in body) ||
    typeof body.name !== "string"
  ) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const name = body.name.trim();

  if (name.length === 0 || name.length > 100) {
    return NextResponse.json(
      { error: "Name must contain 1–100 characters" },
      { status: 400 }
    );
  }

  const result = await pgPool.query<{
    id: string;
    name: string;
    isAdmin: boolean;
    isVerified: boolean;
  }>(
    `
    UPDATE "User"
    SET "name" = $2
    WHERE "id" = $1
    RETURNING "id", "name", "isAdmin", "isVerified"
    `,
    [userId, name]
  );

  if (result.rowCount === 0) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    user: result.rows[0],
  });
}
