import { getUserByEmail, issueAuthToken } from "../../../../lib/db";
import { sendLink, mailConfigured } from "../../../../lib/mail";
import { enforceRateLimit, hashToken, normalizeEmail, randomToken, rateLimitResponse, sameOrigin, validEmail } from "../../../../lib/security";
import { json, readJson } from "../../../../lib/http";

export const runtime = "nodejs";
export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: "This request could not be verified." }, 403);
  let body;
  try { body = await readJson(request, 8 * 1024); } catch (error) { return json({ error: error.message }, 400); }
  const email = normalizeEmail(body.email);
  const limit = enforceRateLimit(request, "password_reset", 3, 3600, email);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  if (!validEmail(email)) return json({ message: "If an account exists, a reset link will be sent." });
  if (process.env.NODE_ENV === "production" && !mailConfigured()) return json({ error: "Password reset email is not configured." }, 503);
  const user = getUserByEmail(email);
  if (!user) return json({ message: "If an account exists, a reset link will be sent." });
  const token = randomToken();
  issueAuthToken(hashToken(token), user.id, "password_reset", 30);
  const url = new URL("/password-reset/confirm", request.url);
  url.searchParams.set("token", token);
  try {
    const delivery = await sendLink(email, "Reset your Decouse password", url.toString());
    return json({ message: delivery.delivered ? "If an account exists, a reset link will be sent." : "Use the local password reset link below.", ...(delivery.previewUrl ? { previewUrl: delivery.previewUrl } : {}) });
  } catch { return json({ error: "The reset email could not be sent. Try again." }, 502); }
}
