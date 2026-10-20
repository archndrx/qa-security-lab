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

  test("should enforce the limit for concurrent failed login attempts", async ({
    request,
  }) => {
    const email = `rate-limit-parallel-${Date.now()}@lab.test`;

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        request.post("/api/auth/login", {
          data: {
            email,
            password: "wrong",
          },
        })
      )
    );

    const statuses = responses.map((response) => response.status());

    expect(
      statuses.filter((status) => status === 401).length,
      `Expected five failed-login responses. Got: ${statuses.join(", ")}`
    ).toBe(5);

    expect(
      statuses.filter((status) => status === 429).length,
      `Expected five rate-limit responses. Got: ${statuses.join(", ")}`
    ).toBe(5);

    expect(statuses.every((status) => status === 401 || status === 429)).toBe(
      true
    );
  });
});
