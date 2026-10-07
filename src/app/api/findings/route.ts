import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      userId,
      challengeId,
      severity,
      evidence,
    } = body;

    if (!userId || !challengeId || !severity || !evidence) {
      return NextResponse.json(
        {
          error:
            "userId, challengeId, severity, and evidence are required",
        },
        { status: 400 }
      );
    }

    // Check user
    const user = await db.orm.public.User
      .where({ id: userId })
      .first();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check challenge
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
      const aliceOrder = await db.orm.public.Order
        .where({ id: 5 })
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

      if (
        severity === "HIGH" &&
        mentionsFailedAttempts &&
        mentionsMissingRateLimit
      ) {
        isCorrect = true;
      }
    }

    if (challenge.slug === "email-enumeration") {
      const normalizedEvidence = evidence.toLowerCase();

      const mentionsEnumeration =
        normalizedEvidence.includes("email enumeration") ||
        normalizedEvidence.includes("email exists") ||
        normalizedEvidence.includes("email registered") ||
        normalizedEvidence.includes("account exists");

      if (
        severity === "HIGH" &&
        mentionsEnumeration
      ) {
        isCorrect = true;
      }
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
      {
        error: "Failed to create finding",
        detail: String(error),
      },
      { status: 500 }
    );
  }
}