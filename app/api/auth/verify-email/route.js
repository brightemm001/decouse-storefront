import { consumeAuthToken, verifyEmail } from "../../../../lib/db";
import { json, readJson, tooMany } from "../../../../lib/http";
import { enforceRateLimit, hashToken, sameOrigin } from "../../../../lib/security";

export const runtime = "nodejs";
export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: "This request could not be verified." }, 403);
  const limit = enforceRateLimit(request, "email_verify", 8, 3600);
  if (!limit.allowed) return tooMany(limit.retryAfter);
  let body;
  try { body = await readJson(request, 8 * 1024); } catch (error) { return json({ error: error.message }, 400); }
  if (typeof body.token !== "string" || body.token.length > 128) return json({ error: "Verification link is invalid or expired." }, 400);
  const userId = consumeAuthToken(hashToken(body.token), "email_verify");
  if (!userId) return json({ error: "Verification link is invalid or expired." }, 400);
  verifyEmail(userId);
  return json({ ok: true });
}
