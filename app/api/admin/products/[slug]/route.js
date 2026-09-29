import { deleteProduct, getProduct, saveProduct } from "../../../../../lib/db";
import { normalizeProduct } from "../../../../../lib/catalog";
import { json, readJson, tooMany } from "../../../../../lib/http";
import { enforceRateLimit, requireAdmin, sameOrigin } from "../../../../../lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function PUT(request, { params }) {
  if (!sameOrigin(request)) return json({ error: "This request could not be verified." }, 403);
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const limit = enforceRateLimit(request, "admin_product_write", 60, 3600, auth.user.id);
  if (!limit.allowed) return tooMany(limit.retryAfter);
  const { slug } = await params;
  if (!getProduct(slug)) return json({ error: "Product not found." }, 404);
  let body;
  try { body = await readJson(request, 64 * 1024); } catch (error) { return json({ error: error.message }, 400); }
  try {
    const product = normalizeProduct(body);
    if (product.slug !== slug) return json({ error: "Product slug cannot be changed by this request." }, 400);
    saveProduct(product);
    return json({ product });
  } catch (error) { return json({ error: error.message || "Product data is invalid." }, 400); }
}
export async function DELETE(request, { params }) {
  if (!sameOrigin(request)) return json({ error: "This request could not be verified." }, 403);
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const limit = enforceRateLimit(request, "admin_product_write", 60, 3600, auth.user.id);
  if (!limit.allowed) return tooMany(limit.retryAfter);
  const { slug } = await params;
  return deleteProduct(slug) ? json({ ok: true }) : json({ error: "Product not found." }, 404);
}
