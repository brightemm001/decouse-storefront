import { listAdminProducts } from "../../../../../lib/db";
import { requireAdmin } from "../../../../../lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  return Response.json({ format: "decouse-products-v1", products: listAdminProducts() }, {
    headers: { "Content-Disposition": "attachment; filename=decouse-products.json", "Cache-Control": "no-store" },
  });
}
