"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Heart, LogOut, PackageCheck, Settings2, UserRound } from "lucide-react";
import { useStore } from "./Providers";
import { useCatalogProducts } from "./useCatalogProducts";
import { readPersonalList } from "../lib/privacy";
import { money } from "../lib/products";
import { ProductGrid } from "./ProductCard";

export default function AccountPage() {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [viewed, setViewed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { wishlist } = useStore();
  const { products } = useCatalogProducts({ limit: 40 });
  const savedItems = wishlist.map((slug) => products.find((item) => item.slug === slug)).filter(Boolean);
  const recentItems = viewed.map((slug) => products.find((item) => item.slug === slug)).filter(Boolean);
  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/auth/me", { cache: "no-store" }).then((response) => response.json()), fetch("/api/orders", { cache: "no-store" }).then((response) => response.ok ? response.json() : { orders: [] })])
      .then(([account, orderData]) => { if (active) { setProfile(account.user || null); setOrders(orderData.orders || []); setViewed(readPersonalList("decouse:viewed")); } })
      .catch(() => { if (active) setError("Could not load your account."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/"; }
  if (loading) return <div className="page-wrap loading-page">Loading your account…</div>;
  if (!profile) return <div className="page-wrap account-welcome"><div className="account-icon"><UserRound size={22}/></div><p className="eyebrow">Your Decouse account</p><h1>Keep the good things close.</h1><p>Sign in or create an account to save favourites and view order history.</p><div><Link className="button button-dark" href="/login">Log in <ArrowRight size={15}/></Link><Link className="button button-outline" href="/signup">Create account</Link></div>{error && <small role="alert">{error}</small>}</div>;
  return <div className="page-wrap account-page"><div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>My account</span></div><div className="account-overview"><div className="account-greeting"><div className="account-avatar">{(profile.firstName || profile.email).slice(0,1).toUpperCase()}</div><div><p className="eyebrow">Your personal edit</p><h1>Hello, {profile.firstName || "there"}.</h1><p>{profile.email}</p>{!profile.emailVerified && <small>Email verification is required before checkout.</small>}</div></div><button className="text-link" onClick={logout}><LogOut size={14}/> Log out</button></div><div className="account-shortcuts"><a href="#orders"><PackageCheck size={19}/><span><strong>Order history</strong><small>{orders.length} {orders.length === 1 ? "order" : "orders"}</small></span><ArrowRight size={15}/></a><a href="#saved"><Heart size={19}/><span><strong>Saved pieces</strong><small>{savedItems.length} {savedItems.length === 1 ? "piece" : "pieces"} on your wishlist</small></span><ArrowRight size={15}/></a><Link href="/for-you"><Settings2 size={19}/><span><strong>Your personal edit</strong><small>Manage optional browsing-based picks</small></span><ArrowRight size={15}/></Link>{profile.role === "admin" && <Link href="/admin"><Settings2 size={19}/><span><strong>Store admin</strong><small>Products, stock and orders</small></span><ArrowRight size={15}/></Link>}</div>
    <section className="section-block account-products" id="orders"><div className="section-heading section-heading-inline"><div><p className="eyebrow">Your purchases</p><h2>Order history.</h2></div><Link className="text-link" href="/shop">Explore more <ArrowRight size={14}/></Link></div>{orders.length ? <div className="account-order-list">{orders.map((order) => <article className="account-order-card" key={order.id}><div><strong>{order.reference || order.id}</strong><small>{new Date(order.createdAt).toLocaleDateString()} · {order.status} · payment {order.paymentStatus}</small><small>{order.items.map((item) => `${item.name} · ${item.color} · ${item.size} × ${item.quantity}`).join(" | ")}</small></div><strong>{money(order.total)}</strong><Link className="text-link" href={`/track-order?reference=${encodeURIComponent(order.reference)}`}>Track <ArrowRight size={13}/></Link></article>)}</div> : <div className="account-empty-state"><PackageCheck size={21}/><div><strong>No orders yet.</strong><p>Orders created in this preview appear here and are visible only to your account.</p></div><Link className="text-link" href="/shop">Explore the shop <ArrowRight size={14}/></Link></div>}</section>
    <section className="section-block account-products" id="saved"><div className="section-heading section-heading-inline"><div><p className="eyebrow">The pieces you’ve kept close</p><h2>Saved for later.</h2></div><Link className="text-link" href="/shop">Explore more <ArrowRight size={14}/></Link></div>{savedItems.length ? <ProductGrid items={savedItems}/> : <div className="account-empty-state"><Heart size={21}/><div><strong>No saved pieces just yet.</strong><p>Tap the heart on a piece to keep it here for next time.</p></div><Link className="text-link" href="/shop">Explore the shop <ArrowRight size={14}/></Link></div>}</section>
    {recentItems.length > 0 && <section className="section-block account-products"><div className="section-heading section-heading-inline"><div><p className="eyebrow">Recently explored</p><h2>Pick up where you left off.</h2></div><Link className="text-link" href="/for-you">See your edit <ArrowRight size={14}/></Link></div><ProductGrid items={recentItems.slice(0,4)}/></section>}
  </div>;
}
