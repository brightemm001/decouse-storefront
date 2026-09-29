"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Check, ChevronDown, Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { categories, money } from "../lib/products";
import { ProductGrid } from "./ProductCard";
import { useCatalogProducts } from "./useCatalogProducts";
import { openPrivacySettings, readPersonalList, savePersonalListItem } from "../lib/privacy";

const collectionCopy = {
  Women: ["The women’s edit", "Easy layers, standout dresses and considered wardrobe staples."],
  Men: ["The men’s edit", "Everyday staples and occasion-ready pieces."],
  Kids: ["Little Decouse", "Easy pieces for big days and little adventures."],
  Accessories: ["The finishing touches", "Bags, jewellery, shoes and the small details that make a look yours."],
  Sale: ["The sale edit", "Sample marked-down listings from the current catalogue."],
  All: ["Find your own fashion", "Clothing and accessories chosen for the way you live, move and show up."],
};

function FilterGroup({ title, children, defaultOpen = true }) {
  return <details className="filter-group" open={defaultOpen}><summary>{title}<ChevronDown size={15}/></summary><div className="filter-group-content">{children}</div></details>;
}

function CheckOption({ label, checked, onChange, count }) {
  return <label className="check-option"><input type="checkbox" checked={checked} onChange={onChange}/><span className="custom-check"><Check size={11}/></span><span>{label}</span>{count != null && <small>{count}</small>}</label>;
}

