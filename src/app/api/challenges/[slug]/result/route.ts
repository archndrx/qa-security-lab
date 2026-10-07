import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const userId = request.headers.get("X-User-ID");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing X-User-ID header" },
      { status: 401 }
    );
  }

  const challenge = await db.orm.public.Challenge
    .where({ slug })
    .first();

  if (!challenge) {
    return NextResponse.json(
      { error: "Challenge not found" },
      { status: 404 }
    );
  }

  const findings = await db.orm.public.Finding
    .where({
      userId,
      challengeId: challenge.id,
    })
    .all();

  if (findings.length === 0) {
    return NextResponse.json({
      correct: false,
      score: 0,
      message: "No finding submitted yet",
    });
  }

  const latestFinding = findings[findings.length - 1];

  const score = latestFinding.isCorrect ? 100 : 0;

  return NextResponse.json({
    correct: latestFinding.isCorrect,
    score,
    severity: latestFinding.severity,
    findingId: latestFinding.id,
  });
}