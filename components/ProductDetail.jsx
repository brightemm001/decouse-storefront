"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronRight, Heart, Minus, Plus, RotateCcw, Truck } from "lucide-react";
import { money } from "../lib/products";
import { ProductGrid } from "./ProductCard";
import { useStore } from "./Providers";
import { savePersonalListItem } from "../lib/privacy";
import { useCatalogProducts } from "./useCatalogProducts";

export default function ProductDetail({ product }) {
  const { addToCart, wishlist, toggleWishlist } = useStore();
  const { products: catalogue } = useCatalogProducts({ limit: 40 });
  const [imageIndex, setImageIndex] = useState(0);
  const [color, setColor] = useState(product.colors[0]);
  const [size, setSize] = useState(product.sizes[0]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [destination, setDestination] = useState("Lagos");
  const [reviews, setReviews] = useState([]);
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [reviewOrder, setReviewOrder] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const saved = wishlist.includes(product.slug);
  const selectedVariant = product.variants?.find((variant) => variant.color === color);
  const images = selectedVariant?.images?.length ? selectedVariant.images : product.gallery || [product.image];
  const availableSizes = selectedVariant?.sizes?.map((entry) => entry.size) || product.sizes;
  const selectedSizeStock = selectedVariant?.sizes?.find((entry) => entry.size === size)?.stock || 0;
  function chooseColor(option) {
    const nextVariant = product.variants?.find((variant) => variant.color === option);
    setColor(option);
    setImageIndex(0);
    const nextSizes = nextVariant?.sizes || [];
    if (!nextSizes.some((entry) => entry.size === size && entry.stock > 0)) setSize(nextSizes.find((entry) => entry.stock > 0)?.size || nextSizes[0]?.size || "");
    setQuantity(1);
  }
  const shipping = destination === "Lagos" ? Math.min(product.shipping, 2500) : product.shipping;
  const similar = catalogue.filter((item) => item.slug !== product.slug && (item.category === product.category || item.type === product.type)).slice(0, 4);

  useEffect(() => { savePersonalListItem("decouse:viewed", product.slug, 8); }, [product.slug]);
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/products/${encodeURIComponent(product.slug)}/reviews`, { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/orders", { cache: "no-store" }).then((response) => response.ok ? response.json() : { orders: [] }),
    ]).then(([reviewData, orderData]) => {
      if (!active) return;
      setReviews(reviewData.reviews || []);
      const eligible = (orderData.orders || []).filter((order) => ["shipped", "delivered"].includes(order.status) && order.paymentStatus === "paid" && order.items.some((item) => item.slug === product.slug));
      setEligibleOrders(eligible);
      if (eligible.length) setReviewOrder(eligible[0].id);
    }).catch(() => { if (active) { setReviews([]); setEligibleOrders([]); } });
    return () => { active = false; };
  }, [product.slug]);

  async function submitReview(event) {
    event.preventDefault(); setReviewBusy(true); setReviewError(""); setReviewMessage("");
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(product.slug)}/reviews`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: reviewOrder, rating: Number(reviewRating), comment: reviewComment }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the review.");
      setReviewMessage("Your verified purchase review was saved."); setReviewComment("");
      const refreshed = await fetch(`/api/products/${encodeURIComponent(product.slug)}/reviews`, { cache: "no-store" }).then((response) => response.json());
      setReviews(refreshed.reviews || []);
    } catch (caught) { setReviewError(caught.message || "Could not save the review."); }
    finally { setReviewBusy(false); }
  }

  return (
    <div className="product-page page-wrap">
      <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><Link href={`/${product.category.toLowerCase()}`}>{product.category}</Link><span>/</span><span>{product.name}</span></div>
      <div className="product-detail-layout">
        <div className="product-gallery"><div className="gallery-thumbnails">{images.map((src, index) => <button key={src} className={imageIndex === index ? "thumbnail-active" : ""} onClick={() => setImageIndex(index)} aria-label={`View product photo ${index + 1}`} aria-pressed={imageIndex === index}><img src={src} alt=""/></button>)}</div><div className="gallery-main"><img src={images[imageIndex]} alt={`${product.name}, product view ${imageIndex + 1}`}/>{product.compareAt && <span className="gallery-badge">{Math.round((1 - product.price / product.compareAt) * 100)}% off · sample price</span>}<button className={`gallery-favorite ${saved ? "is-saved" : ""}`} aria-label={saved ? "Remove from wishlist" : "Save to wishlist"} onClick={() => toggleWishlist(product.slug)}><Heart size={19} fill={saved ? "currentColor" : "none"}/></button></div><div className="gallery-note">Sample product images <span>↗</span></div></div>
        <div className="product-detail-info"><p className="eyebrow">{product.brand} <span className="verified-seller">Sample listing</span></p><h1>{product.name}</h1><p className="sample-review-note">Customer reviews are not connected in this preview.</p><div className="detail-price"><strong>{money(product.price)}</strong>{product.compareAt && <del>{money(product.compareAt)}</del>}{product.compareAt && <span>Sample saving {money(product.compareAt - product.price)}</span>}</div><p className="detail-description">{product.description}</p>
          <div className="detail-choice-block"><div className="choice-label"><span>Colour</span><span>{color}</span></div><div className="swatch-row detail-swatches">{product.colors.map((option, index) => <button className={`swatch ${color === option ? "swatch-selected" : ""}`} key={option} aria-label={`Choose ${option}`} aria-pressed={color === option} title={option} onClick={() => chooseColor(option)}><span style={{ "--swatch": product.variants?.[index]?.colorHex || product.colorHex?.[index] }} /></button>)}</div></div>
          <div className="detail-choice-block"><div className="choice-label"><span>Choose a size</span><Link href="/size-guide">Size guide <ArrowRight size={13}/></Link></div><div className="size-choices detail-sizes">{availableSizes.map((option) => { const stock = selectedVariant?.sizes?.find((entry) => entry.size === option)?.stock || 0; return <button className={size === option ? "size-selected" : ""} key={option} aria-pressed={size === option} disabled={stock < 1} onClick={() => { setSize(option); setQuantity(1); }}>{option}</button>; })}</div><small className="stock-status" aria-live="polite">{selectedSizeStock > 0 ? `${selectedSizeStock} available in ${size}` : "This size is currently out of stock"}</small></div>
          <div className="quantity-row"><span>Quantity</span><div className="quantity-control"><button disabled={quantity <= 1} onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity"><Minus size={14}/></button><span aria-live="polite">{quantity}</span><button disabled={quantity >= Math.min(10, selectedSizeStock)} onClick={() => setQuantity(Math.min(10, selectedSizeStock, quantity + 1))} aria-label="Increase quantity"><Plus size={14}/></button></div><small>Up to 10 per size and colour</small></div>
          {added ? <div className="added-confirmation product-added" role="status"><Check size={17}/> Added to your bag <Link href="/cart">View bag <ArrowRight size={13}/></Link></div> : <button className="button button-dark button-full add-product-button" disabled={selectedSizeStock < 1 || quantity > selectedSizeStock} onClick={() => { addToCart(product, { size, color, quantity }); setAdded(true); }}>Add to bag <span>{money(product.price * quantity)}</span></button>}
          <div className="shipping-estimate"><div><Truck size={18}/><p><strong>Sample delivery to <select value={destination} onChange={(event) => setDestination(event.target.value)} aria-label="Choose sample delivery destination"><option>Lagos</option><option>Abuja</option><option>Other states</option></select></strong><small>Sample fee: {money(shipping)} · not a live quote</small></p></div><div><RotateCcw size={18}/><p><strong>Returns</strong><small>See the sample refund and returns policy.</small></p></div></div>
          <div className="seller-note"><span className="seller-avatar" aria-hidden="true">{product.seller.split(" ").map((part) => part[0]).slice(0,2).join("")}</span><div><span>Sample seller</span><strong>{product.seller}</strong></div><Link href={`/shop?brand=${encodeURIComponent(product.brand)}`} aria-label={`Shop ${product.brand}`}><ArrowRight size={16}/></Link></div>
          <div className="detail-accordions"><details><summary>Product details <ChevronRight size={16}/></summary><p>{product.description}</p><p>Style code: {product.id}</p></details><details><summary>Delivery & returns <ChevronRight size={16}/></summary><p>Prices, sample delivery fees, timing and refund terms on this preview are placeholders. Review the <Link href="/shipping-returns">shipping and refund policy</Link> before launch.</p></details><details><summary>Care notes <ChevronRight size={16}/></summary><p>Follow the care label inside the garment. Sample care guidance should be replaced by verified manufacturer instructions.</p></details></div>
        </div>
      </div>
      <section className="reviews-section" id="reviews"><div className="section-heading"><p className="eyebrow">Customer feedback</p><h2>Reviews {reviews.length > 0 && <span className="review-total">({reviews.length})</span>}</h2>{reviews.length > 0 && <p className="verified-rating-summary"><span aria-label={`${averageRating.toFixed(1)} out of 5 stars`}>★</span> {averageRating.toFixed(1)} average from {reviews.length} verified {reviews.length === 1 ? "purchase" : "purchases"}</p>}<p className="section-subtitle">Only signed-in customers with a shipped or delivered, paid order for this product can leave a review.</p></div>{eligibleOrders.length > 0 && <form className="verified-review-form" onSubmit={submitReview}><h3>Review a purchase</h3><label className="form-field"><span>Order</span><select value={reviewOrder} onChange={(event) => setReviewOrder(event.target.value)}>{eligibleOrders.map((order) => <option key={order.id} value={order.id}>{order.reference}</option>)}</select></label><label className="form-field"><span>Rating</span><select value={reviewRating} onChange={(event) => setReviewRating(event.target.value)}><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select></label><label className="form-field"><span>Your review</span><textarea required minLength={10} maxLength={1000} rows={4} value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Share details that may help another customer."/></label>{reviewMessage && <p className="auth-success" role="status">{reviewMessage}</p>}{reviewError && <p className="auth-error" role="alert">{reviewError}</p>}<button className="button button-dark" disabled={reviewBusy}>{reviewBusy ? "Saving review…" : "Submit review"} <ArrowRight size={14}/></button></form>}{reviews.length > 0 ? <div className="review-list">{reviews.map((review, index) => <article className="review-card" key={`${review.created_at}-${index}`}><div className="review-card-head"><div><strong>{review.first_name}</strong><small>Verified order · {new Date(review.created_at).toLocaleDateString()}</small></div><span className="review-card-stars" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}</span></div><p>{review.comment}</p></article>)}</div> : <p className="empty-review-note">No customer feedback has been added yet.</p>}</section>
      <section className="section-block similar-section"><div className="section-heading section-heading-inline"><div><p className="eyebrow">Explore a similar edit</p><h2>Similar pieces.</h2></div><Link className="text-link" href={`/${product.category.toLowerCase()}`}>Explore {product.category.toLowerCase()} <ArrowRight size={15}/></Link></div><ProductGrid items={similar}/></section>
    </div>
  );
}
