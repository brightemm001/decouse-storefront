import { randomUUID } from "node:crypto";
import { createUser, getUserByEmail, issueAuthToken } from "../../../../lib/db";
import { sendLink, mailConfigured } from "../../../../lib/mail";
import { hashPassword, hashToken, normalizeEmail, randomToken, validEmail, enforceRateLimit, rateLimitResponse, sameOrigin } from "../../../../lib/security";
import { json, readJson } from "../../../../lib/http";

export const runtime = "nodejs";

export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: "This request could not be verified." }, 403);
  let body;
  try { body = await readJson(request, 16 * 1024); } catch (error) { return json({ error: error.message }, 400); }
  const email = normalizeEmail(body.email);
  const limit = enforceRateLimit(request, "signup", 5, 3600, email);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  const firstName = String(body.firstName || "").trim();
  const lastName = String(body.lastName || "").trim();
  const password = String(body.password || "");
  if (body.termsAccepted !== true) return json({ error: "Accept the Terms and Privacy policy to create an account." }, 400);
  if (!validEmail(email) || firstName.length < 1 || firstName.length > 80 || lastName.length > 80 || password.length < 12 || password.length > 128) {
    return json({ error: "Enter a valid email, name and password of 12–128 characters." }, 400);
  }
  if (process.env.NODE_ENV === "production" && !mailConfigured()) return json({ error: "Email verification is not configured on this store yet." }, 503);
  let user = getUserByEmail(email);
  if (user?.email_verified_at) return json({ message: "If the address can be registered, a verification link will be sent." }, 202);
  if (!user) {
    const role = normalizeEmail(process.env.ADMIN_EMAIL) === email ? "admin" : "customer";
    try {
      createUser({ id: randomUUID(), email, firstName, lastName, passwordHash: await hashPassword(password), role });
    } catch { return json({ error: "The account could not be created. Try again." }, 409); }
    user = getUserByEmail(email);
  }
  const token = randomToken();
  issueAuthToken(hashToken(token), user.id, "email_verify", 60);
  const url = new URL("/verify-email", request.url);
  url.searchParams.set("token", token);
  try {
    const delivery = await sendLink(email, "Verify your Decouse account", url.toString());
    return json({ message: delivery.delivered ? "Check your email for the verification link." : "Account created. Use the local verification link below.", ...(delivery.previewUrl ? { previewUrl: delivery.previewUrl } : {}) }, 201);
  } catch {
    return json({ error: "The verification email could not be sent. Please try again." }, 502);
  }
}
