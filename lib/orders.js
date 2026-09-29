import { randomUUID } from "node:crypto";
import { getDb, recordCouponRedemption, createOrder } from "./db";

export class OrderError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function createPreviewOrder(user, input) {
  const db = getDb();
  if (!input || input.paymentMethod !== "preview") throw new OrderError("Live payment methods are unavailable until a payment provider is configured.", 503);
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 40) throw new OrderError("Your bag needs between 1 and 40 items.");
  const phone = String(input.customer?.phone || "").trim();
  const address = String(input.customer?.address || "").trim();
  const city = String(input.customer?.city || "").trim();
  const state = String(input.customer?.state || "").trim();
  const postcode = String(input.customer?.postcode || "").trim();
  const validStates = new Set(["Abia","Abuja FCT","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"]);
  if (!/^\+?[0-9 ()-]{7,24}$/.test(phone) || address.length < 5 || address.length > 180 || city.length < 2 || city.length > 80 || !validStates.has(state) || postcode.length > 24) throw new OrderError("Enter a valid phone number and delivery address.");
  const requested = new Map();
  for (const entry of input.items) {
    const slug = String(entry?.slug || "");
    const color = String(entry?.color || "");
    const size = String(entry?.size || "");
    const quantity = Number(entry?.quantity);
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug) || !color || color.length > 40 || !size || size.length > 24 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10) throw new OrderError("One or more cart selections are invalid.");
    const key = `${slug}\u0000${color}\u0000${size}`;
    requested.set(key, { slug, color, size, quantity: (requested.get(key)?.quantity || 0) + quantity });
    if (requested.get(key).quantity > 10) throw new OrderError("Maximum quantity is 10 per size and colour.");
  }
  const shippingOption = input.shippingOption === "express" ? "express" : input.shippingOption === "standard" ? "standard" : null;
  if (!shippingOption) throw new OrderError("Choose a valid delivery option.");
  const couponCode = String(input.couponCode || "").trim().toUpperCase();
  if (couponCode && !/^[A-Z0-9_-]{3,32}$/.test(couponCode)) throw new OrderError("Coupon code is invalid.");

  db.exec("BEGIN IMMEDIATE");
  try {
    const items = [];
    let subtotal = 0;
    for (const { slug, color, size, quantity } of requested.values()) {
      const row = db.prepare("SELECT payload FROM products WHERE slug=?").get(slug);
      if (!row) throw new OrderError("A product in your bag is no longer available.", 409);
      const product = JSON.parse(row.payload);
      const variant = product.variants.find((entry) => entry.color === color);
      const stockRow = variant?.sizes.find((entry) => entry.size === size);
      if (!stockRow || stockRow.stock < quantity) throw new OrderError(`Not enough stock for ${product.name} · ${color} · ${size}.`, 409);
      stockRow.stock -= quantity;
      db.prepare("UPDATE products SET payload=?,updated_at=? WHERE slug=?").run(JSON.stringify(product), new Date().toISOString(), slug);
      const lineTotal = product.price * quantity;
      subtotal += lineTotal;
      items.push({ slug, name: product.name, brand: product.brand, image: variant.images[0], color, size, quantity, unitPrice: product.price, lineTotal, category: product.category });
    }
    let discount = 0;
    if (couponCode) {
      const coupon = db.prepare("SELECT * FROM coupons WHERE code=? COLLATE NOCASE").get(couponCode);
      if (!coupon || coupon.active !== 1 || coupon.expires_at <= new Date().toISOString() || coupon.used_count >= coupon.usage_limit || subtotal < coupon.min_subtotal) throw new OrderError("This coupon is invalid, expired or not available for this order.", 422);
      if (coupon.one_per_user && db.prepare("SELECT 1 FROM coupon_redemptions WHERE coupon_code=? AND user_id=?").get(coupon.code, user.id)) throw new OrderError("This coupon has already been used on your account.", 422);
      const products = JSON.parse(coupon.allowed_products);
      const categories = JSON.parse(coupon.allowed_categories);
      const eligible = items.filter((item) => (!products.length && !categories.length) || products.includes(item.slug) || categories.includes(item.category));
      if (!eligible.length) throw new OrderError("This coupon does not apply to the items in your bag.", 422);
      const eligibleTotal = eligible.reduce((sum, item) => sum + item.lineTotal, 0);
      discount = Math.floor(eligibleTotal * coupon.percent_off / 100);
    }
    const delivery = shippingOption === "express" ? 6500 : 3500;
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const data = {
      reference: `DC-${id.slice(0, 8).toUpperCase()}`, customer: { firstName: user.firstName, lastName: user.lastName, email: user.email, phone, address, city, state, postcode },
      items, couponCode: couponCode || null, shippingOption, sample: true,
    };
    createOrder(db, { id, userId: user.id, status: "new", paymentStatus: "pending", paymentMethod: "Preview only", subtotal, discount, delivery, total: subtotal - discount + delivery, data, createdAt });
    if (couponCode) recordCouponRedemption(db, couponCode, user.id, id);
    db.exec("COMMIT");
    return { id, reference: data.reference, status: "new", paymentStatus: "pending", subtotal, discount, delivery, total: subtotal - discount + delivery, data };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
