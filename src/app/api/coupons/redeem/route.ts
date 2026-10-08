import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { pgPool } from "@/lib/pg";

export async function POST(request: Request) {
  const body = await request.json();

  const { userId, code } = body;

  if (!userId || !code) {
    return NextResponse.json(
      { error: "userId and code are required" },
      { status: 400 }
    );
  }

  const client = await pgPool.connect();

  try {
    await client.query("BEGIN");

    // Validate user
    const userResult = await client.query(
      `
      SELECT "id"
      FROM "User"
      WHERE "id" = $1
      `,
      [userId]
    );

    if (userResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    /*
     * Atomic update:
     *
     * Only one concurrent request can increment the coupon
     * when usedCount is already at maxUses.
     *
     * PostgreSQL row locking guarantees that concurrent
     * transactions cannot both pass this condition.
     */
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
      RETURNING
        "id",
        "code",
        "discount",
        "usedCount",
        "maxUses"
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

    // Record successful redemption in the same transaction.
    await client.query(
      `
      INSERT INTO "CouponRedemption"
        ("id", "couponId", "userId", "createdAt")
      VALUES
        ($1, $2, $3, NOW())
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