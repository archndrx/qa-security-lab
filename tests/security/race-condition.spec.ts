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
        playwright,
    }) => {
        const baseURL = "http://localhost:3000";
        const aliceRequest = await playwright.request.newContext({ baseURL });
        const bobRequest = await playwright.request.newContext({ baseURL });

        try {
            const [aliceLogin, bobLogin] = await Promise.all([
                aliceRequest.post("/api/auth/login", {
                    data: {
                        email: "alice@lab.test",
                        password: "password123",
                    },
                }),
                bobRequest.post("/api/auth/login", {
                    data: {
                        email: "bob@lab.test",
                        password: "password123",
                    },
                }),
            ]);

            expect(
                aliceLogin.status(),
                `Alice login failed: ${await aliceLogin.text()}`
            ).toBe(200);

            expect(
                bobLogin.status(),
                `Bob login failed: ${await bobLogin.text()}`
            ).toBe(200);

            const [response1, response2] = await Promise.all([
                aliceRequest.post("/api/coupons/redeem", {
                    data: { code: couponCode },
                }),
                bobRequest.post("/api/coupons/redeem", {
                    data: { code: couponCode },
                }),
            ]);

            expect(
                [response1.status(), response2.status()].sort()
            ).toEqual([200, 409]);

            const couponResult = await pool.query<{
                usedCount: number;
                maxUses: number;
            }>(
                `
      SELECT "usedCount", "maxUses"
      FROM "Coupon"
      WHERE "code" = $1
      `,
                [couponCode]
            );

            expect(couponResult.rowCount).toBe(1);
            expect(couponResult.rows[0].usedCount).toBe(1);
            expect(couponResult.rows[0].usedCount).toBeLessThanOrEqual(
                couponResult.rows[0].maxUses
            );
        } finally {
            await aliceRequest.dispose();
            await bobRequest.dispose();
        }
    });

    test("should reject repeated redemption after a coupon is fully used", async ({
        playwright,
    }) => {
        const baseURL = "http://localhost:3000";
        const repeatedCouponCode = `REPEAT-${randomUUID()}`;
        const couponId = randomUUID();
        const request = await playwright.request.newContext({ baseURL });

        try {
            await pool.query(
                `
                INSERT INTO "Coupon"
                    ("id", "code", "discount", "maxUses", "usedCount", "createdAt")
                VALUES ($1, $2, $3, $4, $5, NOW())
                `,
                [couponId, repeatedCouponCode, 50, 1, 0]
            );

            const loginResponse = await request.post("/api/auth/login", {
                data: {
                    email: "alice@lab.test",
                    password: "password123",
                },
            });

            expect(loginResponse.status()).toBe(200);

            const firstResponse = await request.post("/api/coupons/redeem", {
                data: { code: repeatedCouponCode },
            });

            expect(firstResponse.status()).toBe(200);

            const secondResponse = await request.post("/api/coupons/redeem", {
                data: { code: repeatedCouponCode },
            });

            expect(secondResponse.status()).toBe(409);
            await expect(secondResponse.json()).resolves.toMatchObject({
                error: "Coupon not found or already fully redeemed",
            });

            const result = await pool.query<{
                usedCount: number;
                maxUses: number;
            }>(
                `SELECT "usedCount", "maxUses" FROM "Coupon" WHERE "id" = $1`,
                [couponId]
            );

            expect(result.rowCount).toBe(1);
            expect(result.rows[0].usedCount).toBe(1);
            expect(result.rows[0].usedCount).toBeLessThanOrEqual(
                result.rows[0].maxUses
            );
        } finally {
            await pool.query(
                `DELETE FROM "CouponRedemption" WHERE "couponId" = $1`,
                [couponId]
            );
            await pool.query(`DELETE FROM "Coupon" WHERE "id" = $1`, [
                couponId,
            ]);
            await request.dispose();
        }
    });

    test("should reject repeated redemption by the same user while coupon still has uses", async ({
        playwright,
    }) => {
        const baseURL = "http://localhost:3000";
        const repeatedCouponCode = `DUPLICATE-${randomUUID()}`;
        const couponId = randomUUID();
        const request = await playwright.request.newContext({ baseURL });

        try {
            await pool.query(
                `
            INSERT INTO "Coupon"
                ("id", "code", "discount", "maxUses", "usedCount", "createdAt")
            VALUES ($1, $2, $3, $4, $5, NOW())
            `,
                [couponId, repeatedCouponCode, 50, 3, 0]
            );

            const loginResponse = await request.post("/api/auth/login", {
                data: {
                    email: "alice@lab.test",
                    password: "password123",
                },
            });

            expect(loginResponse.status()).toBe(200);

            const firstResponse = await request.post("/api/coupons/redeem", {
                data: { code: repeatedCouponCode },
            });

            expect(firstResponse.status()).toBe(200);

            const secondResponse = await request.post("/api/coupons/redeem", {
                data: { code: repeatedCouponCode },
            });

            expect(secondResponse.status()).toBe(409);
            await expect(secondResponse.json()).resolves.toMatchObject({
                error: "Coupon already redeemed by this user",
            });

            const result = await pool.query<{
                usedCount: number;
                redemptions: number;
            }>(
                `
            SELECT
                c."usedCount",
                COUNT(r."id")::int AS redemptions
            FROM "Coupon" c
            LEFT JOIN "CouponRedemption" r ON r."couponId" = c."id"
            WHERE c."id" = $1
            GROUP BY c."id", c."usedCount"
            `,
                [couponId]
            );

            expect(result.rowCount).toBe(1);
            expect(result.rows[0].usedCount).toBe(1);
            expect(result.rows[0].redemptions).toBe(1);
        } finally {
            await pool.query(
                `DELETE FROM "CouponRedemption" WHERE "couponId" = $1`,
                [couponId]
            );
            await pool.query(`DELETE FROM "Coupon" WHERE "id" = $1`, [couponId]);
            await request.dispose();
        }
    });
});
