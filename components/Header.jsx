"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useStore } from "./Providers";
import { openPrivacySettings, savePersonalListItem } from "../lib/privacy";

function BrandMark() {
  return <Link className="brand-mark" href="/" aria-label="Decouse home">Decouse<span>®</span></Link>;
}

export function Header() {
  const { cartCount, wishlist } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  function search(event) {
    event.preventDefault();
    const cleaned = query.trim();
    if (!cleaned) return;
    savePersonalListItem("decouse:searches", cleaned.toLowerCase(), 10);
    router.push(`/shop?q=${encodeURIComponent(cleaned)}`);
    setSearchOpen(false);
    setMenuOpen(false);
  }

  const links = [
    ["Women", "/women"], ["Men", "/men"], ["Kids", "/kids"], ["Accessories", "/accessories"], ["The sale edit", "/deals"],
  ];

  return (
    <>
      <div className="announcement"><span>Preview store · sample products, prices and policies · no live payments</span><Link href="/privacy">Privacy details <ArrowRight size={13} /></Link></div>
      <header className="site-header">
        <div className="header-inner page-wrap">
          <button className="icon-button mobile-menu-button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
          <BrandMark />
          <nav className="desktop-nav" aria-label="Main navigation">
            {links.slice(0, 4).map(([label, href]) => <Link href={href} key={label}>{label}</Link>)}
            <Link className="nav-sale" href="/deals">Sale</Link>
          </nav>
          <div className="header-actions">
            <button className="icon-button search-trigger" aria-label="Search" onClick={() => setSearchOpen(!searchOpen)}>{searchOpen ? <X size={19} /> : <Search size={19} />}</button>
            <Link className="icon-button account-trigger" aria-label="My account" href="/account"><UserRound size={19} /></Link>
            <Link className="icon-button wishlist-trigger" aria-label="Wishlist" href="/account#saved"><Heart size={19} /><span className="icon-count">{wishlist.length}</span></Link>
            <Link className="icon-button bag-trigger" aria-label={`Shopping bag, ${cartCount} items`} href="/cart"><ShoppingBag size={20} /><span className="icon-count">{cartCount}</span></Link>
          </div>
        </div>
        {searchOpen && <form className="header-search page-wrap" onSubmit={search}><Search size={18} /><input autoFocus aria-label="Search products or brands" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, categories or brands" /><button type="submit">Search <ArrowRight size={15} /></button></form>}
        {menuOpen && <nav className="mobile-nav" id="mobile-navigation" aria-label="Mobile navigation">{links.map(([label, href]) => <Link href={href} key={label} onClick={() => setMenuOpen(false)}>{label}<ArrowRight size={16} /></Link>)}<Link href="/for-you" onClick={() => setMenuOpen(false)}>Picked for you<ArrowRight size={16} /></Link><Link href="/login" onClick={() => setMenuOpen(false)}>Log in<ArrowRight size={16} /></Link></nav>}
      </header>
    </>
  );
}

export function Footer() {
  const [subscribed, setSubscribed] = useState(false);
  return (
    <footer className="site-footer">
      <div className="page-wrap footer-main">
        <div className="footer-brand-block"><BrandMark /><p>Considered pieces for the way you live, move and show up.</p><p className="footer-preview-note">Preview store · social profiles are not connected.</p></div>
        <div className="footer-column"><h3>Shop</h3><Link href="/women">Women</Link><Link href="/men">Men</Link><Link href="/kids">Kids</Link><Link href="/accessories">Accessories</Link><Link href="/deals">Sale edit</Link></div>
        <div className="footer-column"><h3>Help & info</h3><Link href="/track-order">Track your order</Link><Link href="/shipping-returns">Shipping & returns</Link><Link href="/size-guide">Size guide</Link><Link href="/contact">Contact us</Link><Link href="/faq">FAQs</Link></div>
        <div className="footer-newsletter"><h3>A little note from us</h3><p>New arrivals, thoughtful edits and offers you’ll actually want.</p>{subscribed ? <div className="subscribe-success" role="status">This preview does not collect email addresses or send newsletters.</div> : <form onSubmit={(event) => { event.preventDefault(); setSubscribed(true); }}><label className="sr-only" htmlFor="newsletter-email">Email address</label><input id="newsletter-email" type="email" placeholder="Your email address" required /><label className="footer-consent"><input type="checkbox" required/><span>I agree to receive marketing emails. This preview will not save my address.</span></label><button type="submit">Join the list <ArrowRight size={16} /></button></form>}<small><Link href="/privacy">Privacy policy</Link> · Demo form only.</small></div>
      </div>
      <div className="page-wrap footer-bottom"><span>© 2026 Decouse. Demo catalogue and store policies.</span><div><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link><Link href="/terms">Terms</Link><button type="button" onClick={openPrivacySettings}>Manage privacy choices</button><span>NGN ₦</span></div></div>
    </footer>
  );
}