export default function ShopPage({ initialCategory = "All" }) {
  const normalizedCategory = initialCategory[0]?.toUpperCase() + initialCategory.slice(1).toLowerCase();
  const startCategory = categories.includes(normalizedCategory) ? normalizedCategory : initialCategory === "Sale" ? "Sale" : "All";
  const [selectedCategories, setSelectedCategories] = useState(startCategory === "All" ? [] : [startCategory]);
  const [query, setQuery] = useState("");
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [maxPrice, setMaxPrice] = useState(100000);
  const [sort, setSort] = useState("featured");
  const [filterOpen, setFilterOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [facets, setFacets] = useState({ brands: [], types: [], sizes: [], colors: [] });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get("q") || "";
    setQuery(urlQuery);
    if (params.get("brand")) setSelectedBrands([params.get("brand")]);
  }, []);

  const filterKey = JSON.stringify({ query, selectedCategories, selectedBrands, selectedTypes, selectedSizes, selectedColors, maxPrice, sort });
  const pageSize = 24;
  const makeParams = useCallback((pageNumber) => {
    const params = new URLSearchParams({ limit: String(pageSize), offset: String((pageNumber - 1) * pageSize), sort, maxPrice: String(maxPrice) });
    if (query.trim()) params.set("q", query.trim());
    selectedCategories.forEach((value) => params.append("category", value));
    selectedBrands.forEach((value) => params.append("brand", value));
    selectedTypes.forEach((value) => params.append("type", value));
    selectedSizes.forEach((value) => params.append("size", value));
    selectedColors.forEach((value) => params.append("color", value));
    return params;
  }, [filterKey]);

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/products?${makeParams(page)}`, { cache: "no-store", signal: abort.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load products."); return data; })
      .then((data) => { setItems(data.products || []); setFacets(data.facets || { brands: [], types: [], sizes: [], colors: [] }); setTotal(data.total || 0); })
      .catch((caught) => { if (caught.name !== "AbortError") { setItems([]); setError(caught.message || "Could not load products."); } })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [filterKey, makeParams, page]);

  const copy = collectionCopy[startCategory] || collectionCopy.All;
  const activeFilters = selectedBrands.length + selectedTypes.length + selectedSizes.length + selectedColors.length + selectedCategories.length + (maxPrice < 100000 ? 1 : 0);
  function toggleValue(setter, value) { setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]); }
  function clearFilters() { setSelectedCategories([]); setSelectedBrands([]); setSelectedTypes([]); setSelectedSizes([]); setSelectedColors([]); setMaxPrice(100000); setQuery(""); }
  function saveSearch(event) {
    event.preventDefault();
    if (!query.trim()) return;
    savePersonalListItem("decouse:searches", query.trim().toLowerCase(), 10);
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set("q", query.trim()); else url.searchParams.delete("q");
    window.history.replaceState(null, "", url.toString());
  }

  return <div className="shop-page page-wrap">
    <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>Shop</span>{startCategory !== "All" && <><span>/</span><span>{startCategory}</span></>}</div>
    <section className={`shop-intro ${startCategory.toLowerCase()}`}><div><p className="eyebrow">The Decouse collection</p><h1>{copy[0]}</h1><p>{copy[1]}</p></div><div className="shop-intro-side"><span className="intro-line"/><span>{String(total).padStart(2, "0")} pieces to explore</span></div></section>
    <div className="shop-tools"><form className="shop-search" onSubmit={saveSearch}><Search size={17}/><label className="sr-only" htmlFor="shop-search">Search products and brands</label><input id="shop-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pieces, brands and more"/><button type="submit" aria-label="Search products"><ArrowRight size={17}/></button></form><div className="shop-toolbar-right"><span className="result-count">{total} pieces</span><button className="filter-mobile-trigger" aria-expanded={filterOpen} onClick={() => setFilterOpen(true)}><SlidersHorizontal size={16}/> Filters {activeFilters > 0 && <b>{activeFilters}</b>}</button><label className="sort-control"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="newest">Just in</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label></div></div>
    <div className="shop-layout"><aside className={`filter-sidebar ${filterOpen ? "filter-open" : ""}`}>
      <div className="mobile-filter-head"><strong>Filters</strong><button className="icon-button" aria-label="Close filters" onClick={() => setFilterOpen(false)}><X size={20}/></button></div>
      <div className="filter-topline"><span><Filter size={15}/> Refine by</span><button onClick={clearFilters}>Clear all</button></div>
      <FilterGroup title="Collection"><div className="filter-check-list">{[...categories, "Sale"].map((category) => <CheckOption key={category} label={category} checked={selectedCategories.includes(category)} onChange={() => toggleValue(setSelectedCategories, category)}/>)}</div></FilterGroup>
      <FilterGroup title="Type"><div className="filter-check-list">{facets.types.map((type) => <CheckOption key={type} label={type} checked={selectedTypes.includes(type)} onChange={() => toggleValue(setSelectedTypes, type)}/>)}</div></FilterGroup>
      <FilterGroup title="Price range"><div className="price-filter-label"><span>Up to</span><strong>{money(maxPrice)}</strong></div><input className="price-range" aria-label="Maximum price" type="range" min="10000" max="100000" step="2500" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))}/><div className="range-ends"><span>₦10k</span><span>₦100k+</span></div></FilterGroup>
      <FilterGroup title="Size"><div className="filter-check-list compact-check-list">{facets.sizes.map((size) => <CheckOption key={size} label={size} checked={selectedSizes.includes(size)} onChange={() => toggleValue(setSelectedSizes, size)}/>)}</div></FilterGroup>
      <FilterGroup title="Colour"><div className="color-filter-list">{facets.colors.slice(0, 18).map((color) => <button className={`color-filter-chip ${selectedColors.includes(color) ? "color-chip-selected" : ""}`} key={color} aria-pressed={selectedColors.includes(color)} onClick={() => toggleValue(setSelectedColors, color)}>{color}</button>)}</div></FilterGroup>
      <FilterGroup title="Brand"><div className="filter-check-list">{facets.brands.map((brand) => <CheckOption key={brand} label={brand} checked={selectedBrands.includes(brand)} onChange={() => toggleValue(setSelectedBrands, brand)}/>)}</div></FilterGroup>
      <div className="filter-help"><span>Need a little help?</span><Link href="/size-guide">Find your size <ArrowRight size={13}/></Link></div>
      <button className="button button-dark button-full mobile-apply-filters" onClick={() => setFilterOpen(false)}>Show {total} pieces</button>
    </aside>
    {filterOpen && <button className="filter-scrim" aria-label="Close filters" onClick={() => setFilterOpen(false)}/>}
    <section className="shop-results" aria-label="Product results" aria-busy={loading}>
      {query && <div className="search-result-note">Search results for <strong>“{query}”</strong><button aria-label="Clear search" onClick={() => setQuery("")}><X size={14}/></button></div>}
      {error && <div className="empty-shop" role="alert"><h2>We couldn’t load the catalogue.</h2><p>{error}</p><button className="button button-outline" onClick={() => window.location.reload()}>Try again</button></div>}
      {!error && items.length === 0 && !loading && <div className="empty-shop"><span className="empty-results-icon">◌</span><h2>{query || activeFilters ? "No pieces match those filters." : "The catalogue is being set up."}</h2><p>{query || activeFilters ? "Try another brand or remove a filter to see more of the collection." : "New products will appear here when the store owner adds them."}</p>{(query || activeFilters) && <button className="button button-outline" onClick={clearFilters}>Clear filters</button>}</div>}
      {items.length > 0 && <ProductGrid items={items} columns={3}/>}
      {loading && <p className="catalog-loading" role="status">Loading pieces…</p>}
      {items.length > 0 && <><nav className="catalog-pagination" aria-label="Product pages"><button className="button button-outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span><button className="button button-outline" onClick={() => setPage((current) => Math.min(Math.ceil(total / pageSize), current + 1))} disabled={page >= Math.ceil(total / pageSize) || loading}>Next</button></nav><div className="shop-bottom-note"><span>Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total} pieces</span><span>Sample catalogue · check details before purchase</span></div></>}
    </section></div>
  </div>;
}

export function ForYouPage() {
  const { products } = useCatalogProducts();
  const [searches, setSearches] = useState([]);
  const [viewed, setViewed] = useState([]);
  function refresh() { setSearches(readPersonalList("decouse:searches")); setViewed(readPersonalList("decouse:viewed")); }
  useEffect(() => { refresh(); window.addEventListener("decouse:consent-updated", refresh); return () => window.removeEventListener("decouse:consent-updated", refresh); }, []);
  const signal = [...searches, ...viewed].join(" ").toLowerCase();
  const preferredCategory = ["women", "dress", "gown"].some((word) => signal.includes(word)) ? "Women" : ["men", "shirt", "suit"].some((word) => signal.includes(word)) ? "Men" : ["kids", "child", "little"].some((word) => signal.includes(word)) ? "Kids" : ["accessory", "bag", "belt", "jewellery"].some((word) => signal.includes(word)) ? "Accessories" : "";
  const picks = preferredCategory ? products.filter((item) => item.category === preferredCategory) : products;
  const recentProducts = viewed.map((slug) => products.find((item) => item.slug === slug)).filter(Boolean);
  return <div className="page-wrap for-you-page"><div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>Picked for you</span></div><section className="personal-intro"><div className="personal-icon"><span>✳</span></div><p className="eyebrow">The Decouse personal edit</p><h1>{preferredCategory ? `A little more ${preferredCategory.toLowerCase()}.` : "A good place to start."}</h1><p>{searches.length || viewed.length ? "A considered edit based on the pieces and brands you’ve explored on this device." : "Enable optional personalisation to save searches and recently viewed pieces on this device."}</p>{(searches.length > 0 || viewed.length > 0) && <div className="personal-signals">{searches.slice(0, 3).map((term) => <span key={term}>Searched: {term}</span>)}{viewed.length > 0 && <span>Based on {viewed.length} recently viewed {viewed.length === 1 ? "piece" : "pieces"}</span>}</div>}<button className="text-link personal-settings" onClick={openPrivacySettings}>Manage privacy choices <ArrowRight size={14}/></button></section>{recentProducts.length > 0 && <section className="section-block recent-section"><div className="section-heading section-heading-inline"><div><p className="eyebrow">Pick up where you left off</p><h2>Recently viewed</h2></div><button className="text-link" onClick={() => { window.localStorage.removeItem("decouse:viewed"); window.localStorage.removeItem("decouse:searches"); refresh(); }}>Clear personalisation history <X size={14}/></button></div><ProductGrid items={recentProducts.slice(0, 4)}/></section>}<section className="section-block"><div className="section-heading section-heading-inline"><div><p className="eyebrow">Your edited selection</p><h2>{preferredCategory ? `Thoughtful ${preferredCategory.toLowerCase()} picks.` : "Pieces to explore."}</h2><p className="section-subtitle">{preferredCategory ? `Based on your interest in ${preferredCategory.toLowerCase()}, here are pieces to explore.` : "A mix of new arrivals and marked-down listings."}</p></div><Link className="text-link" href="/shop">Browse everything <ArrowRight size={15}/></Link></div>{picks.length ? <ProductGrid items={picks.slice(0, 8)}/> : <div className="empty-shop"><h2>The catalogue is being set up.</h2><p>Your personal edit will appear when products are added.</p></div>}</section><section className="personal-note"><div><span>✳</span><div><strong>Make this edit more you</strong><p>Your searches and recently viewed pieces are saved only when optional personalisation is enabled.</p></div></div><button className="button button-outline" onClick={openPrivacySettings}>Privacy choices <ArrowRight size={14}/></button></section></div>;
}
