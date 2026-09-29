import { getUserOrderByReference, getUserOrders } from "../../../lib/db";
import { currentUser, enforceRateLimit } from "../../../lib/security";
import { json, tooMany } from "../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) {
  const user = await currentUser();
  if (!user) return json({ error: "Sign in to view your orders." }, 401);
  const limit = enforceRateLimit(request, "order_lookup", 60, 60, user.id);
  if (!limit.allowed) return tooMany(limit.retryAfter);
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") || "";
  if (reference) {
    if (reference.length > 40) return json({ error: "Order reference is invalid." }, 400);
    const order = getUserOrderByReference(user.id, reference);
    return order ? json({ order }) : json({ error: "Order not found." }, 404);
  }
  return json({ orders: getUserOrders(user.id).map((order) => ({ id: order.id, reference: order.data.reference, status: order.status, paymentStatus: order.payment_status, total: order.total, createdAt: order.created_at, items: order.data.items })) });
}
