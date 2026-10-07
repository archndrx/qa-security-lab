import { test, expect } from "@playwright/test";

test.describe("Open Redirect Security Tests", () => {
  test("External URL should be blocked", async ({ request }) => {
    const response = await request.get(
      "/api/redirect?url=https://evil.example.com",
      {
        maxRedirects: 0,
      }
    );

    expect(
      response.status(),
      "Security vulnerability detected: external URL was accepted"
    ).toBe(400);
  });

  test("Protocol-relative URL should be blocked", async ({ request }) => {
    const response = await request.get(
      "/api/redirect?url=//evil.example.com",
      {
        maxRedirects: 0,
      }
    );

    expect(
      response.status(),
      "Security vulnerability detected: protocol-relative redirect was accepted"
    ).toBe(400);
  });

  test("JavaScript URL should be blocked", async ({ request }) => {
    const response = await request.get(
      "/api/redirect?url=javascript:alert(1)",
      {
        maxRedirects: 0,
      }
    );

    expect(
      response.status(),
      "Security vulnerability detected: javascript URL was accepted"
    ).toBe(400);
  });

  test("Internal path should be allowed", async ({ request }) => {
    const response = await request.get(
      "/api/redirect?url=/dashboard",
      {
        maxRedirects: 0,
      }
    );

    expect(response.status()).toBe(307);

    expect(response.headers().location).toBe(
      "http://localhost:3000/dashboard"
    );
  });

  test("Missing URL should be rejected", async ({ request }) => {
    const response = await request.get("/api/redirect");

    expect(response.status()).toBe(400);
  });
});