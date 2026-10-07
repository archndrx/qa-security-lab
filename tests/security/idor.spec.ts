import { test, expect } from "@playwright/test";
import {
  TEST_USERS,
  TEST_ORDERS,
} from "./config/test-data";

test.describe("IDOR Security Tests", () => {
  test("Alice can access her own order", async ({ request }) => {
    const response = await request.get(
      `/api/orders/${TEST_ORDERS.aliceMacbook}`,
      {
        headers: {
          "X-User-ID": TEST_USERS.alice.id,
        },
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.id).toBe(TEST_ORDERS.aliceMacbook);
    expect(body.userId).toBe(TEST_USERS.alice.id);
  });

  test("Bob cannot access Alice's order", async ({ request }) => {
    const response = await request.get(
      `/api/orders/${TEST_ORDERS.aliceMacbook}`,
      {
        headers: {
          "X-User-ID": TEST_USERS.bob.id,
        },
      }
    );

    expect(response.status()).toBe(403);
  });

  test("Bob can access his own order", async ({ request }) => {
    const response = await request.get(
      `/api/orders/${TEST_ORDERS.bobMonitor}`,
      {
        headers: {
          "X-User-ID": TEST_USERS.bob.id,
        },
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.id).toBe(TEST_ORDERS.bobMonitor);
    expect(body.userId).toBe(TEST_USERS.bob.id);
  });

  test("Request without user ID is rejected", async ({ request }) => {
    const response = await request.get(
      `/api/orders/${TEST_ORDERS.aliceMacbook}`
    );

    expect(response.status()).toBe(401);
  });

  test("Invalid order ID is rejected", async ({ request }) => {
    const response = await request.get("/api/orders/invalid", {
      headers: {
        "X-User-ID": TEST_USERS.alice.id,
      },
    });

    expect(response.status()).toBe(400);
  });
});