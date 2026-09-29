import { randomUUID } from "node:crypto";
import { createReview, getReviewSourceOrder, getProduct, hasReview, listReviews, getDb } from "../../../../../lib/db";
import { enforceRateLimit, requireVerifiedUser, sameOrigin } from "../../../../../lib/security";
import { json, readJson, tooMany } from "../../../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request, { params }) {
  const { slug } = await params;
  if (!getProduct(slug)) return json({ error: "Product not found." }, 404);
  return json({ reviews: listReviews(slug) });
}

export async function POST(request, { params }) {
  if (!sameOrigin(request)) return json({ error: "This request could not be verified." }, 403);
  const auth = await requireVerifiedUser();
  if (auth.response) return auth.response;
  const limit = enforceRateLimit(request, "review", 3, 3600, auth.user.id);
  if (!limit.allowed) return tooMany(limit.retryAfter);
  let body;
  try { body = await readJson(request, 8 * 1024); } catch (error) { return json({ error: error.message }, 400); }
  const { slug } = await params;
  if (!getProduct(slug)) return json({ error: "Product not found." }, 404);
  const orderId = String(body.orderId || "");
  const rating = Number(body.rating);
  const comment = String(body.comment || "").trim();
  if (orderId.length > 80 || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 10 || comment.length > 1000) return json({ error: "Choose a 1–5 rating and enter 10–1,000 characters." }, 400);
  if (!getReviewSourceOrder(auth.user.id, orderId, slug)) return json({ error: "Reviews are available only for a product on your shipped or delivered order." }, 403);
  if (hasReview(auth.user.id, orderId, slug)) return json({ error: "You have already reviewed this product for that order." }, 409);
  try {
    createReview(getDb(), { id: randomUUID(), slug, userId: auth.user.id, orderId, rating, comment });
    return json({ ok: true }, 201);
  } catch { return json({ error: "The review could not be saved." }, 409); }
}
