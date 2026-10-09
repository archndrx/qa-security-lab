
import { test, expect } from "@playwright/test";

test.describe("Sensitive Data Exposure", () => {
  test("should not expose sensitive fields after successful login", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/login", {
      data: {
        email: "alice@lab.test",
        password: "password123",
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    const responseText = JSON.stringify(body);

    expect(body).toHaveProperty("message", "Login successful");
    expect(body).toHaveProperty("userId");

    expect(body).not.toHaveProperty("password");
    expect(body).not.toHaveProperty("passwordHash");
    expect(body).not.toHaveProperty("token");
    expect(body).not.toHaveProperty("accessToken");
    expect(body).not.toHaveProperty("user");

    expect(responseText).not.toContain("password123");
  });

  test("should not expose sensitive data after failed login", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/login", {
      data: {
        email: "alice@lab.test",
        password: "wrong-password",
      },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();
    const responseText = JSON.stringify(body);

    expect(body).toHaveProperty("error", "Invalid credentials");

    expect(body).not.toHaveProperty("password");
    expect(body).not.toHaveProperty("passwordHash");
    expect(body).not.toHaveProperty("token");
    expect(body).not.toHaveProperty("accessToken");
    expect(body).not.toHaveProperty("user");

    expect(responseText).not.toContain("wrong-password");
    expect(responseText).not.toContain("password123");
  });

  test("should not expose internal error details for invalid JSON", async ({
    request,
  }) => {
    const response = await request.post("/api/findings", {
      headers: {
        "Content-Type": "application/json",
      },
      data: '{"userId":',
    });

    expect(response.status()).toBe(400);

    const body = await response.json();

    expect(body).toEqual({
      error: "Invalid JSON body",
    });

    expect(body).not.toHaveProperty("detail");
    expect(body).not.toHaveProperty("stack");
  });
});
