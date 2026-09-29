import { saveProduct } from "./db";

const categories = new Set(["Women", "Men", "Kids", "Accessories"]);
const imagePath = (value) => typeof value === "string" && (
  (/^\/images\/[a-zA-Z0-9._/-]+$/.test(value) && !value.includes("..") && !value.includes("\\")) ||
  /^\/api\/uploads\/[0-9a-f-]+\.(?:png|jpe?g|webp)$/.test(value)
);

export function normalizeProduct(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Each product must be an object.");
  const name = String(input.name || "").trim();
  const slug = String(input.slug || "").trim().toLowerCase();
  const brand = String(input.brand || "").trim();
  const type = String(input.type || "").trim();
  const category = String(input.category || "").trim();
  const price = Number(input.price);
  const compareAt = input.compareAt === null || input.compareAt === "" || input.compareAt === undefined ? null : Number(input.compareAt);
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug)) throw new Error("Product slug must contain only lowercase letters, numbers and hyphens.");
  if (!name || name.length > 140 || !brand || brand.length > 100 || !type || type.length > 70) throw new Error("Name, brand and type are required and must be within the length limits.");
  if (!categories.has(category)) throw new Error("Category must be Women, Men, Kids or Accessories.");
  if (!Number.isSafeInteger(price) || price < 1 || price > 100_000_000) throw new Error("Price must be a whole amount in NGN.");
  if (compareAt !== null && (!Number.isSafeInteger(compareAt) || compareAt <= price || compareAt > 100_000_000)) throw new Error("Compare-at price must be a whole amount greater than the current price.");
  if (!Array.isArray(input.variants) || input.variants.length < 1 || input.variants.length > 20) throw new Error("Add between 1 and 20 colour variants.");
  const variants = input.variants.map((variant) => {
    const color = String(variant?.color || "").trim();
    const colorHex = String(variant?.colorHex || "#777777").trim();
    const images = Array.isArray(variant?.images) ? variant.images : [];
    const sizes = Array.isArray(variant?.sizes) ? variant.sizes : [];
    if (!color || color.length > 40 || !/^#[0-9A-Fa-f]{6}$/.test(colorHex)) throw new Error("Each variant needs a colour name and six-digit colour code.");
    if (!images.length || images.length > 12 || images.some((image) => !imagePath(image))) throw new Error("Each colour needs 1–12 local product images. Upload images in the admin panel first.");
    if (!sizes.length || sizes.length > 20) throw new Error("Each colour needs at least one size and stock quantity.");
    const normalizedSizes = sizes.map((entry) => {
      const size = String(entry?.size || "").trim();
      const stock = Number(entry?.stock);
      if (!size || size.length > 24 || !Number.isSafeInteger(stock) || stock < 0 || stock > 1_000_000) throw new Error("Each size needs a name and a whole stock quantity of at least 0.");
      return { size, stock };
    });
    if (new Set(normalizedSizes.map((entry) => entry.size)).size !== normalizedSizes.length) throw new Error("A colour variant has duplicate sizes.");
    return { color, colorHex, images, sizes: normalizedSizes };
  });
  if (new Set(variants.map((variant) => variant.color.toLowerCase())).size !== variants.length) throw new Error("Variant colours must be unique.");
  const image = variants[0].images[0];
  const gallery = [...new Set(variants.flatMap((variant) => variant.images))];
  return {
    id: String(input.id || slug).slice(0, 100), slug, name, brand, category, type, price, compareAt,
    image, gallery, colors: variants.map((variant) => variant.color), colorHex: variants.map((variant) => variant.colorHex),
    sizes: [...new Set(variants.flatMap((variant) => variant.sizes.map((entry) => entry.size)))], variants,
    seller: String(input.seller || brand).trim().slice(0, 100), shipping: 3500,
    short: String(input.short || "").trim().slice(0, 220), description: String(input.description || "").trim().slice(0, 4000),
    tags: Array.isArray(input.tags) ? input.tags.map((tag) => String(tag).trim().slice(0, 30)).filter(Boolean).slice(0, 12) : [],
    isNew: input.isNew === true,
  };
}

export function importProducts(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.format === "decouse-products-v1" ? payload.products : null;
  if (!Array.isArray(rows) || rows.length > 500) throw new Error("Upload a decouse-products-v1 JSON file containing up to 500 products.");
  const products = rows.map(normalizeProduct);
  const slugs = products.map((product) => product.slug);
  if (new Set(slugs).size !== slugs.length) throw new Error("Product slugs must be unique in the upload.");
  for (const product of products) saveProduct(product);
  return products.length;
}
