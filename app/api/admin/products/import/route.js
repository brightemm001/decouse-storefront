import { getDb, listAdminProducts, saveProduct } from "../../../../../lib/db";
import { normalizeProduct } from "../../../../../lib/catalog";
import { json, readJson } from "../../../../../lib/http";
import { enforceRateLimit, requireAdmin, sameOrigin } from "../../../../../lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: "This request could not be verified." }, 403);
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const limit = enforceRateLimit(request, "admin_product_import", 8, 3600, auth.user.id);
  if (!limit.allowed) return json({ error: "Too many catalogue imports. Try again later." }, 429, { "Retry-After": String(limit.retryAfter) });
  let body;
  try { body = await readJson(request, 5 * 1024 * 1024); } catch (error) { return json({ error: error.message }, 400); }
  const rows = Array.isArray(body) ? body : body?.format === "decouse-products-v1" ? body.products : null;
  const replace = body?.replace === true;
  if (!Array.isArray(rows) || rows.length > 500) return json({ error: "Upload a decouse-products-v1 JSON file containing up to 500 products." }, 400);
  let products;
  try { products = rows.map(normalizeProduct); }
  catch (error) { return json({ error: error.message }, 400); }
  if (new Set(products.map((item) => item.slug)).size !== products.length) return json({ error: "Product slugs must be unique in the upload." }, 400);
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    if (replace) db.exec("DELETE FROM products");
    for (const product of products) saveProduct(product);
    db.exec("COMMIT");
    return json({ imported: products.length, replaced: replace, products: listAdminProducts() });
  } catch { db.exec("ROLLBACK"); return json({ error: "The catalogue could not be imported." }, 500); }
}
