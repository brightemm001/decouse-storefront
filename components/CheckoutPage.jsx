"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CreditCard, LockKeyhole, ShieldCheck, Truck } from "lucide-react";
import { money } from "../lib/products";
import { useStore } from "./Providers";
import { useCatalogProducts } from "./useCatalogProducts";

export default function CheckoutPage() {
  const { cart, clearCart, ready } = useStore();
  const [profile, setProfile] = useState(undefined);
  const [delivery, setDelivery] = useState("standard");
  const [customer, setCustomer] = useState({ phone: "", address: "", city: "", state: "", postcode: "" });
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const cartSlugs = cart.map((item) => item.slug);
  const { products } = useCatalogProducts({ slugs: cartSlugs, limit: 40 });
  const detailItems = cart.map((item) => ({ ...item, product: products.find((product) => product.slug === item.slug) })).filter((item) => item.product);
  const subtotal = detailItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryEstimate = subtotal === 0 ? 0 : delivery === "express" ? 6500 : 3500;

  useEffect(() => { fetch("/api/auth/me", { cache: "no-store" }).then((response) => response.json()).then((data) => setProfile(data.user || null)).catch(() => setProfile(null)); }, []);
  function updateCustomer(event) { setCustomer((current) => ({ ...current, [event.target.name]: event.target.value })); }
  async function placeOrder(event) {
    event.preventDefault();
    if (!detailItems.length || !profile?.emailVerified) return;
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        items: cart.map(({ slug, size, color, quantity }) => ({ slug, size, color, quantity })),
        customer, shippingOption: delivery, paymentMethod: "preview", couponCode,
      }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Checkout could not be completed.");
      clearCart();
      window.location.href = `/order-success?id=${encodeURIComponent(data.order.id)}`;
    } catch (caught) { setError(caught.message || "Checkout could not be completed."); }
    finally { setSubmitting(false); }
  }

  if (!ready || profile === undefined) return <div className="page-wrap loading-page">Loading checkout…</div>;
  if (!profile) return <div className="page-wrap checkout-empty"><p className="eyebrow">Account required</p><h1>Sign in before checkout.</h1><p>Create an account or sign in to attach orders to your private order history.</p><div><Link className="button button-dark" href="/login?next=%2Fcheckout">Log in <ArrowRight size={15}/></Link><Link className="button button-outline" href="/signup?next=%2Fcheckout">Create account</Link></div></div>;
  if (!profile.emailVerified) return <div className="page-wrap checkout-empty"><p className="eyebrow">Verify your email</p><h1>Confirm your account first.</h1><p>Checkout is enabled after you verify the email on your Decouse account. If you need another link, use signup with the same email.</p><Link className="button button-dark" href="/signup">Request a verification link <ArrowRight size={15}/></Link></div>;
  if (!detailItems.length) return <div className="page-wrap checkout-empty"><p className="eyebrow">Checkout</p><h1>Your bag is empty.</h1><p>Add a product to your bag before continuing.</p><Link className="button button-dark" href="/shop">Explore the collection <ArrowRight size={15}/></Link></div>;

  const states = ["Abia","Abuja FCT","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];
  return <div className="checkout-page page-wrap"><div className="checkout-top"><Link className="brand-mark" href="/">Decouse<span>®</span></Link><span><LockKeyhole size={14}/> Account checkout</span></div><div className="checkout-heading"><div><p className="eyebrow">You’re nearly there</p><h1>Checkout.</h1></div><Link href="/cart" className="text-link"><ArrowLeft size={14}/> Back to your bag</Link></div>
    <div className="demo-checkout-note"><ShieldCheck size={17}/><p><strong>Preview checkout · no payment</strong><span>The server re-checks stock, prices, coupons and delivery totals. Card and PayPal processing is unavailable until provider credentials are configured.</span></p></div>
    <div className="checkout-layout"><form className="checkout-form" onSubmit={placeOrder}>
      <section className="checkout-section"><div className="checkout-section-heading"><span>01</span><div><h2>Account</h2><p>{profile.firstName} {profile.lastName} · {profile.email}</p></div></div><p className="checkout-account-note">This order will be linked to your signed-in account.</p></section>
      <section className="checkout-section"><div className="checkout-section-heading"><span>02</span><div><h2>Delivery address</h2><p>Only the details needed for this order.</p></div></div><div className="form-grid"><label className="form-field"><span>Phone number</span><input name="phone" autoComplete="tel" type="tel" required maxLength={24} value={customer.phone} onChange={updateCustomer} placeholder="+234 800 000 0000"/></label><label className="form-field form-span-two"><span>Street address</span><input name="address" autoComplete="street-address" required maxLength={180} value={customer.address} onChange={updateCustomer} placeholder="House number and street name"/></label><label className="form-field"><span>City</span><input name="city" autoComplete="address-level2" required maxLength={80} value={customer.city} onChange={updateCustomer} placeholder="City"/></label><label className="form-field"><span>State</span><select name="state" autoComplete="address-level1" value={customer.state} onChange={updateCustomer} required><option value="">Select state</option>{states.map((state) => <option key={state}>{state}</option>)}</select></label><label className="form-field"><span>Postcode <small>Optional</small></span><input name="postcode" autoComplete="postal-code" maxLength={24} value={customer.postcode} onChange={updateCustomer} placeholder="Postcode"/></label></div></section>
      <section className="checkout-section"><div className="checkout-section-heading"><span>03</span><div><h2>Delivery option</h2><p>These fees are sample amounts; timing is not connected.</p></div></div><div className="delivery-options"><label className={`delivery-option ${delivery === "standard" ? "selected-option" : ""}`}><input type="radio" name="delivery" value="standard" checked={delivery === "standard"} onChange={(event) => setDelivery(event.target.value)}/><span className="delivery-option-icon"><Truck size={19}/></span><span className="delivery-option-copy"><strong>Standard <small>Sample estimate · no live courier</small></strong></span><span>{money(3500)}</span></label><label className={`delivery-option ${delivery === "express" ? "selected-option" : ""}`}><input type="radio" name="delivery" value="express" checked={delivery === "express"} onChange={(event) => setDelivery(event.target.value)}/><span className="delivery-option-icon"><ArrowRight size={18}/></span><span className="delivery-option-copy"><strong>Express <small>Sample estimate · no live courier</small></strong></span><span>{money(6500)}</span></label></div></section>
      <section className="checkout-section"><div className="checkout-section-heading"><span>04</span><div><h2>Payment</h2><p>Secure provider connections are required before live orders.</p></div></div><div className="provider-setup-note"><CreditCard size={17}/><p>Visa, Mastercard, Verve, PayPal, bank transfer and USSD are not connected in this preview. The action below creates an unpaid preview order only; it will not charge you.</p></div><label className="form-field checkout-coupon"><span>Coupon code <small>Optional · validated by server</small></span><input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} maxLength={32} placeholder="Enter code"/></label></section>
      <label className="form-checkbox order-terms"><input type="checkbox" required/><span>I have read the <Link href="/terms">Terms</Link>, <Link href="/shipping-returns">draft refund policy</Link> and <Link href="/privacy">Privacy policy</Link>. My address and phone are used only for this order in the preview.</span></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="button button-dark button-full place-order-button" type="submit" disabled={submitting}>{submitting ? "Creating preview order…" : `Create unpaid preview order · ${money(subtotal + deliveryEstimate)}`} <ArrowRight size={16}/></button><p className="place-order-note"><LockKeyhole size={13}/> The server never accepts payment status or prices from this form. No email or SMS is sent.</p>
    </form><aside className="checkout-summary"><div className="checkout-summary-head"><h2>Your pieces</h2><Link href="/cart">Edit bag</Link></div><div className="checkout-product-list">{detailItems.map(({ product, quantity, size, color }) => <div className="checkout-product" key={`${product.slug}-${size}-${color}`}><div className="checkout-product-image"><img src={product.variants.find((variant) => variant.color === color)?.images?.[0] || product.image} alt={`${product.name} in ${color}`}/><span>{quantity}</span></div><div className="checkout-product-info"><strong>{product.name}</strong><small>{color} · {size}</small><span>{money(product.price * quantity)}</span></div></div>)}</div><div className="summary-line"><span>Sample subtotal</span><span>{money(subtotal)}</span></div><div className="summary-line"><span>Sample delivery</span><span>{money(deliveryEstimate)}</span></div><div className="summary-total"><span>Estimated total</span><strong>{money(subtotal + deliveryEstimate)}</strong></div><div className="summary-protection"><ShieldCheck size={18}/><span>Server-side checks<br/><small>Final amounts are calculated from the catalogue database.</small></span></div></aside></div>
  </div>;
}
