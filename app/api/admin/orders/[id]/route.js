import { getDb, getOrderById, updateOrderStatus } from "../../../../../lib/db";
import { cancelUnpaidOrder } from "../../../../../lib/order-admin";
import { json, readJson, tooMany } from "../../../../../lib/http";
import { enforceRateLimit, requireAdmin, sameOrigin } from "../../../../../lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const statuses = new Set(["processing", "shipped", "delivered", "cancelled"]);
export async function PATCH(request, { params }) {
  if (!sameOrigin(request)) return json({ error: "This request could not be verified." }, 403);
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const limit = enforceRateLimit(request, "admin_order_update", 100, 3600, auth.user.id);
  if (!limit.allowed) return tooMany(limit.retryAfter);
  let body;
  try { body = await readJson(request, 8 * 1024); } catch (error) { return json({ error: error.message }, 400); }
  const status = String(body.status || "");
  if (!statuses.has(status)) return json({ error: "Choose a valid order status." }, 400);
  const { id } = await params;
  const db = getDb();
  const order = getOrderById(id);
  if (!order) return json({ error: "Order not found." }, 404);
  if (order.status === "cancelled") return json({ error: "Cancelled orders cannot be reopened." }, 409);
  if (order.payment_status !== "paid" && status !== "cancelled") return json({ error: "An unpaid order cannot move into fulfilment. Confirm payment with the provider first." }, 409);
  db.exec("BEGIN IMMEDIATE");
  try {
    if (status === "cancelled") cancelUnpaidOrder(db, order);
    else updateOrderStatus(id, status);
    db.exec("COMMIT");
    return json({ ok: true, status });
  } catch (error) {
    db.exec("ROLLBACK");
    return json({ error: error.message || "Order status could not be updated." }, error.message?.includes("refund") ? 409 : 500);
  }
}
