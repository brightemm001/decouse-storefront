import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return <div className="page-wrap not-found"><p className="eyebrow">A little detour</p><h1>We can’t find that piece.</h1><p>The page may have moved, or this link needs another look.</p><Link className="button button-dark" href="/shop">Explore the shop <ArrowRight size={15}/></Link></div>;
}
