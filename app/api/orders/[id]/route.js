import { getOrderForUser, getDb } from "../../../../lib/db";
import { cancelUnpaidOrder } from "../../../../lib/order-admin";
import { currentUser, enforceRateLimit, sameOrigin } from "../../../../lib/security";
import { json, tooMany } from "../../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request, { params }) {
  const user = await currentUser();
  if (!user) return json({ error: "Sign in to view this order." }, 401);
  const limit = enforceRateLimit(request, "order_lookup", 60, 60, user.id);
  if (!limit.allowed) return tooMany(limit.retryAfter);
  const { id } = await params;
  const order = getOrderForUser(id, user.id);
  if (!order && user.role === "admin") {
    const adminOrder = getDb().prepare("SELECT id,user_id,status,payment_status,payment_method,subtotal,discount,delivery,total,data,created_at FROM orders WHERE id=?").get(id);
    if (adminOrder) return json({ order: { ...adminOrder, data: JSON.parse(adminOrder.data) } });
  }
  if (!order) return json({ error: "Order not found." }, 404);
  return json({ order });
}

export async function POST(request, { params }) {
  if (!sameOrigin(request)) return json({ error: "This request could not be verified." }, 403);
  const user = await currentUser();
  if (!user) return json({ error: "Sign in to continue." }, 401);
  const limit = enforceRateLimit(request, "order_cancel", 5, 3600, user.id);
  if (!limit.allowed) return tooMany(limit.retryAfter);
  const { id } = await params;
  const db = getDb();
  const order = getOrderForUser(id, user.id);
  if (!order) return json({ error: "Order not found." }, 404);
  if (order.status === "cancelled") return json({ order, message: "This order is already cancelled." });
  db.exec("BEGIN IMMEDIATE");
  try {
    cancelUnpaidOrder(db, order);
    db.exec("COMMIT");
    return json({ ok: true });
  } catch (error) {
    db.exec("ROLLBACK");
    return json({ error: error.message || "The order could not be cancelled." }, error.message?.includes("refund") ? 409 : 500);
  }
}
