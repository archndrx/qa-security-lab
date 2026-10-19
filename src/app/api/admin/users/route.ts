import { NextRequest, NextResponse } from "next/server";
import { pgPool } from "@/lib/pg";
import { getSessionUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const authorization = await pgPool.query<{ isAdmin: boolean }>(
    `SELECT "isAdmin" FROM "User" WHERE "id" = $1`,
    [userId]
  );

  if (authorization.rowCount === 0) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 401 }
    );
  }

  if (authorization.rows[0].isAdmin !== true) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const result = await pgPool.query(
    `
    SELECT "id", "email", "name", "isAdmin", "isVerified", "createdAt"
    FROM "User"
    ORDER BY "createdAt" DESC
    LIMIT 100
    `
  );

  return NextResponse.json({ users: result.rows });
}
