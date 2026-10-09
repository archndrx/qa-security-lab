
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const userId = getSessionUserId(request);

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { challengeId, severity, evidence } = body as {
    challengeId?: unknown;
    severity?: unknown;
    evidence?: unknown;
  };

  if (
    typeof challengeId !== "string" ||
    !challengeId ||
    typeof severity !== "string" ||
    !severity ||
    typeof evidence !== "string" ||
    !evidence
  ) {
    return NextResponse.json(
      { error: "challengeId, severity, and evidence are required" },
      { status: 400 }
    );
  }

  try {
    const user = await db.orm.public.User.where({ id: userId }).first();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    const challenge = await db.orm.public.Challenge
      .where({ id: challengeId })
      .first();

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    let isCorrect = false;

    if (challenge.slug === "idor") {
      // Seed data defines Alice's MacBook as order ID 1.
      const aliceOrder = await db.orm.public.Order
        .where({ id: 1 })
        .first();

      if (
        aliceOrder &&
        aliceOrder.userId !== userId &&
        severity === "HIGH"
      ) {
        isCorrect = true;
      }
    }

    if (challenge.slug === "rate-limit") {
      const normalizedEvidence = evidence.toLowerCase();

      const mentionsFailedAttempts =
        normalizedEvidence.includes("401") ||
        normalizedEvidence.includes("failed login") ||
        normalizedEvidence.includes("login attempts");

      const mentionsMissingRateLimit =
        normalizedEvidence.includes("429") ||
        normalizedEvidence.includes("rate limit");

      isCorrect =
        severity === "HIGH" &&
        mentionsFailedAttempts &&
        mentionsMissingRateLimit;
    }

    if (challenge.slug === "email-enumeration") {
      const normalizedEvidence = evidence.toLowerCase();

      const mentionsEnumeration =
        normalizedEvidence.includes("email enumeration") ||
        normalizedEvidence.includes("email exists") ||
        normalizedEvidence.includes("email registered") ||
        normalizedEvidence.includes("account exists");

      isCorrect = severity === "HIGH" && mentionsEnumeration;
    }

    const finding = await db.orm.public.Finding.create({
      userId,
      challengeId,
      severity,
      evidence,
      isCorrect,
    });

    return NextResponse.json(finding, { status: 201 });
  } catch (error) {
    console.error("FINDING CREATE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create finding" },
      { status: 500 }
    );
  }
}