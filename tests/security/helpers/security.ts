import { expect } from "@playwright/test";

export async function expectUnauthorizedAccessBlocked(
  response: { status(): number },
  expectedStatus = 403
) {
  expect(
    response.status(),
    `Security vulnerability detected: unauthorized access returned HTTP ${response.status()}`
  ).toBe(expectedStatus);
}
