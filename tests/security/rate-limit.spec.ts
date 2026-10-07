import { test, expect } from "@playwright/test";

test.describe("Rate Limit Security Tests", () => {
  test("Login endpoint should enforce rate limiting", async ({ request }) => {
    const responses: number[] = [];

    for (let i = 0; i < 10; i++) {
      const response = await request.post("/api/auth/login", {
        data: {
          email: "alice@lab.test",
          password: "wrong",
        },
      });

      responses.push(response.status());
    }

    expect(
      responses.some((status) => status === 429),
      `Rate limit not detected. Responses: ${responses.join(", ")}`
    ).toBe(true);
  });
});