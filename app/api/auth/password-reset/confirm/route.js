import { consumeAuthToken, updatePassword } from "../../../../../lib/db";
import { hashPassword, hashToken, enforceRateLimit, sameOrigin } from "../../../../../lib/security";
import { json, readJson, tooMany } from "../../../../../lib/http";

export const runtime = "nodejs";
export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: "This request could not be verified." }, 403);
  const limit = enforceRateLimit(request, "password_reset_confirm", 5, 900);
  if (!limit.allowed) return tooMany(limit.retryAfter);
  let body;
  try { body = await readJson(request, 16 * 1024); } catch (error) { return json({ error: error.message }, 400); }
  if (typeof body.token !== "string" || body.token.length > 128 || typeof body.password !== "string" || body.password.length < 12 || body.password.length > 128) return json({ error: "Use a valid reset link and a password of 12–128 characters." }, 400);
  const userId = consumeAuthToken(hashToken(body.token), "password_reset");
  if (!userId) return json({ error: "The reset link is invalid or expired." }, 400);
  updatePassword(userId, await hashPassword(body.password));
  return json({ ok: true });
}
