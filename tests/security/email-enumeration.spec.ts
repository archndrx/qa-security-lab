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
});