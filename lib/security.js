import "server-only";
import { promisify } from "node:util";
import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { checkRateLimit, createSession, findSession } from "./db";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "decouse_session";
const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function hashToken(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken() {
  return randomBytes(32).toString("base64url");
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const workFactor = 32768;
  const derived = await scrypt(password, salt, 64, { N: workFactor, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${workFactor}$8$1$${salt.toString("hex")}$${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [algorithm, nText, rText, pText, saltHex, expectedHex] = stored.split("$");
    if (algorithm !== "scrypt" || Number(nText) !== 32768 || Number(rText) !== 8 || Number(pText) !== 1 || !/^[0-9a-f]{32}$/.test(saltHex) || !/^[0-9a-f]{128}$/.test(expectedHex)) return false;
    const expected = Buffer.from(expectedHex, "hex");
    const actual = Buffer.from(await scrypt(password, Buffer.from(saltHex, "hex"), expected.length, {
      N: Number(nText), r: Number(rText), p: Number(pText), maxmem: 64 * 1024 * 1024,
    }));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function remoteIp(request) {
  const value = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export function enforceRateLimit(request, action, limit, seconds, identity = "") {
  const ip = remoteIp(request);
  const targets = [`${action}:ip:${ip}`];
  if (identity) targets.push(`${action}:id:${hashToken(normalizeEmail(identity)).slice(0, 32)}`);
  let retryAfter = 1;
  let blocked = false;
  for (const bucket of targets) {
    const result = checkRateLimit(bucket, limit, seconds);
    if (!result.allowed) { blocked = true; retryAfter = Math.max(retryAfter, result.retryAfter); }
  }
  return { allowed: !blocked, retryAfter, blocked };
}

export function rateLimitResponse(retryAfter) {
  return Response.json({ error: "Too many attempts. Please wait and try again." }, {
    status: 429,
    headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" },
  });
}

export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

export async function currentSession() {
  const jar = await cookies();
  const value = jar.get(SESSION_COOKIE)?.value;
  if (!value || value.length > 128) return null;
  return findSession(hashToken(value));
}

export async function currentUser() {
  const session = await currentSession();
  if (!session) return null;
  return {
    id: session.id, email: session.email, firstName: session.first_name, lastName: session.last_name,
    role: session.role, emailVerified: Boolean(session.email_verified_at),
  };
}

export async function requireVerifiedUser() {
  const user = await currentUser();
  if (!user) return { user: null, response: Response.json({ error: "Sign in to continue." }, { status: 401 }) };
  if (!user.emailVerified) return { user: null, response: Response.json({ error: "Verify your email before continuing." }, { status: 403 }) };
  return { user, response: null };
}

export async function requireAdmin() {
  const { user, response } = await requireVerifiedUser();
  if (response) return { user: null, response };
  if (user.role !== "admin") return { user: null, response: Response.json({ error: "Administrator access is required." }, { status: 403 }) };
  return { user, response: null };
}

export async function startSession(userId) {
  const token = randomToken();
  const expires = createSession(hashToken(token), userId, 7);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/",
    expires: new Date(expires),
  });
}

export async function endSession() {
  const jar = await cookies();
  const value = jar.get(SESSION_COOKIE)?.value;
  if (value) {
    const { deleteSession } = await import("./db");
    deleteSession(hashToken(value));
  }
  jar.delete(SESSION_COOKIE);
}

function decodeBase32(secret) {
  const clean = secret.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = "";
  for (const char of clean) {
    const value = base32Alphabet.indexOf(char);
    if (value < 0) throw new Error("Invalid base32 secret.");
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) bytes.push(parseInt(bits.slice(offset, offset + 8), 2));
  return Buffer.from(bytes);
}

export function verifyTotp(secret, code) {
  if (!/^\d{6}$/.test(String(code || ""))) return false;
  const key = decodeBase32(secret);
  const step = Math.floor(Date.now() / 30_000);
  for (const counter of [step - 1, step, step + 1]) {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter));
    const digest = createHmac("sha1", key).update(buffer).digest();
    const offset = digest.at(-1) & 0x0f;
    const binary = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
    const expected = String(binary % 1_000_000).padStart(6, "0");
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(String(code)))) return true;
  }
  return false;
}
