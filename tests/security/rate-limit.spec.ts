import { test, expect } from "@playwright/test";

test.describe("Rate Limit Security Tests", () => {
  test("should allow five failed attempts then block further attempts", async ({
    request,
  }) => {
    const email = `rate-limit-${Date.now()}@lab.test`;
    const responses: number[] = [];

    for (let i = 0; i < 7; i++) {
      const response = await request.post("/api/auth/login", {
        data: {
          email,
          password: "wrong",
        },
      });

      responses.push(response.status());
    }

    expect(
      responses.slice(0, 5),
      `First five attempts should return 401. Responses: ${responses.join(", ")}`
    ).toEqual([401, 401, 401, 401, 401]);

    expect(
      responses.slice(5),
      `Attempts after the limit should return 429. Responses: ${responses.join(", ")}`
    ).toEqual([429, 429]);
  });
});
