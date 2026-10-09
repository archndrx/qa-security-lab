
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { pgPool } from "@/lib/pg";
import { getSessionUserId } from "@/lib/auth";

export async function POST(request: NextRequest) {
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
    !("code" in body) ||
    typeof body.code !== "string" ||
    !body.code.trim()
  ) {
    return NextResponse.json(
      { error: "code is required" },
      { status: 400 }
    );
  }

  const code = body.code.trim();
  const client = await pgPool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `SELECT "id" FROM "User" WHERE "id" = $1`,
      [userId]
    );

    if (userResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    const couponResult = await client.query<{
      id: string;
      code: string;
      discount: number;
      usedCount: number;
      maxUses: number;
    }>(
      `
      UPDATE "Coupon"
      SET "usedCount" = "usedCount" + 1
      WHERE "code" = $1
        AND "usedCount" < "maxUses"
      RETURNING "id", "code", "discount", "usedCount", "maxUses"
      `,
      [code]
    );

    if (couponResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { error: "Coupon not found or already fully redeemed" },
        { status: 409 }
      );
    }

    const coupon = couponResult.rows[0];

    await client.query(
      `
      INSERT INTO "CouponRedemption"
        ("id", "couponId", "userId", "createdAt")
      VALUES ($1, $2, $3, NOW())
      `,
      [randomUUID(), coupon.id, userId]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Coupon redeemed successfully",
      code: coupon.code,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Coupon redemption error:", error);

    return NextResponse.json(
      { error: "Failed to redeem coupon" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}