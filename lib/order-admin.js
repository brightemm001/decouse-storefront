import { updateOrderStatus } from "./db";

export function cancelUnpaidOrder(db, order) {
  if (order.payment_status === "paid") throw new Error("A paid order requires a provider refund before cancellation.");
  if (order.status === "cancelled") return;
  for (const item of order.data.items || []) {
    const row = db.prepare("SELECT payload FROM products WHERE slug=?").get(item.slug);
    if (!row) continue;
    const product = JSON.parse(row.payload);
    const variant = product.variants.find((entry) => entry.color === item.color);
    const size = variant?.sizes.find((entry) => entry.size === item.size);
    if (size) size.stock = Math.min(1_000_000, size.stock + item.quantity);
    db.prepare("UPDATE products SET payload=?,updated_at=? WHERE slug=?").run(JSON.stringify(product), new Date().toISOString(), item.slug);
  }
  if (order.data.couponCode) {
    const removal = db.prepare("DELETE FROM coupon_redemptions WHERE coupon_code=? AND user_id=? AND order_id=?").run(order.data.couponCode, order.user_id, order.id);
    if (removal.changes) db.prepare("UPDATE coupons SET used_count=MAX(0,used_count-1) WHERE code=?").run(order.data.couponCode);
  }
  updateOrderStatus(order.id, "cancelled");
}
