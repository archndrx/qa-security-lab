import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { sessionHeaders } from "./helpers/session";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

// Each test gets its own user so the per-email login rate limit never
// couples tests together or carries over between quick reruns.
let MA_USER_ID = "";
let MA_USER_EMAIL = "";

async function loginAsAlice(request: {
  post: (
    url: string,
    options: { data: { email: string; password: string } }
  ) => Promise<{ status: () => number }>;
}) {
  const response = await request.post("/api/auth/login", {
    data: {
      email: MA_USER_EMAIL,
      password: "password123",
    },
  });

  expect(response.status()).toBe(200);
}

test.describe("Mass Assignment Security", () => {
  test.beforeEach(async () => {
    const suffix = randomUUID();
    MA_USER_ID = `test-ma-alice-${suffix}`;
    MA_USER_EMAIL = `mass-assignment-alice-${suffix}@lab.test`;

    const passwordHash = await bcrypt.hash("password123", 12);

    await pool.query(
      `
      INSERT INTO "User" ("id", "email", "password", "name", "isAdmin", "isVerified")
      VALUES ($1, $2, $3, 'Alice', false, true)
      ON CONFLICT ("id") DO UPDATE SET
        "name" = 'Alice',
        "isAdmin" = false,
        "isVerified" = true
      `,
      [MA_USER_ID, MA_USER_EMAIL, passwordHash]
    );
  });

  test.afterEach(async () => {
    await pool.query(`DELETE FROM "User" WHERE "id" = $1`, [MA_USER_ID]);
  });

  test.afterAll(async () => {
    await pool.end();
  });

  test("should prevent mass assignment of protected fields", async ({
    request,
  }) => {
    await loginAsAlice(request);

    const response = await request.patch("/api/users/profile", {
      data: {
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
      [MA_USER_ID]
    );

    expect(databaseResult.rowCount).toBe(1);
    expect(databaseResult.rows[0].name).toBe("Alice Updated");
    expect(databaseResult.rows[0].isAdmin).toBe(false);
    expect(databaseResult.rows[0].isVerified).toBe(true);
  });

  test("should allow updating the name without protected fields", async ({
    request,
  }) => {
    await loginAsAlice(request);

    const response = await request.patch("/api/users/profile", {
      data: {
        name: "Alice QA",
      },
    });

    expect(response.status()).toBe(200);

    const result = await response.json();

    expect(result.user.name).toBe("Alice QA");
    expect(result.user.isAdmin).toBe(false);
    expect(result.user.isVerified).toBe(true);
  });

  test("should not allow Alice to update Bob by forging userId", async ({
    request,
  }) => {
    await pool.query(
      `UPDATE "User" SET "name" = 'Bob' WHERE "id" = $1`,
      ["test-bob"]
    );

    try {
      await loginAsAlice(request);

      const response = await request.patch("/api/users/profile", {
        data: {
          userId: "test-bob",
          name: "Hacked Bob",
        },
      });

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.user.id).toBe(MA_USER_ID);
      expect(result.user.name).toBe("Hacked Bob");

      const bob = await pool.query(
        `SELECT "name" FROM "User" WHERE "id" = $1`,
        ["test-bob"]
      );

      expect(bob.rows[0].name).toBe("Bob");
    } finally {
      await pool.query(
        `UPDATE "User" SET "name" = 'Bob' WHERE "id" = $1`,
        ["test-bob"]
      );
    }
  });

  test("should reject a tampered session cookie", async ({ request }) => {
    const token = sessionHeaders("test-bob").Cookie.replace("qa_session=", "");

    const [payload, signature] = token.split(".");
    expect(payload).toBeTruthy();
    expect(signature).toBeTruthy();

    const tamperedPayload =
      payload.slice(0, -1) + (payload.endsWith("A") ? "B" : "A");
    const tamperedToken = `${tamperedPayload}.${signature}`;

    const response = await request.patch("/api/users/profile", {
      headers: {
        Cookie: `qa_session=${tamperedToken}`,
      },
      data: { name: "Tampered Session" },
    });

    expect(response.status()).toBe(401);
  });

  test("should reject profile updates without a valid session", async ({
    request,
  }) => {
    const response = await request.patch("/api/users/profile", {
      data: { userId: MA_USER_ID, name: "Hacked" },
    });

    expect(response.status()).toBe(401);

    const forged = await request.patch("/api/users/profile", {
      headers: { Cookie: "qa_session=forged.signature" },
      data: { name: "Hacked" },
    });

    expect(forged.status()).toBe(401);
  });
});
