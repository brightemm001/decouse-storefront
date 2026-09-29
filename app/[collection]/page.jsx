import { notFound } from "next/navigation";
import ShopPage from "../../components/ShopPage";

const collections = ["women", "men", "kids", "accessories", "deals"];

export function generateStaticParams() {
  return collections.map((collection) => ({ collection }));
}

export default async function CollectionPage({ params }) {
  const { collection } = await params;
  if (!collections.includes(collection)) notFound();
  const category = collection === "deals" ? "Sale" : collection[0].toUpperCase() + collection.slice(1);
  return <ShopPage initialCategory={category}/>;
}
