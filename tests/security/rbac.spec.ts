import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { sessionHeaders } from "./helpers/session";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: databaseUrl });

let userId = "";
let adminId = "";

test.beforeEach(async () => {
  const suffix = randomUUID();

  userId = `rbac-user-${suffix}`;
  adminId = `rbac-admin-${suffix}`;

  await pool.query(
    `
    INSERT INTO "User"
      ("id", "email", "password", "name", "isAdmin", "isVerified")
    VALUES
      ($1, $2, 'unused-test-password', 'Regular User', false, true),
      ($3, $4, 'unused-test-password', 'Admin User', true, true)
    `,
    [
      userId,
      `${userId}@lab.test`,
      adminId,
      `${adminId}@lab.test`,
    ]
  );
});

test.afterEach(async () => {
  await pool.query(
    `DELETE FROM "User" WHERE "id" = ANY($1::text[])`,
    [[userId, adminId]]
  );
});

test.afterAll(async () => {
  await pool.end();
});

test("rejects unauthenticated requests", async ({ request }) => {
  const response = await request.get("/api/admin/users");

  expect(response.status()).toBe(401);
});

test("denies admin endpoint to regular users", async ({ request }) => {
  const response = await request.get("/api/admin/users", {
    headers: sessionHeaders(userId),
  });

  expect(response.status()).toBe(403);
});

test("allows admins to access the endpoint", async ({ request }) => {
  const response = await request.get("/api/admin/users", {
    headers: sessionHeaders(adminId),
  });

  expect(response.status()).toBe(200);

  const body = await response.json();

  expect(body.users).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: userId,
        isAdmin: false,
      }),
      expect.objectContaining({
        id: adminId,
        isAdmin: true,
      }),
    ])
  );

  expect(body.users[0]).not.toHaveProperty("password");
});

test("does not grant admin access after a mass-assignment attempt", async ({
  request,
}) => {
  const updateResponse = await request.patch("/api/users/profile", {
    headers: sessionHeaders(userId),
    data: {
      name: "Regular User",
      isAdmin: true,
    },
  });

  expect(updateResponse.status()).toBe(200);

  const adminResponse = await request.get("/api/admin/users", {
    headers: sessionHeaders(userId),
  });

  expect(adminResponse.status()).toBe(403);

  const databaseResult = await pool.query<{ isAdmin: boolean }>(
    `SELECT "isAdmin" FROM "User" WHERE "id" = $1`,
    [userId]
  );

  expect(databaseResult.rows[0].isAdmin).toBe(false);
});