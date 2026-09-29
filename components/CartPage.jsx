"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Minus, Plus, Tag, Trash2 } from "lucide-react";
import { money } from "../lib/products";
import { useStore } from "./Providers";
import { ProductGrid } from "./ProductCard";
import { useCatalogProducts } from "./useCatalogProducts";

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, ready } = useStore();
  const [promo, setPromo] = useState("");
  const [promoMessage, setPromoMessage] = useState("");
  const cartSlugs = cart.map((item) => item.slug);
  const { products } = useCatalogProducts({ slugs: cartSlugs, limit: 40 });
  const { products: catalogue } = useCatalogProducts();
  const detailedCart = cart.map((item) => ({ ...item, product: products.find((product) => product.slug === item.slug) })).filter((item) => item.product);
  const subtotal = detailedCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal ? 3500 : 0;
  const total = subtotal + shipping;
  const suggested = useMemo(() => catalogue.filter((item) => !cart.some((row) => row.slug === item.slug)).slice(0, 4), [cart, catalogue]);

  useEffect(() => { setPromo(""); }, []);
  function applyPromo(event) {
    event.preventDefault();
    if (!promo.trim()) { setPromoMessage("Enter a code to check it at checkout."); return; }
    setPromoMessage("Coupon availability and value are checked by the server at checkout.");
  }

  if (!ready) return <div className="page-wrap loading-page"><span className="loading-dot"/>Preparing your bag…</div>;
  if (!detailedCart.length) return <div className="page-wrap empty-cart-page"><div className="empty-cart-icon">✳</div><p className="eyebrow">Your Decouse bag</p><h1>A little room for something good.</h1><p>Your bag is empty or a saved product is no longer in the catalogue.</p><Link className="button button-dark" href="/shop">Explore the collection <ArrowRight size={15}/></Link><div className="section-block suggested-cart"><div className="section-heading section-heading-inline"><div><p className="eyebrow">A few good places to start</p><h2>Pieces to explore.</h2></div><Link className="text-link" href="/for-you">Picked for you <ArrowRight size={14}/></Link></div><ProductGrid items={suggested}/></div></div>;

  return <div className="page-wrap cart-page"><div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>Your bag</span></div><div className="cart-heading"><div><p className="eyebrow">A good choice</p><h1>Your bag <span>({detailedCart.reduce((sum, item) => sum + item.quantity, 0)})</span></h1></div><Link className="text-link" href="/shop"><ArrowRight size={14}/> Keep browsing</Link></div><div className="cart-layout"><section className="cart-items"><div className="cart-list-head"><span>Piece</span><span>Quantity</span><span>Total</span></div>{detailedCart.map(({ product, size, color, quantity }) => <article className="cart-item" key={`${product.slug}-${size}-${color}`}><Link className="cart-item-image" href={`/products/${product.slug}`}><img src={product.variants.find((variant) => variant.color === color)?.images?.[0] || product.image} alt={`${product.name} in ${color}`}/></Link><div className="cart-item-info"><span className="product-brand">{product.brand}</span><Link href={`/products/${product.slug}`} className="product-name">{product.name}</Link><span className="cart-variation">Colour: {color} <i/> Size: {size}</span><span className="mobile-item-price">{money(product.price)}</span><button className="remove-item" aria-label={`Remove ${product.name}, ${color}, size ${size} from bag`} onClick={() => removeFromCart(product.slug, size, color)}><Trash2 size={13}/> Remove</button></div><div className="quantity-control cart-quantity"><button onClick={() => updateQuantity(product.slug, size, color, quantity - 1)} aria-label={`Decrease quantity of ${product.name}`}><Minus size={13}/></button><span>{quantity}</span><button onClick={() => updateQuantity(product.slug, size, color, quantity + 1)} aria-label={`Increase quantity of ${product.name}`}><Plus size={13}/></button></div><strong className="cart-item-total">{money(product.price * quantity)}</strong></article>)}<p className="cart-sample-note">Prices and stock are confirmed again on the server at checkout. Delivery and coupon values below are sample estimates.</p></section>
    <aside className="order-summary"><p className="eyebrow">Your order</p><h2>Order summary</h2><div className="summary-line"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="summary-line"><span>Sample delivery</span><span>{money(shipping)}</span></div><div className="summary-total"><span>Sample total</span><strong>{money(total)}</strong></div><p className="summary-tax-note">Taxes are not calculated in this preview. Checkout will re-check prices, available stock and any coupon.</p><form className="promo-form" onSubmit={applyPromo}><label htmlFor="promo-code"><Tag size={14}/> Coupon code</label><div><input id="promo-code" value={promo} onChange={(event) => setPromo(event.target.value)} placeholder="Enter code"/><button type="submit">Check</button></div>{promoMessage && <small role="status">{promoMessage}</small>}</form><Link className="button button-dark button-full checkout-button" href="/checkout">Continue to checkout <ArrowRight size={16}/></Link><div className="secure-summary"><span aria-hidden="true">✓</span><p>Account required<br/><small>Sign in and verify your email to place an order.</small></p></div><div className="payment-method-chips" aria-label="Payment options planned for provider setup"><span>VISA</span><span>Mastercard</span><span>Verve</span><span>PayPal</span></div></aside></div><p className="cart-reassurance">Preview store · no payment is collected, and there is no live dispatch, refund or tracking service.</p></div>;
}
