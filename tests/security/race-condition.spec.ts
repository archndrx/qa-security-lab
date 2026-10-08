import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
    connectionString: databaseUrl,
});

test.describe("Race Condition Security", () => {
    const couponCode = `RACE-${randomUUID()}`;

    test.beforeAll(async () => {
        await pool.query(
            `
      INSERT INTO "Coupon"
        ("id", "code", "discount", "maxUses", "usedCount", "createdAt")
      VALUES
        ($1, $2, $3, $4, $5, NOW())
      `,
            [
                randomUUID(),
                couponCode,
                50,
                1,
                0,
            ]
        );
    });

    test.afterAll(async () => {
        await pool.query(
            `
    DELETE FROM "CouponRedemption"
    WHERE "couponId" IN (
      SELECT "id"
      FROM "Coupon"
      WHERE "code" = $1
    )
    `,
            [couponCode]
        );

        await pool.query(
            `
    DELETE FROM "Coupon"
    WHERE "code" = $1
    `,
            [couponCode]
        );

        await pool.end();
    });

    test("should allow only one concurrent coupon redemption", async ({
        request,
    }) => {
        const [response1, response2] = await Promise.all([
            request.post("/api/coupons/redeem", {
                data: {
                    userId: "test-alice",
                    code: couponCode,
                },
            }),

            request.post("/api/coupons/redeem", {
                data: {
                    userId: "test-bob",
                    code: couponCode,
                },
            }),
        ]);

        const statuses = [
            response1.status(),
            response2.status(),
        ].sort();

        expect(statuses).toEqual([200, 409]);

        const couponResult = await pool.query<{
            usedCount: number;
            maxUses: number;
        }>(
            `
      SELECT
        "usedCount",
        "maxUses"
      FROM "Coupon"
      WHERE "code" = $1
      `,
            [couponCode]
        );

        expect(couponResult.rowCount).toBe(1);

        const coupon = couponResult.rows[0];

        expect(coupon.usedCount).toBe(1);
        expect(coupon.usedCount).toBeLessThanOrEqual(
            coupon.maxUses
        );
    });
});