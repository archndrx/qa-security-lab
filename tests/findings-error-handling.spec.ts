import { test, expect } from "@playwright/test";
import { NextRequest } from "next/server";
import { createFindingsPostHandler } from "../src/lib/findings/handler";

test("returns a generic 500 response when finding creation fails", async () => {
  const loggedErrors: unknown[][] = [];

  const mockDatabase = {
    orm: {
      public: {
        User: {
          where: (_filter: { id: string }) => ({
            first: async () => ({ id: "test-user" }),
          }),
        },
        Challenge: {
          where: (_filter: { id: string }) => ({
            first: async () => ({ slug: "other-challenge" }),
          }),
        },
        Order: {
          where: (_filter: { id: number }) => ({
            first: async () => null,
          }),
        },
        Finding: {
          create: async () => {
            throw new Error(
              "Sensitive database error: internal SQL details"
            );
          },
        },
      },
    },
  };

  const handler = createFindingsPostHandler({
    database: mockDatabase,
    getSessionUserId: async () => "test-user",
    logger: {
      error: (...args: unknown[]) => {
        loggedErrors.push(args);
      },
    },
  });

  const request = new NextRequest(
    "http://localhost/api/findings",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        challengeId: "test-challenge",
        severity: "HIGH",
        evidence: "Test evidence",
      }),
    }
  );

  const response = await handler(request);
  const body = await response.json();
  const responseText = JSON.stringify(body);

  expect(response.status).toBe(500);
  expect(body).toEqual({
    error: "Failed to create finding",
  });

  expect(responseText).not.toContain("Sensitive database error");
  expect(responseText).not.toContain("internal SQL details");
  expect(responseText).not.toContain("stack");

  // Internal errors are logged server-side, not returned to the client.
  expect(loggedErrors).toHaveLength(1);
});