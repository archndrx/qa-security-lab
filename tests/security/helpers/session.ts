import { createSession } from "../../../src/lib/auth";

// Signs a session directly (SESSION_SECRET must match the running server)
// so tests do not consume the per-email login rate limit.
export function sessionHeaders(userId: string) {
  return { Cookie: `qa_session=${createSession(userId)}` };
}
