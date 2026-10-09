
import { test, expect, type APIRequestContext } from "@playwright/test";
import { TEST_USERS, TEST_CHALLENGES } from "./config/test-data";

async function loginAsAlice(request: APIRequestContext) {
    const response = await request.post("/api/auth/login", {
        data: {
            email: TEST_USERS.alice.email,
            password: "password123",
        },
    });

    expect(response.status()).toBe(200);
}

async function loginAsBob(request: APIRequestContext) {
    const response = await request.post("/api/auth/login", {
        data: {
            email: TEST_USERS.bob.email,
            password: "password123",
        },
    });

    expect(response.status()).toBe(200);
}

test.describe("Finding & Scoring Security Tests", () => {
    test("Correct rate limit finding should receive score 100", async ({ request }) => {
        await loginAsBob(request);

        const findingResponse = await request.post("/api/findings", {
            data: {
                challengeId: TEST_CHALLENGES.rateLimit,
                severity: "HIGH",
                evidence:
                    "10 login attempts returned HTTP 401 and no HTTP 429 rate limit response was observed.",
            },
        });

        expect(findingResponse.status()).toBe(201);
        const finding = await findingResponse.json();
        expect(finding.userId).toBe(TEST_USERS.bob.id);
        expect(finding.isCorrect).toBe(true);

        const resultResponse = await request.get(
            "/api/challenges/rate-limit/result"
        );

        expect(resultResponse.status()).toBe(200);
        const result = await resultResponse.json();

        expect(result.correct).toBe(true);
        expect(result.score).toBe(100);
        expect(result.severity).toBe("HIGH");
        expect(result.findingId).toBe(finding.id);
    });

    test("Incorrect finding should receive score 0", async ({ request }) => {
        await loginAsBob(request);

        const findingResponse = await request.post("/api/findings", {
            data: {
                challengeId: TEST_CHALLENGES.rateLimit,
                severity: "LOW",
                evidence: "Login endpoint returned 401 for an invalid password.",
            },
        });

        expect(findingResponse.status()).toBe(201);
        const finding = await findingResponse.json();
        expect(finding.userId).toBe(TEST_USERS.bob.id);
        expect(finding.isCorrect).toBe(false);

        const resultResponse = await request.get(
            "/api/challenges/rate-limit/result"
        );

        expect(resultResponse.status()).toBe(200);
        const result = await resultResponse.json();

        expect(result.correct).toBe(false);
        expect(result.score).toBe(0);
        expect(result.severity).toBe("LOW");
        expect(result.findingId).toBe(finding.id);
    });

    test("Correct email enumeration finding should receive score 100", async ({ request }) => {
        await loginAsBob(request);

        const findingResponse = await request.post("/api/findings", {
            data: {
                challengeId: TEST_CHALLENGES.emailEnumeration,
                severity: "HIGH",
                evidence:
                    "The check-email endpoint allows email enumeration because it reveals whether an email is registered.",
            },
        });

        expect(findingResponse.status()).toBe(201);
        const finding = await findingResponse.json();
        expect(finding.userId).toBe(TEST_USERS.bob.id);
        expect(finding.isCorrect).toBe(true);

        const resultResponse = await request.get(
            "/api/challenges/email-enumeration/result"
        );

        expect(resultResponse.status()).toBe(200);
        const result = await resultResponse.json();

        expect(result.correct).toBe(true);
        expect(result.score).toBe(100);
        expect(result.severity).toBe("HIGH");
        expect(result.findingId).toBe(finding.id);
    });

    test("Unauthenticated finding submission is rejected", async ({ request }) => {
        const response = await request.post("/api/findings", {
            data: {
                userId: TEST_USERS.bob.id,
                challengeId: TEST_CHALLENGES.rateLimit,
                severity: "HIGH",
                evidence: "Example evidence",
            },
        });

        expect(response.status()).toBe(401);
    });

    test("Forged userId cannot impersonate Alice", async ({ request }) => {
        await loginAsBob(request);

        const response = await request.post("/api/findings", {
            data: {
                userId: TEST_USERS.alice.id,
                challengeId: TEST_CHALLENGES.rateLimit,
                severity: "HIGH",
                evidence: "10 login attempts returned HTTP 401 and no HTTP 429 rate limit response was observed.",
            },
        });

        expect(response.status()).toBe(201);
        const finding = await response.json();

        expect(finding.userId).toBe(TEST_USERS.bob.id);
        expect(finding.userId).not.toBe(TEST_USERS.alice.id);
    });


    test("Result should return the latest finding for the authenticated user", async ({
        request,
    }) => {
        await loginAsBob(request);

        const firstResponse = await request.post("/api/findings", {
            data: {
                challengeId: TEST_CHALLENGES.rateLimit,
                severity: "LOW",
                evidence: "Login endpoint returned 401 for an invalid password.",
            },
        });

        expect(firstResponse.status()).toBe(201);

        await new Promise((resolve) => setTimeout(resolve, 20));

        const secondResponse = await request.post("/api/findings", {
            data: {
                challengeId: TEST_CHALLENGES.rateLimit,
                severity: "HIGH",
                evidence:
                    "10 login attempts returned HTTP 401 and no HTTP 429 rate limit response was observed.",
            },
        });

        expect(secondResponse.status()).toBe(201);
        const secondFinding = await secondResponse.json();

        const resultResponse = await request.get(
            "/api/challenges/rate-limit/result"
        );

        expect(resultResponse.status()).toBe(200);
        const result = await resultResponse.json();

        expect(result.findingId).toBe(secondFinding.id);
        expect(result.correct).toBe(true);
        expect(result.score).toBe(100);
        expect(result.severity).toBe("HIGH");
    });

    test("Result should not expose another user's finding", async ({
        request,
    }) => {
        await loginAsBob(request);

        const bobFindingResponse = await request.post("/api/findings", {
            data: {
                challengeId: TEST_CHALLENGES.rateLimit,
                severity: "LOW",
                evidence: "Login endpoint returned 401 for an invalid password.",
            },
        });

        expect(bobFindingResponse.status()).toBe(201);
        const bobFinding = await bobFindingResponse.json();

        await new Promise((resolve) => setTimeout(resolve, 20));

        await loginAsAlice(request);

        const aliceFindingResponse = await request.post("/api/findings", {
            data: {
                challengeId: TEST_CHALLENGES.rateLimit,
                severity: "HIGH",
                evidence:
                    "10 login attempts returned HTTP 401 and no HTTP 429 rate limit response was observed.",
            },
        });

        expect(aliceFindingResponse.status()).toBe(201);

        await loginAsBob(request);

        const resultResponse = await request.get(
            "/api/challenges/rate-limit/result"
        );

        expect(resultResponse.status()).toBe(200);
        const result = await resultResponse.json();

        expect(result.findingId).toBe(bobFinding.id);
        expect(result.severity).toBe("LOW");
        expect(result.correct).toBe(false);
        expect(result.score).toBe(0);
    });
});
