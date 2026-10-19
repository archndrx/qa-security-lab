
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
    // Authenticate first so the test reaches JSON parsing.
    const loginResponse = await request.post("/api/auth/login", {
      data: {
        email: "alice@lab.test",
        password: "password123",
      },
    });

    expect(loginResponse.status()).toBe(200);

    const response = await request.post("/api/findings", {
      headers: {
        "Content-Type": "application/json",
      },
      data: '{"challengeId":',
    });

    expect(response.status()).toBe(400);

    const body = await response.json();

    expect(body).toEqual({
      error: "Invalid JSON body",
    });

    expect(body).not.toHaveProperty("detail");
    expect(body).not.toHaveProperty("stack");
  });

  test("should reject missing login fields", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      data: { email: "alice@lab.test" },
    });

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Email and password are required",
    });
  });

  test("should reject a non-string email", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      data: { email: 123, password: "password123" },
    });

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Email and password are required",
    });
  });

  test("should reject an empty password", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      data: { email: "alice@lab.test", password: "" },
    });

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Email and password are required",
    });
  });

  test("should set secure session cookie attributes after login", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/login", {
      data: {
        email: "alice@lab.test",
        password: "password123",
      },
    });

    expect(response.status()).toBe(200);

    const setCookie = response.headers()["set-cookie"];

    expect(setCookie).toBeTruthy();
    expect(setCookie).toMatch(/(?:^|,\s*)qa_session=/i);
    expect(setCookie).toMatch(/;\s*httponly(?:;|,|$)/i);
    expect(setCookie).toMatch(/;\s*samesite=lax(?:;|,|$)/i);
    expect(setCookie).toMatch(/;\s*path=\//i);
    expect(setCookie).toMatch(/;\s*max-age=3600(?:;|,|$)/i);

    if (process.env.NODE_ENV === "production") {
      expect(setCookie).toMatch(/;\s*secure(?:;|,|$)/i);
    }
  });

  test("should clear the session cookie on logout", async ({ request }) => {
    const response = await request.post("/api/auth/logout");

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "Logout successful",
    });

    const setCookie = response.headers()["set-cookie"];

    expect(setCookie).toBeTruthy();
    expect(setCookie).toMatch(/(?:^|,\s*)qa_session=/i);
    expect(setCookie).toMatch(/;\s*httponly(?:;|,|$)/i);
    expect(setCookie).toMatch(/;\s*samesite=lax(?:;|,|$)/i);
    expect(setCookie).toMatch(/;\s*path=\//i);
    expect(setCookie).toMatch(/;\s*max-age=0(?:;|,|$)/i);
    expect(setCookie).toMatch(/;\s*expires=Thu, 01 Jan 1970/i);
  });
});
