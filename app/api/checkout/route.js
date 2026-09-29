import { requireVerifiedUser, sameOrigin, enforceRateLimit } from "../../../lib/security";
import { json, readJson, tooMany } from "../../../lib/http";
import { createPreviewOrder, OrderError } from "../../../lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: "This request could not be verified." }, 403);
  if (process.env.NODE_ENV === "production") return json({ error: "Live checkout is unavailable until a payment provider and verified payment webhook are configured." }, 503);
  const auth = await requireVerifiedUser();
  if (auth.response) return auth.response;
  const limit = enforceRateLimit(request, "checkout", 8, 900, auth.user.id);
  if (!limit.allowed) return tooMany(limit.retryAfter);
  let body;
  try { body = await readJson(request, 32 * 1024); } catch (error) { return json({ error: error.message }, 400); }
  try {
    const order = createPreviewOrder(auth.user, body);
    return json({ order }, 201);
  } catch (error) {
    return json({ error: error.message || "Checkout could not be completed." }, error instanceof OrderError ? error.status : 500);
  }
}
