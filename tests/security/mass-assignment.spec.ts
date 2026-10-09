import { test, expect } from "@playwright/test";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

test.describe("Mass Assignment Security", () => {
  test.beforeEach(async () => {
    await pool.query(
      `
      UPDATE "User"
      SET
        "name" = 'Alice',
        "isAdmin" = false,
        "isVerified" = true
      WHERE "id" = $1
      `,
      ["test-alice"]
    );
  });

  test.afterAll(async () => {
    try {
      await pool.query(
        `
        UPDATE "User"
        SET
          "name" = 'Alice',
          "isAdmin" = false,
          "isVerified" = true
        WHERE "id" = $1
        `,
        ["test-alice"]
      );
    } finally {
      await pool.end();
    }
  });

  test("should prevent mass assignment of protected fields", async ({
    request,
  }) => {
    const response = await request.patch("/api/users/profile", {
      data: {
        userId: "test-alice",
        name: "Alice Updated",
        isAdmin: true,
        isVerified: false,
      },
    });

    expect(response.status()).toBe(200);

    const result = await response.json();

    expect(result.user.name).toBe("Alice Updated");
    expect(result.user.isAdmin).toBe(false);
    expect(result.user.isVerified).toBe(true);

    const databaseResult = await pool.query<{
      name: string;
      isAdmin: boolean;
      isVerified: boolean;
    }>(
      `
      SELECT "name", "isAdmin", "isVerified"
      FROM "User"
      WHERE "id" = $1
      `,
      ["test-alice"]
    );

    expect(databaseResult.rowCount).toBe(1);
    expect(databaseResult.rows[0].name).toBe("Alice Updated");
    expect(databaseResult.rows[0].isAdmin).toBe(false);
    expect(databaseResult.rows[0].isVerified).toBe(true);
  });

  test("should allow updating the name without protected fields", async ({
    request,
  }) => {
    const response = await request.patch("/api/users/profile", {
      data: {
        userId: "test-alice",
        name: "Alice QA",
      },
    });

    expect(response.status()).toBe(200);

    const result = await response.json();

    expect(result.user.name).toBe("Alice QA");
    expect(result.user.isAdmin).toBe(false);
    expect(result.user.isVerified).toBe(true);
  });
});