import { currentUser } from "../../../../lib/security";
import { json } from "../../../../lib/http";

export const runtime = "nodejs";
export async function GET() { return json({ user: await currentUser() }); }
