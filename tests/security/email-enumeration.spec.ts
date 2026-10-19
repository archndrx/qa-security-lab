import { test, expect } from "@playwright/test";

test.describe("Email Enumeration Security Tests", () => {
  test("Existing and non-existing emails should not be distinguishable", async ({
    request,
  }) => {
    const existingResponse = await request.post(
      "/api/auth/check-email",
      {
        data: {
          email: "alice@lab.test",
        },
      }
    );

    const unknownResponse = await request.post(
      "/api/auth/check-email",
      {
        data: {
          email: "unknown@lab.test",
        },
      }
    );

    expect(
      existingResponse.status(),
      "Existing email should not reveal account existence"
    ).toBe(200);

    expect(
      unknownResponse.status(),
      "Non-existing email should not reveal account existence"
    ).toBe(200);

    const existingBody = await existingResponse.json();
    const unknownBody = await unknownResponse.json();

    expect(existingBody.exists).toBe(false);
    expect(unknownBody.exists).toBe(false);
  });

  test("Invalid JSON body should return 400", async ({ request }) => {
    const response = await request.post("/api/auth/check-email", {
      headers: {
        "content-type": "application/json",
      },
      data: Buffer.from("{invalid-json"),
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid JSON body",
    });
  });

  test("Invalid email values should return 400", async ({ request }) => {
    const invalidBodies = [
      {},
      { email: "" },
      { email: "   " },
      { email: 123 },
      null,
      [],
    ];

    for (const data of invalidBodies) {
      const response = await request.post("/api/auth/check-email", {
        data,
      });

      expect(
        response.status(),
        `Expected 400 for input: ${JSON.stringify(data)}`
      ).toBe(400);
    }
  });
});