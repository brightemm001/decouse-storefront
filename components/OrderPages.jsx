"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, ClipboardList, PackageCheck, Printer, Search, Truck } from "lucide-react";
import { money } from "../lib/products";

export function OrderSuccessPage() {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [cancelMessage, setCancelMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") || "";
    if (!id) { setError("An order reference is required."); return; }
    fetch(`/api/orders/${encodeURIComponent(id)}`, { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load this order."); setOrder(data.order); }).catch((caught) => setError(caught.message));
  }, []);
  async function cancelOrder() {
    if (!order || !window.confirm("Cancel this unpaid preview order? Reserved stock will be returned.")) return;
    setBusy(true); setCancelMessage("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not cancel this order.");
      setOrder({ ...order, status: "cancelled" }); setCancelMessage("The order was cancelled and its stock reservation released.");
    } catch (caught) { setCancelMessage(caught.message); }
    finally { setBusy(false); }
  }
  if (!order) return <div className="page-wrap order-empty"><p className="eyebrow">Order receipt</p><h1>{error || "Loading your receipt…"}</h1>{error && <Link className="button button-dark" href="/account">View your account <ArrowRight size={15}/></Link>}</div>;
  const { data } = order;
  const date = new Date(order.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
  return <div className="page-wrap order-success-page"><div className="success-icon"><Check size={26}/></div><p className="eyebrow">Preview order saved</p><h1>Order {data.reference}.</h1><p className="success-intro">This order is stored in your account. No payment was collected and no email, text or courier update was sent.</p><div className="order-reference-card"><div><span>Order reference</span><strong>{data.reference}</strong></div><div><span>Order date</span><strong>{date}</strong></div><div><span>Payment status</span><strong>{order.payment_status} · Preview</strong></div></div><div className="order-success-layout"><section className="receipt-card"><div className="receipt-heading"><div><p className="eyebrow">Decouse · Your receipt</p><h2>Order summary</h2></div><button className="print-button" onClick={() => window.print()}><Printer size={15}/> Print receipt</button></div>{data.items.map((item) => <div className="receipt-item" key={`${item.slug}-${item.color}-${item.size}`}><div className="receipt-item-image"><img src={item.image} alt={`${item.name} in ${item.color}`}/></div><div><strong>{item.name}</strong><small>{item.color} · {item.size} · Qty {item.quantity}</small></div><span>{money(item.lineTotal)}</span></div>)}<div className="receipt-total-row"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>{order.discount > 0 && <div className="receipt-total-row"><span>Coupon saving</span><span>− {money(order.discount)}</span></div>}<div className="receipt-total-row"><span>Sample delivery</span><span>{money(order.delivery)}</span></div><div className="receipt-grand-total"><span>Unpaid preview total</span><strong>{money(order.total)}</strong></div><p className="receipt-demo-note">Preview receipt · payment status remains pending.</p></section><aside className="order-next-steps"><h2>Order status</h2><div className="tracking-step active-step"><span><Check size={13}/></span><div><strong>{order.status}</strong><small>Last updated {date}</small></div></div><p className="tracking-demo-note"><ClipboardList size={14}/> This order has no live payment, delivery or tracking provider.</p>{order.status === "new" && order.payment_status === "pending" && <button className="button button-outline button-full" onClick={cancelOrder} disabled={busy}>{busy ? "Cancelling…" : "Cancel preview order"}</button>}<Link className="button button-dark button-full" href={`/track-order?reference=${encodeURIComponent(data.reference)}`}>View order status <ArrowRight size={15}/></Link><Link className="text-link order-continue-link" href="/account">My account <ArrowRight size={14}/></Link></aside></div>{cancelMessage && <p role="status" className="admin-notice">{cancelMessage}</p>}</div>;
}

export function TrackOrderPage() {
  const [reference, setReference] = useState("");
  const [user, setUser] = useState(undefined);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reference")) setReference(params.get("reference"));
    fetch("/api/auth/me", { cache: "no-store" }).then((response) => response.json()).then((data) => setUser(data.user || null)).catch(() => setUser(null));
  }, []);
  async function track(event) {
    event.preventDefault(); setSearched(true); setError(""); setOrder(null);
    try {
      const response = await fetch(`/api/orders?reference=${encodeURIComponent(reference.trim())}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not find your order.");
      setOrder(data.order);
    } catch (caught) { setError(caught.message || "Could not find your order."); }
  }
  if (user === undefined) return <div className="page-wrap loading-page">Loading account…</div>;
  if (!user) return <div className="page-wrap checkout-empty"><p className="eyebrow">Private order tracking</p><h1>Sign in to view orders.</h1><p>Your order details are visible only to the account that placed the order.</p><Link className="button button-dark" href="/login?next=%2Ftrack-order">Log in <ArrowRight size={15}/></Link></div>;
  const data = order?.data;
  return <div className="page-wrap track-page"><div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>Track an order</span></div><section className="track-intro"><div className="track-icon"><Truck size={22}/></div><p className="eyebrow">Private order status</p><h1>Track your order.</h1><p>Enter the order reference from your receipt. We check that it belongs to your account.</p><form className="track-form" onSubmit={track}><label><span>Order reference</span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="e.g. DC-12345678" required maxLength={40}/></label><button className="button button-dark button-full"><Search size={16}/> Find my order</button></form>{searched && error && <div className="track-error" role="alert">{error}</div>}</section>{order && <section className="tracking-result"><div className="tracking-result-head"><div><p className="eyebrow">Order {data.reference}</p><h2>Current status: {order.status}.</h2></div><span className="order-status-pill">{order.status}</span></div><div className="tracking-timeline"><div className="timeline-node node-active"><span><Check size={13}/></span><div><strong>{order.status}</strong><small>Saved to your account</small></div></div><span className="timeline-line"/><div className="timeline-node"><span><PackageCheck size={14}/></span><div><strong>Payment: {order.payment_status}</strong><small>No payment gateway is connected.</small></div></div><span className="timeline-line"/><div className="timeline-node"><span><Truck size={14}/></span><div><strong>Delivery not connected</strong><small>Sample estimate only.</small></div></div></div><div className="tracking-delivery"><span>Delivery address on this order</span><strong>{data.customer.firstName} {data.customer.lastName}</strong><small>{data.customer.address}, {data.customer.city}, {data.customer.state}</small></div><p className="tracking-demo-note"><ClipboardList size={14}/> This preview sends no email or SMS. Only the signed-in owner can view these details.</p></section>}<div className="track-help"><strong>Need a hand?</strong><p>Store contact details on this preview are examples.</p><Link className="text-link" href="/contact">Contact information <ArrowRight size={14}/></Link></div></div>;
}
