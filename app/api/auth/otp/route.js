import { consumeOtpChallenge, peekOtpChallenge } from "../../../../lib/db";
import { json, readJson } from "../../../../lib/http";
import { currentUser, enforceRateLimit, hashToken, rateLimitResponse, sameOrigin, startSession, verifyTotp } from "../../../../lib/security";

export const runtime = "nodejs";

export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: "This request could not be verified." }, 403);
  const limit = enforceRateLimit(request, "otp", 5, 900);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  let body;
  try { body = await readJson(request, 8 * 1024); } catch (error) { return json({ error: error.message }, 400); }
  if (!process.env.ADMIN_TOTP_SECRET || typeof body.challengeToken !== "string") return json({ error: "The one-time code is invalid or expired." }, 401);
  const tokenHash = hashToken(body.challengeToken);
  const userId = peekOtpChallenge(tokenHash);
  if (!userId || !verifyTotp(process.env.ADMIN_TOTP_SECRET, body.code)) return json({ error: "The one-time code is invalid or expired." }, 401);
  consumeOtpChallenge(tokenHash);
  await startSession(userId);
  return json({ user: await currentUser() });
}
