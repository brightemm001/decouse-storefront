export function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function readBodyBytes(request, limit) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > limit) throw new Error("Request body is too large.");
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(() => {});
        throw new Error("Request body is too large.");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

export async function readJson(request, limit = 32 * 1024) {
  const bytes = await readBodyBytes(request, limit);
  const text = bytes.toString("utf8");
  try { return JSON.parse(text); } catch { throw new Error("Send valid JSON."); }
}

export function tooMany(retryAfter) {
  return json({ error: "Too many attempts. Please wait and try again." }, 429, { "Retry-After": String(retryAfter) });
}

export function rejectedOrigin(request) {
  return json({ error: "This request could not be verified." }, 403);
}
