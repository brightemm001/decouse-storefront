import { notFound } from "next/navigation";
import ProductDetail from "../../../components/ProductDetail";
import { getProduct } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = getProduct(slug);
  return product ? { title: product.name, description: product.short || product.description } : {};
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  return <ProductDetail product={product}/>;
}
