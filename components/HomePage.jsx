"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { ProductGrid } from "./ProductCard";
import { readPersonalList } from "../lib/privacy";
import { useCatalogProducts } from "./useCatalogProducts";

const collections = [
  { title: "Women", note: "Pieces that move with you.", image: "/images/look-028.webp", alt: "Model wearing a cobalt occasion dress", href: "/women", className: "category-women" },
  { title: "Men", note: "Everyday, considered.", image: "/images/look-012.webp", alt: "Model wearing a tailored light outfit", href: "/men", className: "category-men" },
  { title: "Kids", note: "Little looks, big days.", image: "/images/kids-sweatshirt.svg", alt: "Illustration of a children's sage sweatshirt", href: "/kids", className: "category-kids" },
  { title: "Accessories", note: "The finishing touches.", image: "/images/look-036.webp", alt: "Structured everyday tote bag", href: "/accessories", className: "category-accessories" },
];

export default function HomePage() {
  const { products } = useCatalogProducts();
  const [tab, setTab] = useState("Featured");
  const [taste, setTaste] = useState({ category: "", terms: [] });
  useEffect(() => {
    try {
      const searches = readPersonalList("decouse:searches");
      const viewed = readPersonalList("decouse:viewed");
      const signal = [...searches, ...viewed].join(" ").toLowerCase();
      const category = ["women", "dress", "gown", "top", "set", "studio nia", "mina"].some((word) => signal.includes(word)) ? "Women" : ["men", "shirt", "suit", "tee", "northline", "akin"].some((word) => signal.includes(word)) ? "Men" : ["kids", "child", "little"].some((word) => signal.includes(word)) ? "Kids" : ["bag", "jewellery", "belt", "shoe", "accessory", "forma", "nala"].some((word) => signal.includes(word)) ? "Accessories" : "";
      setTaste({ category, terms: searches.slice(0, 2) });
    } catch { setTaste({ category: "", terms: [] }); }
    const refresh = () => {
      const searches = readPersonalList("decouse:searches");
      const viewed = readPersonalList("decouse:viewed");
      const signal = [...searches, ...viewed].join(" ").toLowerCase();
      const category = ["women", "dress", "gown", "top", "set", "studio nia", "mina"].some((word) => signal.includes(word)) ? "Women" : ["men", "shirt", "suit", "tee", "northline", "akin"].some((word) => signal.includes(word)) ? "Men" : ["kids", "child", "little"].some((word) => signal.includes(word)) ? "Kids" : ["bag", "jewellery", "belt", "shoe", "accessory", "forma", "nala"].some((word) => signal.includes(word)) ? "Accessories" : "";
      setTaste({ category, terms: searches.slice(0, 2) });
    };
    window.addEventListener("decouse:consent-updated", refresh);
    return () => window.removeEventListener("decouse:consent-updated", refresh);
  }, []);

  const personalPicks = useMemo(() => {
    const pool = taste.category ? products.filter((item) => item.category === taste.category) : products;
    return [...pool].sort((a, b) => Number(b.isNew) - Number(a.isNew)).slice(0, 4);
  }, [taste.category, products]);

  const visibleBestSellers = useMemo(() => {
    if (tab === "On sale") return products.filter((item) => item.compareAt).slice(0, 8);
    if (tab === "Accessories") return products.filter((item) => item.category === "Accessories").slice(0, 8);
    if (tab === "Just in") return products.filter((item) => item.isNew).slice(0, 8);
    return products.filter((item) => item.isNew || item.compareAt).slice(0, 8);
  }, [tab, products]);

  return (
    <>
      <section className="hero-band">
        <div className="page-wrap hero-layout">
          <div className="hero-copy">
            <p className="eyebrow">A more considered wardrobe</p>
            <h1>Discover and find <em>your own fashion.</em></h1>
            <p className="hero-description">Thoughtful clothing and accessories, chosen to feel like you. Find your next favourite in our new-season edit.</p>
            <div className="hero-actions"><Link className="button button-dark" href="/shop">Explore the collection <ArrowRight size={16} /></Link><Link className="hero-secondary-link" href="/for-you">Find your fit <ArrowDownRight size={16} /></Link></div>
            <div className="hero-proof"><p><strong>Demo catalogue</strong> · sample listings and prices</p></div>
          </div>
          <div className="hero-visual">
            <div className="hero-visual-caption"><span>THE NEW SEASON</span><span>01 — 04</span></div>
            <div className="hero-image-frame"><img src="/images/hero-green-suit.webp" alt="Model wearing a tailored forest-green suit with a cream blouse" /></div>
            <div className="hero-sticker"><span>Pieces<br />to keep.</span><ArrowUpRight size={18} /></div>
            <div className="hero-side-note">Style is personal. Start with what feels like you.</div>
          </div>
        </div>
        <div className="hero-bottom-line page-wrap"><span>Thoughtful style. Everyday ease.</span><span>Scroll to discover&nbsp; ↓</span></div>
      </section>

      <section className="page-wrap section-block category-section">
        <div className="section-heading section-heading-inline"><div><p className="eyebrow">Find your corner</p><h2>Made for every you.</h2></div><Link className="text-link" href="/shop">View all collections <ArrowRight size={15} /></Link></div>
        <div className="collection-grid">{collections.map((item, index) => <Link href={item.href} className={`collection-card ${item.className}`} key={item.title}><img src={item.image} alt={item.alt} loading="lazy" /><span className="collection-index">0{index + 1}</span><span className="collection-label"><span><strong>{item.title}</strong><small>{item.note}</small></span><span className="collection-arrow"><ArrowUpRight size={17} /></span></span></Link>)}</div>
      </section>

      <section className="section-tint section-block">
        <div className="page-wrap">
          <div className="section-heading recommendation-heading"><div><p className="eyebrow"><Sparkles size={14} /> Your style, your way</p><h2>{taste.category ? `A little more ${taste.category.toLowerCase()}.` : "A good place to start."}</h2><p className="section-subtitle">{taste.terms.length ? `Picked with your recent interest in ${taste.terms.slice(0, 2).join(" and ")}.` : "Personalised picks to make finding your next favourite feel easy."}</p></div><Link className="text-link" href="/for-you">See your full edit <ArrowRight size={15} /></Link></div>
          <ProductGrid items={personalPicks} />
        </div>
      </section>

      <section className="page-wrap section-block best-section">
          <div className="section-heading section-heading-inline"><div><p className="eyebrow">A few places to begin</p><h2>Explore the edit.</h2></div><Link className="text-link" href="/shop">Shop all pieces <ArrowRight size={15} /></Link></div>
        <div className="product-tabs" role="tablist" aria-label="Product collections">{["Featured", "On sale", "Just in", "Accessories"].map((item) => <button role="tab" aria-selected={tab === item} className={tab === item ? "active-tab" : ""} key={item} onClick={() => setTab(item)}>{item}</button>)}</div>
        <ProductGrid items={visibleBestSellers} />
        <div className="center-action"><Link className="button button-outline" href={tab === "On sale" ? "/deals" : "/shop"}>Explore more <ArrowRight size={15} /></Link></div>
      </section>

      <section className="page-wrap campaign-wrap">
        <div className="campaign-card"><div className="campaign-image"><img src="/images/hero-green-suit.webp" alt="Model in a forest-green tailored suit" loading="lazy" /><span className="campaign-image-note">THE DECOUSE EDIT</span></div><div className="campaign-copy"><p className="eyebrow">A considered wardrobe</p><h2>Good style should feel <em>like you.</em></h2><p>Explore clothing and accessories for everyday plans, special occasions and all the little details in between.</p><Link className="button button-dark" href="/shop">Explore the shop <ArrowRight size={16} /></Link><small>Preview catalogue · sample listings</small></div></div>
      </section>

      <section className="page-wrap section-block story-section">
        <div className="section-heading"><p className="eyebrow">A wardrobe with a point of view</p><h2>The finishing touch is <em>always you.</em></h2><p className="section-subtitle">Everyday favourites, occasion pieces and all the little details in between.</p></div>
        <div className="editorial-grid">
          <Link className="editorial-card editorial-tall" href="/accessories"><img src="/images/look-036.webp" alt="A structured everyday tote" loading="lazy"/><span className="editorial-caption"><span><small>THE EVERYDAY EDIT</small><strong>Accessories with intention</strong></span><ArrowUpRight size={18} /></span></Link>
          <Link className="editorial-card" href="/men"><img src="/images/look-038.webp" alt="A polished traditional outfit" loading="lazy"/><span className="editorial-caption"><span><small>FOR THE MOMENTS THAT MATTER</small><strong>Make room for occasion</strong></span><ArrowUpRight size={18} /></span></Link>
          <Link className="editorial-card" href="/women"><img src="/images/look-040.webp" alt="A warm-toned, modern outfit" loading="lazy"/><span className="editorial-caption"><span><small>COLOUR, YOUR WAY</small><strong>Find your new favourite</strong></span><ArrowUpRight size={18} /></span></Link>
        </div>
      </section>

      <section className="testimonial-section section-tint section-block">
        <div className="page-wrap"><div className="section-heading"><p className="eyebrow">A clearer way to shop</p><h2>Details that help you choose.</h2></div><div className="trust-feature-grid"><article><span>01</span><h3>Find the right edit</h3><p>Browse women’s, men’s, kids’ and accessories collections, or search by brand, size, colour and price.</p></article><article><span>02</span><h3>See the product clearly</h3><p>Compare available colours and sizes, browse product images, and find similar pieces before adding to your bag.</p></article><article><span>03</span><h3>Choose your privacy settings</h3><p>Personalised search and browsing history is optional and stays in this browser when you enable it.</p></article></div></div>
      </section>

      <section className="page-wrap service-strip"><div><span className="service-icon">01</span><strong>Clear product details</strong><small>Compare size and colour options.</small></div><div><span className="service-icon">02</span><strong>Your privacy choices</strong><small>Choose whether to enable personalisation.</small></div><div><span className="service-icon">03</span><strong>Preview checkout</strong><small>No payment is taken in this demo.</small></div></section>
    </>
  );
}
