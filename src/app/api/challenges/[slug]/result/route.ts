import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pgPool } from "@/lib/pg";
import { getSessionUserId } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const userId = getSessionUserId(request);

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { slug } = await params;

  const challenge = await db.orm.public.Challenge
    .where({ slug })
    .first();

  if (!challenge) {
    return NextResponse.json(
      { error: "Challenge not found" },
      { status: 404 }
    );
  }

  const result = await pgPool.query<{
    id: string;
    isCorrect: boolean;
    severity: string;
  }>(
    `
    SELECT "id", "isCorrect", "severity"
    FROM "Finding"
    WHERE "userId" = $1
      AND "challengeId" = $2
    ORDER BY "createdAt" DESC, "id" DESC
    LIMIT 1
    `,
    [userId, challenge.id]
  );

  const latestFinding = result.rows[0];

  if (!latestFinding) {
    return NextResponse.json({
      correct: false,
      score: 0,
      message: "No finding submitted yet",
    });
  }

  return NextResponse.json({
    correct: latestFinding.isCorrect,
    score: latestFinding.isCorrect ? 100 : 0,
    severity: latestFinding.severity,
    findingId: latestFinding.id,
  });
}