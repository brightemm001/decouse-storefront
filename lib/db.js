import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const globalForDb = globalThis;

export function getDb() {
  if (globalForDb.__decouseDatabase) return globalForDb.__decouseDatabase;
  const location = path.resolve(/*turbopackIgnore: true*/ process.env.DATABASE_PATH || path.join(process.cwd(), "data", "decouse.sqlite"));
  mkdirSync(path.dirname(location), { recursive: true });
  const db = new DatabaseSync(location, { timeout: 5000 });
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      first_name TEXT NOT NULL, last_name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer',
      email_verified_at TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS auth_tokens (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_otp_challenges (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rate_limits (
      bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL, reset_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      slug TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS coupons (
      code TEXT PRIMARY KEY COLLATE NOCASE, percent_off INTEGER NOT NULL,
      expires_at TEXT NOT NULL, usage_limit INTEGER NOT NULL, used_count INTEGER NOT NULL DEFAULT 0,
      min_subtotal INTEGER NOT NULL DEFAULT 0, allowed_products TEXT NOT NULL DEFAULT '[]',
      allowed_categories TEXT NOT NULL DEFAULT '[]', one_per_user INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS coupon_redemptions (
      coupon_code TEXT NOT NULL REFERENCES coupons(code), user_id TEXT NOT NULL REFERENCES users(id),
      order_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(coupon_code, user_id)
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL, payment_status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT NOT NULL, subtotal INTEGER NOT NULL, discount INTEGER NOT NULL,
      delivery INTEGER NOT NULL, total INTEGER NOT NULL, data TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS orders_user_created ON orders(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS orders_status_created ON orders(status, created_at DESC);
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY, product_slug TEXT NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), comment TEXT NOT NULL,
      created_at TEXT NOT NULL, UNIQUE(product_slug, user_id, order_id)
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  globalForDb.__decouseDatabase = db;
  return db;
}

const json = (value) => JSON.stringify(value);
const decode = (value) => JSON.parse(value);

export function listProducts() {
  const db = getDb();
  return db.prepare(`SELECT p.payload, r.avg_rating, r.review_count
    FROM products p LEFT JOIN (
      SELECT product_slug, AVG(rating) avg_rating, COUNT(*) review_count FROM reviews GROUP BY product_slug
    ) r ON r.product_slug = p.slug ORDER BY p.created_at DESC`).all()
    .map((row) => ({ ...decode(row.payload), rating: row.avg_rating == null ? null : Number(Number(row.avg_rating).toFixed(1)), reviews: row.review_count || 0 }));
}

export function getProduct(slug) {
  const row = getDb().prepare("SELECT payload FROM products WHERE slug = ?").get(slug);
  if (!row) return null;
  const product = decode(row.payload);
  const review = getDb().prepare("SELECT AVG(rating) AS avg_rating, COUNT(*) AS review_count FROM reviews WHERE product_slug = ?").get(slug);
  return { ...product, rating: review.avg_rating == null ? null : Number(Number(review.avg_rating).toFixed(1)), reviews: review.review_count || 0 };
}

export function saveProduct(product) {
  const now = new Date().toISOString();
  getDb().prepare(`INSERT INTO products(slug,payload,created_at,updated_at) VALUES(?,?,?,?)
    ON CONFLICT(slug) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at`)
    .run(product.slug, json(product), now, now);
  return product;
}

export function deleteProduct(slug) {
  return getDb().prepare("DELETE FROM products WHERE slug = ?").run(slug).changes > 0;
}

export function getUserByEmail(email) {
  return getDb().prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").get(email) || null;
}

export function getUserById(id) {
  return getDb().prepare("SELECT id,email,first_name,last_name,role,email_verified_at,created_at FROM users WHERE id = ?").get(id) || null;
}

export function createUser(user) {
  getDb().prepare("INSERT INTO users(id,email,first_name,last_name,password_hash,role,created_at) VALUES(?,?,?,?,?,?,?)")
    .run(user.id, user.email, user.firstName, user.lastName, user.passwordHash, user.role, new Date().toISOString());
}

export function issueAuthToken(tokenHash, userId, purpose, minutes = 30) {
  const now = new Date();
  const expires = new Date(now.getTime() + minutes * 60_000).toISOString();
  getDb().prepare("INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at,created_at) VALUES(?,?,?,?,?)")
    .run(tokenHash, userId, purpose, expires, now.toISOString());
  return expires;
}

export function consumeAuthToken(tokenHash, purpose) {
  const db = getDb();
  const row = db.prepare("SELECT user_id,expires_at FROM auth_tokens WHERE token_hash = ? AND purpose = ?").get(tokenHash, purpose);
  if (!row || row.expires_at <= new Date().toISOString()) {
    db.prepare("DELETE FROM auth_tokens WHERE token_hash = ?").run(tokenHash);
    return null;
  }
  db.prepare("DELETE FROM auth_tokens WHERE token_hash = ?").run(tokenHash);
  return row.user_id;
}

export function createSession(tokenHash, userId, days = 7) {
  const now = new Date();
  const expires = new Date(now.getTime() + days * 86_400_000).toISOString();
  getDb().prepare("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)")
    .run(tokenHash, userId, expires, now.toISOString());
  return expires;
}

export function findSession(tokenHash) {
  const row = getDb().prepare(`SELECT u.id,u.email,u.first_name,u.last_name,u.role,u.email_verified_at,s.expires_at
    FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`).get(tokenHash);
  if (!row || row.expires_at <= new Date().toISOString()) {
    if (row) getDb().prepare("DELETE FROM sessions WHERE token_hash=?").run(tokenHash);
    return null;
  }
  return row;
}

export function deleteSession(tokenHash) {
  getDb().prepare("DELETE FROM sessions WHERE token_hash=?").run(tokenHash);
}

export function updatePassword(userId, passwordHash) {
  getDb().prepare("UPDATE users SET password_hash=? WHERE id=?").run(passwordHash, userId);
  getDb().prepare("DELETE FROM sessions WHERE user_id=?").run(userId);
}

export function verifyEmail(userId) {
  getDb().prepare("UPDATE users SET email_verified_at=? WHERE id=?").run(new Date().toISOString(), userId);
}

export function checkRateLimit(bucket, limit, windowSeconds) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const resetAt = now + windowSeconds;
  db.prepare(`INSERT INTO rate_limits(bucket,hits,reset_at) VALUES(?,1,?)
    ON CONFLICT(bucket) DO UPDATE SET hits=CASE WHEN reset_at<=? THEN 1 ELSE hits+1 END,
    reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END`).run(bucket, resetAt, now, now);
  const row = db.prepare("SELECT hits,reset_at FROM rate_limits WHERE bucket=?").get(bucket);
  return { allowed: row.hits <= limit, retryAfter: Math.max(1, row.reset_at - now) };
}

export function createOtpChallenge(tokenHash, userId) {
  const db = getDb();
  const now = new Date();
  db.prepare("INSERT INTO admin_otp_challenges(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)")
    .run(tokenHash, userId, new Date(now.getTime() + 5 * 60_000).toISOString(), now.toISOString());
}

export function consumeOtpChallenge(tokenHash) {
  const db = getDb();
  const row = db.prepare("SELECT user_id,expires_at FROM admin_otp_challenges WHERE token_hash=?").get(tokenHash);
  if (!row || row.expires_at <= new Date().toISOString()) {
    db.prepare("DELETE FROM admin_otp_challenges WHERE token_hash=?").run(tokenHash);
    return null;
  }
  db.prepare("DELETE FROM admin_otp_challenges WHERE token_hash=?").run(tokenHash);
  return row.user_id;
}

export function peekOtpChallenge(tokenHash) {
  const row = getDb().prepare("SELECT user_id,expires_at FROM admin_otp_challenges WHERE token_hash=?").get(tokenHash);
  return row && row.expires_at > new Date().toISOString() ? row.user_id : null;
}

export function getCoupon(code) {
  return getDb().prepare("SELECT * FROM coupons WHERE code=? COLLATE NOCASE").get(code) || null;
}

export function saveCoupon(coupon) {
  getDb().prepare(`INSERT INTO coupons(code,percent_off,expires_at,usage_limit,min_subtotal,allowed_products,allowed_categories,one_per_user,active)
    VALUES(?,?,?,?,?,?,?,?,1) ON CONFLICT(code) DO UPDATE SET percent_off=excluded.percent_off,
    expires_at=excluded.expires_at,usage_limit=excluded.usage_limit,min_subtotal=excluded.min_subtotal,
    allowed_products=excluded.allowed_products,allowed_categories=excluded.allowed_categories,
    one_per_user=excluded.one_per_user,active=1`).run(coupon.code, coupon.percentOff, coupon.expiresAt,
    coupon.usageLimit, coupon.minSubtotal, json(coupon.allowedProducts), json(coupon.allowedCategories), coupon.onePerUser ? 1 : 0);
}

export function listCoupons() {
  return getDb().prepare("SELECT code,percent_off,expires_at,usage_limit,used_count,min_subtotal,allowed_products,allowed_categories,one_per_user,active FROM coupons ORDER BY code")
    .all().map((row) => ({ ...row, allowed_products: decode(row.allowed_products), allowed_categories: decode(row.allowed_categories) }));
}

export function recordCouponRedemption(db, code, userId, orderId) {
  db.prepare("UPDATE coupons SET used_count=used_count+1 WHERE code=?").run(code);
  db.prepare("INSERT INTO coupon_redemptions(coupon_code,user_id,order_id,created_at) VALUES(?,?,?,?)")
    .run(code, userId, orderId, new Date().toISOString());
}

export function createOrder(db, order) {
  db.prepare(`INSERT INTO orders(id,user_id,status,payment_status,payment_method,subtotal,discount,delivery,total,data,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(order.id, order.userId, order.status, order.paymentStatus, order.paymentMethod,
    order.subtotal, order.discount, order.delivery, order.total, json(order.data), order.createdAt, order.createdAt);
}

export function getUserOrders(userId) {
  return getDb().prepare("SELECT id,status,payment_status,payment_method,subtotal,discount,delivery,total,data,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC").all(userId)
    .map((row) => ({ ...row, data: decode(row.data) }));
}

export function getUserOrderByReference(userId, reference) {
  const rows = getDb().prepare("SELECT id,user_id,status,payment_status,payment_method,subtotal,discount,delivery,total,data,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 200").all(userId);
  const row = rows.find((entry) => decode(entry.data).reference?.toLowerCase() === reference.toLowerCase());
  return row ? { ...row, data: decode(row.data) } : null;
}

export function getOrderForUser(id, userId) {
  const row = getDb().prepare("SELECT id,user_id,status,payment_status,payment_method,subtotal,discount,delivery,total,data,created_at FROM orders WHERE id=? AND user_id=?").get(id, userId);
  return row ? { ...row, data: decode(row.data) } : null;
}

export function getOrderById(id) {
  const row = getDb().prepare("SELECT id,user_id,status,payment_status,payment_method,subtotal,discount,delivery,total,data,created_at FROM orders WHERE id=?").get(id);
  return row ? { ...row, data: decode(row.data) } : null;
}

export function updateOrderStatus(id, status) {
  getDb().prepare("UPDATE orders SET status=?,updated_at=? WHERE id=?").run(status, new Date().toISOString(), id);
}

export function listAdminProducts() {
  return getDb().prepare("SELECT payload FROM products ORDER BY updated_at DESC").all().map((row) => decode(row.payload));
}

export function getReviewSourceOrder(userId, orderId, slug) {
  const row = getDb().prepare("SELECT status,payment_status,data FROM orders WHERE id=? AND user_id=?").get(orderId, userId);
  if (!row || !["shipped", "delivered"].includes(row.status) || row.payment_status !== "paid") return null;
  const order = decode(row.data);
  return (order.items || []).some((item) => item.slug === slug) ? row.status : null;
}

export function hasReview(userId, orderId, slug) {
  return Boolean(getDb().prepare("SELECT 1 FROM reviews WHERE user_id=? AND order_id=? AND product_slug=?").get(userId, orderId, slug));
}

export function getUserOrdersWithReviews(userId) {
  const rows = getDb().prepare("SELECT id,status,data,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC").all(userId);
  return rows.map((row) => {
    const data = decode(row.data);
    return { id: row.id, status: row.status, created_at: row.created_at, items: data.items || [] };
  });
}

export function getAdminOrders(status = "all") {
  const allowed = ["new", "cancelled", "processing", "shipped", "delivered", "all"];
  const condition = allowed.includes(status) && status !== "all" ? "WHERE o.status=?" : "";
  const rows = getDb().prepare(`SELECT o.id,o.user_id,o.status,o.payment_status,o.payment_method,o.total,o.created_at,o.data,u.email,u.first_name,u.last_name FROM orders o JOIN users u ON u.id=o.user_id ${condition} ORDER BY o.created_at DESC LIMIT 200`)
    .all(...(condition ? [status] : []));
  return rows.map((row) => ({ ...row, data: decode(row.data) }));
}

export function getAdminSummary() {
  const db = getDb();
  const row = db.prepare(`SELECT
    (SELECT COUNT(*) FROM users) users,
    (SELECT COUNT(*) FROM products) products,
    (SELECT COUNT(*) FROM orders WHERE status='new') new_orders,
    (SELECT COUNT(*) FROM orders WHERE status='cancelled') cancelled_orders`).get();
  const inventory = listProducts().reduce((sum, product) => sum + (product.variants || []).reduce((v, color) => v + (color.sizes || []).reduce((s, size) => s + (Number(size.stock) || 0), 0), 0), 0);
  return { ...row, units_in_stock: inventory };
}

export function createReview(db, review) {
  db.prepare("INSERT INTO reviews(id,product_slug,user_id,order_id,rating,comment,created_at) VALUES(?,?,?,?,?,?,?)")
    .run(review.id, review.slug, review.userId, review.orderId, review.rating, review.comment, new Date().toISOString());
}

export function listReviews(slug) {
  return getDb().prepare(`SELECT r.rating,r.comment,r.created_at,u.first_name FROM reviews r JOIN users u ON u.id=r.user_id
    WHERE r.product_slug=? ORDER BY r.created_at DESC LIMIT 100`).all(slug).map((review) => ({ ...review }));
}
