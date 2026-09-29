import { listAdminProducts, saveProduct } from "../../../../lib/db";
import { normalizeProduct } from "../../../../lib/catalog";
import { json, readJson } from "../../../../lib/http";
import { enforceRateLimit, requireAdmin, sameOrigin } from "../../../../lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  return json({ products: listAdminProducts() });
}
export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: "This request could not be verified." }, 403);
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const limit = enforceRateLimit(request, "admin_product_write", 60, 3600, auth.user.id);
  if (!limit.allowed) return json({ error: "Too many product updates. Try again later." }, 429, { "Retry-After": String(limit.retryAfter) });
  let body;
  try { body = await readJson(request, 64 * 1024); } catch (error) { return json({ error: error.message }, 400); }
  try { return json({ product: saveProduct(normalizeProduct(body)) }, 201); }
  catch (error) { return json({ error: error.message || "Product data is invalid." }, 400); }
}
