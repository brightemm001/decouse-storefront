import { categories } from "../../../lib/products";
import { listProducts } from "../../../lib/db";
import { json } from "../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readOne(params, key, max) {
  const raw = params.get(key) || "";
  return raw.length <= max ? raw.trim() : null;
}
function readMany(params, key, maxCount = 20, maxLength = 100) {
  const values = params.getAll(key).map((value) => value.trim());
  return values.length <= maxCount && values.every((value) => value.length <= maxLength) ? values.filter(Boolean) : null;
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const q = readOne(params, "q", 80);
  const sort = readOne(params, "sort", 20) || "featured";
  const limitRaw = readOne(params, "limit", 4) || "12";
  const offsetRaw = readOne(params, "offset", 8) || "0";
  const maxPriceRaw = readOne(params, "maxPrice", 12);
  const minPriceRaw = readOne(params, "minPrice", 12);
  const slugsRaw = readOne(params, "slugs", 2048);
  const selectedCategories = readMany(params, "category", 8, 24);
  const selectedBrands = readMany(params, "brand", 20, 100);
  const selectedTypes = readMany(params, "type", 20, 70);
  const selectedSizes = readMany(params, "size", 30, 24);
  const selectedColors = readMany(params, "color", 30, 40);
  if ([q, maxPriceRaw, minPriceRaw, slugsRaw].includes(null) || [selectedCategories, selectedBrands, selectedTypes, selectedSizes, selectedColors].includes(null)) return json({ error: "A search or filter value is too long." }, 400);
  const limit = Number(limitRaw);
  const offset = Number(offsetRaw);
  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : Infinity;
  const minPrice = minPriceRaw ? Number(minPriceRaw) : 0;
  if ((selectedCategories.some((category) => category !== "Sale" && !categories.includes(category))) || !["featured", "newest", "price-asc", "price-desc"].includes(sort) || !Number.isInteger(limit) || limit < 1 || limit > 40 || !Number.isInteger(offset) || offset < 0 || offset > 100_000 || (maxPriceRaw && !/^\d+$/.test(maxPriceRaw)) || (minPriceRaw && !/^\d+$/.test(minPriceRaw)) || !Number.isFinite(minPrice) || (!Number.isFinite(maxPrice) && maxPrice !== Infinity) || minPrice < 0 || maxPrice < minPrice) return json({ error: "A search or filter value is invalid." }, 400);
  let products = listProducts();
  if (slugsRaw) {
    const slugs = slugsRaw.split(",");
    if (slugs.length > 40 || slugs.some((slug) => !/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug))) return json({ error: "Product identifiers are invalid." }, 400);
    const wanted = new Set(slugs);
    products = products.filter((product) => wanted.has(product.slug));
  }
  if (q) {
    const query = q.toLowerCase();
    products = products.filter((product) => `${product.name} ${product.brand} ${product.type} ${product.category} ${(product.tags || []).join(" ")}`.toLowerCase().includes(query));
  }
  if (selectedCategories.includes("Sale")) products = products.filter((product) => product.compareAt);
  else if (selectedCategories.length) products = products.filter((product) => selectedCategories.includes(product.category));
  if (selectedBrands.length) products = products.filter((product) => selectedBrands.some((brand) => product.brand.toLowerCase() === brand.toLowerCase()));
  if (selectedTypes.length) products = products.filter((product) => selectedTypes.some((type) => product.type.toLowerCase() === type.toLowerCase()));
  if (selectedSizes.length) products = products.filter((product) => product.variants.some((variant) => variant.sizes.some((entry) => selectedSizes.some((size) => entry.size.toLowerCase() === size.toLowerCase()))));
  if (selectedColors.length) products = products.filter((product) => product.variants.some((variant) => selectedColors.some((color) => variant.color.toLowerCase() === color.toLowerCase())));
  products = products.filter((product) => product.price >= minPrice && product.price <= maxPrice);
  if (sort === "newest") products.sort((a, b) => Number(b.isNew) - Number(a.isNew));
  if (sort === "price-asc") products.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") products.sort((a, b) => b.price - a.price);
  const total = products.length;
  const all = listProducts();
  const facets = {
    brands: [...new Set(all.map((product) => product.brand))].sort(),
    types: [...new Set(all.map((product) => product.type))].sort(),
    sizes: [...new Set(all.flatMap((product) => product.variants.flatMap((variant) => variant.sizes.map((entry) => entry.size))))].sort(),
    colors: [...new Set(all.flatMap((product) => product.variants.map((variant) => variant.color)))].sort(),
  };
  return json({ products: products.slice(offset, offset + limit), total, offset, limit, hasMore: offset + limit < total, facets });
}
