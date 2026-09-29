import { randomToken } from "node:crypto";
import { createOtpChallenge, getUserByEmail } from "../../../../lib/db";
import { json, readJson } from "../../../../lib/http";
import { currentUser, enforceRateLimit, hashToken, rateLimitResponse, sameOrigin, startSession, verifyPassword } from "../../../../lib/security";

export const runtime = "nodejs";

export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: "This request could not be verified." }, 403);
  let body;
  try { body = await readJson(request, 16 * 1024); } catch (error) { return json({ error: error.message }, 400); }
  const email = String(body.email || "").trim().toLowerCase();
  const limit = enforceRateLimit(request, "login", 5, 900, email);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  const user = getUserByEmail(email);
  const valid = user && await verifyPassword(String(body.password || ""), user.password_hash);
  if (!valid) return json({ error: "Email or password is incorrect." }, 401);
  if (!user.email_verified_at) return json({ error: "Verify your email before signing in." }, 403);
  if (user.role === "admin" && process.env.ADMIN_TOTP_SECRET) {
    const challenge = randomToken();
    createOtpChallenge(hashToken(challenge), user.id);
    return json({ requiresOtp: true, challengeToken: challenge });
  }
  await startSession(user.id);
  return json({ user: await currentUser() });
}
