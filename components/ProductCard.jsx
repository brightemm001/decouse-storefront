"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Heart, Plus, X } from "lucide-react";
import { money } from "../lib/products";
import { useStore } from "./Providers";

export function ProductCard({ product, index = 0 }) {
  const { wishlist, toggleWishlist } = useStore();
  const [quickOpen, setQuickOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const saved = wishlist.includes(product.slug);

  return (
    <>
      <article className="product-card">
        <div className="product-image-wrap">
          <Link className="product-image-link" href={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
            <img className="product-image" src={product.image} alt={product.name} loading={index > 3 ? "lazy" : "eager"} />
          </Link>
          {product.compareAt && <span className="product-badge">{Math.round((1 - product.price / product.compareAt) * 100)}% off</span>}
          {!product.compareAt && product.isNew && <span className="product-badge new-badge">New</span>}
          <button className={`favorite-button ${saved ? "is-saved" : ""}`} aria-label={saved ? "Remove from wishlist" : "Save to wishlist"} onClick={() => toggleWishlist(product.slug)}><Heart size={17} fill={saved ? "currentColor" : "none"} /></button>
          <button className="quick-add-trigger" aria-label={`Choose options for ${product.name}`} onClick={() => { setQuickOpen(true); setAdded(false); }}><Plus size={15} /> Quick add</button>
        </div>
        <div className="product-card-info">
          <div className="product-brand">{product.brand}</div>
          <Link href={`/products/${product.slug}`} className="product-name">{product.name}</Link>
          <div className="product-card-meta"><div><strong>{money(product.price)}</strong>{product.compareAt && <del>{money(product.compareAt)}</del>}</div><span className="sample-listing-label">Sample listing</span></div>
        </div>
      </article>
      {quickOpen && <QuickAddModal product={product} onClose={() => setQuickOpen(false)} added={added} setAdded={setAdded} />}
    </>
  );
}

function QuickAddModal({ product, onClose, added, setAdded }) {
  const { addToCart } = useStore();
  const [size, setSize] = useState(product.sizes[0]);
  const [color, setColor] = useState(product.colors[0]);
  const variant = product.variants?.find((entry) => entry.color === color);
  const variantImages = variant?.images?.length ? variant.images : product.gallery || [product.image];
  const variantSizes = variant?.sizes || [];
  const selectedStock = variantSizes.find((entry) => entry.size === size)?.stock || 0;
  function chooseColor(option) {
    setColor(option);
    const next = product.variants?.find((entry) => entry.color === option)?.sizes || [];
    if (!next.some((entry) => entry.size === size && entry.stock > 0)) setSize(next.find((entry) => entry.stock > 0)?.size || next[0]?.size || "");
  }
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="quick-add-modal" role="dialog" aria-modal="true" aria-labelledby="quick-add-title">
        <button className="modal-close icon-button" aria-label="Close" onClick={onClose}><X size={20} /></button>
        <div className="quick-modal-image"><img src={variantImages[0]} alt={`${product.name} in ${color}`} /></div>
        <div className="quick-modal-content"><p className="eyebrow">Quick add</p><h2 id="quick-add-title">{product.name}</h2><p className="quick-modal-price">{money(product.price)}</p>
          <label className="field-label">Colour <span>{color}</span></label><div className="swatch-row">{product.colors.map((option, index) => <button className={`swatch ${color === option ? "swatch-selected" : ""}`} key={option} title={option} aria-label={`Choose ${option}`} aria-pressed={color === option} onClick={() => chooseColor(option)}><span style={{ "--swatch": product.variants?.[index]?.colorHex || product.colorHex?.[index] }} /></button>)}</div>
          <span className="field-label">Size</span><div className="size-choices">{variantSizes.map(({ size: option, stock }) => <button className={size === option ? "size-selected" : ""} key={option} aria-pressed={size === option} disabled={stock < 1} onClick={() => setSize(option)}>{option}</button>)}</div><small className="stock-status">{selectedStock > 0 ? `${selectedStock} available` : "Out of stock"}</small>
          {added ? <div className="added-confirmation"><Check size={17} /> Added to your bag <button onClick={onClose}>Keep browsing</button></div> : <button className="button button-dark button-full" disabled={selectedStock < 1} onClick={() => { addToCart(product, { size, color }); setAdded(true); }}>Add to bag <span>{money(product.price)}</span></button>}
          <Link className="text-link quick-view-link" href={`/products/${product.slug}`}>View full details <span>→</span></Link>
        </div>
      </section>
    </div>
  );
}

export function ProductGrid({ items, columns = 4 }) {
  if (!items.length) return <div className="empty-results"><span className="empty-results-icon">◌</span><h3>No pieces found</h3><p>Try changing a filter or searching for something else.</p></div>;
  return <div className={`product-grid product-grid-${columns}`}>{items.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>;
}
