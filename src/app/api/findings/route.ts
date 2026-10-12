import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { createFindingsPostHandler } from "@/lib/findings/handler";

export const POST = createFindingsPostHandler({
  database: db,
  getSessionUserId,
});