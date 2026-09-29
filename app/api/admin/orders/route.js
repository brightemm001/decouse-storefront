import { getAdminOrders } from "../../../../lib/db";
import { json } from "../../../../lib/http";
import { requireAdmin } from "../../../../lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const status = new URL(request.url).searchParams.get("status") || "all";
  if (!["all", "new", "cancelled", "processing", "shipped", "delivered"].includes(status)) return json({ error: "Invalid order status filter." }, 400);
  return json({ orders: getAdminOrders(status) });
}
