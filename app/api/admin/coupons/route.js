import { listCoupons, saveCoupon } from "../../../../lib/db";
import { json, readJson, tooMany } from "../../../../lib/http";
import { enforceRateLimit, requireAdmin, sameOrigin } from "../../../../lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const limit = enforceRateLimit(request, "admin_coupon_write", 30, 3600, auth.user.id);
  if (!limit.allowed) return tooMany(limit.retryAfter);
  return json({ coupons: listCoupons() });
}
export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: "This request could not be verified." }, 403);
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  let body;
  try { body = await readJson(request, 16 * 1024); } catch (error) { return json({ error: error.message }, 400); }
  const code = String(body.code || "").trim().toUpperCase();
  const percentOff = Number(body.percentOff);
  const usageLimit = Number(body.usageLimit);
  const minSubtotal = Number(body.minSubtotal || 0);
  const expiresAt = String(body.expiresAt || "");
  const allowedProducts = Array.isArray(body.allowedProducts) ? body.allowedProducts.map(String) : [];
  const allowedCategories = Array.isArray(body.allowedCategories) ? body.allowedCategories.map(String) : [];
  if (!/^[A-Z0-9_-]{3,32}$/.test(code) || !Number.isInteger(percentOff) || percentOff < 1 || percentOff > 90 || !Number.isInteger(usageLimit) || usageLimit < 1 || usageLimit > 100000 || !Number.isSafeInteger(minSubtotal) || minSubtotal < 0 || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now() || allowedProducts.length > 500 || allowedCategories.some((item) => !["Women", "Men", "Kids", "Accessories"].includes(item))) return json({ error: "Check the coupon code, discount, expiry, limits and allowed products/categories." }, 400);
  saveCoupon({ code, percentOff, expiresAt: new Date(expiresAt).toISOString(), usageLimit, minSubtotal, allowedProducts, allowedCategories, onePerUser: body.onePerUser !== false });
  return json({ ok: true }, 201);
}
