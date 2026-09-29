import { getAdminSummary } from "../../../../lib/db";
import { json } from "../../../../lib/http";
import { requireAdmin } from "../../../../lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  return json({ summary: getAdminSummary() });
}
