import { test, expect } from "@playwright/test";
import {
    TEST_USERS,
    TEST_CHALLENGES,
} from "./config/test-data";

test.describe("Finding & Scoring Security Tests", () => {
    test("Correct rate limit finding should receive score 100", async ({
        request,
    }) => {
        const findingResponse = await request.post("/api/findings", {
            data: {
                userId: TEST_USERS.bob.id,
                challengeId: TEST_CHALLENGES.rateLimit,
                severity: "HIGH",
                evidence:
                    "10 login attempts returned HTTP 401 and no HTTP 429 rate limit response was observed.",
            },
        });

        expect(findingResponse.status()).toBe(201);

        const finding = await findingResponse.json();

        expect(finding.isCorrect).toBe(true);

        const resultResponse = await request.get(
            "/api/challenges/rate-limit/result",
            {
                headers: {
                    "X-User-ID": TEST_USERS.bob.id,
                },
            }
        );

        expect(resultResponse.status()).toBe(200);

        const result = await resultResponse.json();

        expect(result.correct).toBe(true);
        expect(result.score).toBe(100);
        expect(result.severity).toBe("HIGH");
        expect(result.findingId).toBe(finding.id);
    });

    test("Incorrect finding should receive score 0", async ({
        request,
    }) => {
        const findingResponse = await request.post("/api/findings", {
            data: {
                userId: TEST_USERS.bob.id,
                challengeId: TEST_CHALLENGES.rateLimit,
                severity: "LOW",
                evidence: "Login endpoint returned 401 for an invalid password.",
            },
        });

        expect(findingResponse.status()).toBe(201);

        const finding = await findingResponse.json();

        expect(finding.isCorrect).toBe(false);

        const resultResponse = await request.get(
            "/api/challenges/rate-limit/result",
            {
                headers: {
                    "X-User-ID": TEST_USERS.bob.id,
                },
            }
        );

        expect(resultResponse.status()).toBe(200);

        const result = await resultResponse.json();

        expect(result.correct).toBe(false);
        expect(result.score).toBe(0);
        expect(result.severity).toBe("LOW");
        expect(result.findingId).toBe(finding.id);
    });

    test("Correct email enumeration finding should receive score 100", async ({
        request,
    }) => {
        const findingResponse = await request.post("/api/findings", {
            data: {
                userId: TEST_USERS.bob.id,
                challengeId: TEST_CHALLENGES.emailEnumeration,
                severity: "HIGH",
                evidence:
                    "The check-email endpoint allows email enumeration because it reveals whether an email is registered.",
            },
        });

        expect(findingResponse.status()).toBe(201);

        const finding = await findingResponse.json();

        expect(finding.isCorrect).toBe(true);

        const resultResponse = await request.get(
            "/api/challenges/email-enumeration/result",
            {
                headers: {
                    "X-User-ID": TEST_USERS.bob.id,
                },
            }
        );

        expect(resultResponse.status()).toBe(200);

        const result = await resultResponse.json();

        expect(result.correct).toBe(true);
        expect(result.score).toBe(100);
        expect(result.severity).toBe("HIGH");
        expect(result.findingId).toBe(finding.id);
    });
});