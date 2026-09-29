import { endSession, sameOrigin } from "../../../../lib/security";
import { json } from "../../../../lib/http";

export const runtime = "nodejs";
export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: "This request could not be verified." }, 403);
  await endSession();
  return json({ ok: true });
}
