export const categories = ["Women", "Men", "Kids", "Accessories"];
export const brands = [];
export const products = [];

export function money(value) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(value) || 0);
}
