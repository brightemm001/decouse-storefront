"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, ImagePlus, PackageCheck, Pencil, RefreshCw, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { money } from "../lib/products";

const starterVariant = [{ color: "Forest", colorHex: "#174B38", images: ["/api/uploads/replace-with-file-name.webp"], sizes: [{ size: "S", stock: 0 }, { size: "M", stock: 0 }, { size: "L", stock: 0 }] }];

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState("all");
  const [section, setSection] = useState("overview");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [variantText, setVariantText] = useState(JSON.stringify(starterVariant, null, 2));
  const [editingSlug, setEditingSlug] = useState("");
  const [editDraft, setEditDraft] = useState(null);
  const [editVariantText, setEditVariantText] = useState("[]");
  const [newProduct, setNewProduct] = useState({ name: "", slug: "", brand: "", category: "Women", type: "Dresses", price: "", compareAt: "", description: "", short: "" });
  const [coupon, setCoupon] = useState({ code: "", percentOff: "10", usageLimit: "100", minSubtotal: "0", expiresAt: "" });
  const [couponCategory, setCouponCategory] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [summaryResponse, productResponse, orderResponse] = await Promise.all([
        fetch("/api/admin/summary", { cache: "no-store" }),
        fetch("/api/admin/products", { cache: "no-store" }),
        fetch(`/api/admin/orders?status=${encodeURIComponent(orderFilter)}`, { cache: "no-store" }),
      ]);
      if ([summaryResponse, productResponse, orderResponse].some((response) => response.status === 401 || response.status === 403)) { window.location.href = "/account"; return; }
      const [summaryData, productData, orderData] = await Promise.all([summaryResponse.json(), productResponse.json(), orderResponse.json()]);
      if (!summaryResponse.ok || !productResponse.ok || !orderResponse.ok) throw new Error(summaryData.error || productData.error || orderData.error || "Could not load the admin dashboard.");
      setSummary(summaryData.summary); setProducts(productData.products); setOrders(orderData.orders); setNotice("");
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }, [orderFilter]);
  useEffect(() => { load(); }, [load]);

  async function saveProduct(product, method = "POST") {
    const response = await fetch(method === "PUT" ? `/api/admin/products/${encodeURIComponent(product.slug)}` : "/api/admin/products", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(product),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not save the product.");
    return data.product;
  }

  async function addProduct(event) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const variants = JSON.parse(variantText);
      const product = { ...newProduct, slug: newProduct.slug || newProduct.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), price: Number(newProduct.price), compareAt: newProduct.compareAt ? Number(newProduct.compareAt) : null, variants };
      await saveProduct(product);
      setNotice("Product added to the catalogue.");
      setNewProduct({ name: "", slug: "", brand: "", category: "Women", type: "Dresses", price: "", compareAt: "", description: "", short: "" });
      await load();
    } catch (error) { setNotice(error instanceof SyntaxError ? "Variants must be valid JSON." : error.message); }
    finally { setBusy(false); }
  }

  function startEdit(product) {
    setEditingSlug(product.slug);
    setEditDraft({ ...product });
    setEditVariantText(JSON.stringify(product.variants, null, 2));
  }

  async function updateProductDetails(event) {
    event.preventDefault();
    if (!editDraft) return;
    setBusy(true); setNotice("");
    try {
      await saveProduct({ ...editDraft, variants: JSON.parse(editVariantText) }, "PUT");
      setEditingSlug(""); setEditDraft(null);
      setNotice("Product details updated.");
      await load();
    } catch (error) { setNotice(error instanceof SyntaxError ? "Variants must be valid JSON." : error.message); }
    finally { setBusy(false); }
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setNotice("");
    try {
      if (!file.name.toLowerCase().endsWith(".json") || file.size > 5 * 1024 * 1024) throw new Error("Choose a JSON file under 5 MB.");
      const payload = JSON.parse(await file.text());
      const products = Array.isArray(payload) ? payload : payload?.products;
      if (!Array.isArray(products)) throw new Error("The file must contain a products array.");
      const response = await fetch("/api/admin/products/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format: "decouse-products-v1", products, replace: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Import failed.");
      setNotice(`Catalogue replaced with ${data.imported} product${data.imported === 1 ? "" : "s"}.`);
      await load();
    } catch (error) { setNotice(error.message || "Import failed."); }
    finally { event.target.value = ""; setBusy(false); }
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setNotice("");
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Image upload failed.");
      await navigator.clipboard?.writeText(data.url).catch(() => {});
      setNotice(`Uploaded ${data.url} · URL copied if clipboard access is available. Add it to a variant’s images array.`);
    } catch (error) { setNotice(error.message); }
    finally { event.target.value = ""; setBusy(false); }
  }

  async function updateStatus(orderId, status) {
    const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const data = await response.json();
    setNotice(response.ok ? `Order status updated to ${status}.` : data.error || "Could not update the order.");
    if (response.ok) await load();
  }

  async function saveCoupon(event) {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch("/api/admin/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...coupon, percentOff: Number(coupon.percentOff), usageLimit: Number(coupon.usageLimit), minSubtotal: Number(coupon.minSubtotal), expiresAt: new Date(coupon.expiresAt).toISOString(), allowedProducts: [], allowedCategories: couponCategory ? [couponCategory] : [], onePerUser: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save coupon.");
      setNotice("Coupon saved with server-side expiry, use and account checks.");
    } catch (error) { setNotice(error.message || "Could not save coupon."); }
    finally { setBusy(false); }
  }

  async function removeProduct(product) {
    if (!window.confirm(`Delete “${product.name}” from the catalogue?`)) return;
    const response = await fetch(`/api/admin/products/${encodeURIComponent(product.slug)}`, { method: "DELETE" });
    const data = await response.json();
    setNotice(response.ok ? "Product deleted." : data.error || "Could not delete product.");
    if (response.ok) await load();
  }

  return <div className="admin-page page-wrap"><div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>Admin</span></div>
    <header className="admin-header"><div><p className="eyebrow"><ShieldCheck size={14}/> Decouse administration</p><h1>Store control room.</h1><p>Customer and order data is visible to verified administrators only.</p></div><button className="button button-outline" onClick={load} disabled={busy}><RefreshCw size={15}/> Refresh data</button></header>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    <nav className="admin-tabs" aria-label="Admin sections">{[["overview","Overview"],["products","Products & stock"],["orders","Orders"],["coupons","Coupons"]].map(([id,label]) => <button key={id} className={section === id ? "admin-tab-active" : ""} aria-pressed={section === id} onClick={() => setSection(id)}>{label}</button>)}</nav>
    {section === "overview" && <section><div className="admin-stat-grid">{[["Products",summary?.products],["Units in stock",summary?.units_in_stock],["New orders",summary?.new_orders],["Cancelled orders",summary?.cancelled_orders],["Customer accounts",summary?.users]].map(([label,value]) => <article key={label}><span>{label}</span><strong>{value ?? "—"}</strong></article>)}</div><div className="admin-overview-columns"><section className="admin-panel"><h2>Latest orders</h2>{orders.slice(0,6).map((order) => <div className="admin-order-row" key={order.id}><span><strong>{order.data.reference}</strong><small>{order.email} · {new Date(order.created_at).toLocaleDateString()}</small></span><span>{money(order.total)}</span><span className={`order-status-pill admin-status-${order.status}`}>{order.status}</span></div>)}{!orders.length && <p>No orders yet.</p>}<button className="text-link" onClick={() => setSection("orders")}>View orders <ArrowLeft size={14}/></button></section><section className="admin-panel"><h2>Security status</h2><ul className="admin-security-list"><li>Verified admin session and role checks on every admin API.</li><li>Products and orders are stored in SQLite on the server.</li><li>Passwords are scrypt hashes; raw passwords are never stored.</li><li>Checkout is account-only and does not mark preview orders as paid.</li><li>Optional administrator TOTP is enabled with <code>ADMIN_TOTP_SECRET</code>.</li></ul></section></div></section>}
    {section === "products" && <div className="admin-product-layout"><section className="admin-panel"><div className="admin-panel-heading"><div><h2>Catalogue tools</h2><p>Import replaces the current catalogue. Use the downloadable JSON template.</p></div><a className="button button-outline" href="/api/admin/products/export"><ArrowDownToLine size={15}/> Export JSON</a></div><div className="admin-tool-row"><a href="/products-import-template.json" download>Download product template</a><label className="button button-dark admin-file-button"><ArrowUpFromLine size={15}/> Replace catalogue from JSON<input type="file" accept="application/json,.json" onChange={importFile}/></label></div><label className="admin-upload-label"><ImagePlus size={15}/> Upload a product image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadImage}/></label><small>PNG, JPEG or WebP · maximum 4 MB · stored outside the public folder and served through an image-only route. Malware scanning is not enabled in this local build.</small></section>
      <section className="admin-panel"><h2>Add one product</h2><form className="admin-product-form" onSubmit={addProduct}><label className="form-field"><span>Product name</span><input required value={newProduct.name} onChange={(event) => setNewProduct({ ...newProduct, name: event.target.value })}/></label><label className="form-field"><span>Slug <small>Lowercase; generated if blank</small></span><input value={newProduct.slug} onChange={(event) => setNewProduct({ ...newProduct, slug: event.target.value })}/></label><div className="form-grid"><label className="form-field"><span>Brand</span><input required value={newProduct.brand} onChange={(event) => setNewProduct({ ...newProduct, brand: event.target.value })}/></label><label className="form-field"><span>Category</span><select value={newProduct.category} onChange={(event) => setNewProduct({ ...newProduct, category: event.target.value })}>{["Women","Men","Kids","Accessories"].map((item) => <option key={item}>{item}</option>)}</select></label><label className="form-field"><span>Type</span><input required value={newProduct.type} onChange={(event) => setNewProduct({ ...newProduct, type: event.target.value })}/></label><label className="form-field"><span>Price in NGN</span><input required inputMode="numeric" type="number" min="1" value={newProduct.price} onChange={(event) => setNewProduct({ ...newProduct, price: event.target.value })}/></label><label className="form-field"><span>Compare-at price <small>Optional</small></span><input inputMode="numeric" type="number" min="1" value={newProduct.compareAt} onChange={(event) => setNewProduct({ ...newProduct, compareAt: event.target.value })}/></label></div><label className="form-field"><span>Description</span><textarea rows="3" value={newProduct.description} onChange={(event) => setNewProduct({ ...newProduct, description: event.target.value })}/></label><label className="form-field"><span>Colour variants JSON</span><textarea className="admin-code-input" rows="10" value={variantText} onChange={(event) => setVariantText(event.target.value)} spellCheck="false"/></label><button className="button button-dark" disabled={busy}><Save size={15}/> Add product</button></form></section>
      <section className="admin-panel admin-inventory-panel"><div className="admin-panel-heading"><div><h2>Current products & inventory</h2><p>Stock is recorded per colour and size. Update details, images or prices with Edit.</p></div></div>{products.map((product) => <article className="admin-inventory-product" key={product.slug}><div className="admin-product-heading"><img src={product.image} alt=""/><span><strong>{product.name}</strong><small>{product.brand} · {product.category} · {money(product.price)}</small></span><div className="admin-inventory-actions"><button className="icon-button" aria-label={`Edit ${product.name}`} onClick={() => editingSlug === product.slug ? setEditingSlug("") : startEdit(product)}>{editingSlug === product.slug ? <X size={16}/> : <Pencil size={16}/>}</button><button className="icon-button admin-delete-button" aria-label={`Delete ${product.name}`} onClick={() => removeProduct(product)}><Trash2 size={16}/></button></div></div>{editingSlug === product.slug && editDraft && <form className="admin-edit-form" onSubmit={updateProductDetails}><div className="form-grid"><label className="form-field"><span>Product name</span><input required maxLength={140} value={editDraft.name} onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}/></label><label className="form-field"><span>Brand</span><input required maxLength={100} value={editDraft.brand} onChange={(event) => setEditDraft({ ...editDraft, brand: event.target.value })}/></label><label className="form-field"><span>Category</span><select value={editDraft.category} onChange={(event) => setEditDraft({ ...editDraft, category: event.target.value })}>{["Women","Men","Kids","Accessories"].map((item) => <option key={item}>{item}</option>)}</select></label><label className="form-field"><span>Type</span><input required maxLength={70} value={editDraft.type} onChange={(event) => setEditDraft({ ...editDraft, type: event.target.value })}/></label><label className="form-field"><span>Price (NGN)</span><input type="number" min="1" max="100000000" required value={editDraft.price} onChange={(event) => setEditDraft({ ...editDraft, price: Number(event.target.value) })}/></label><label className="form-field"><span>Compare-at price</span><input type="number" min="1" max="100000000" value={editDraft.compareAt || ""} onChange={(event) => setEditDraft({ ...editDraft, compareAt: event.target.value ? Number(event.target.value) : null })}/></label></div><label className="form-field"><span>Short description</span><input maxLength={220} value={editDraft.short || ""} onChange={(event) => setEditDraft({ ...editDraft, short: event.target.value })}/></label><label className="form-field"><span>Description</span><textarea rows="3" maxLength={4000} value={editDraft.description || ""} onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })}/></label><label className="form-field"><span>Colour variants, photos and stock (JSON)</span><textarea className="admin-code-input" rows="12" value={editVariantText} onChange={(event) => setEditVariantText(event.target.value)} spellCheck="false"/></label><button className="button button-dark" disabled={busy}><Save size={15}/> Save product changes</button></form>}{product.variants.map((variant) => <div className="admin-variant-row" key={variant.color}><strong>{variant.color}</strong>{variant.sizes.map((size) => <label key={size.size}>{size.size}<input type="number" min="0" max="1000000" value={size.stock} aria-label={`${product.name}, ${variant.color}, size ${size.size} stock`} onChange={(event) => { const next = structuredClone(product); next.variants.find((entry) => entry.color === variant.color).sizes.find((entry) => entry.size === size.size).stock = Number(event.target.value); setProducts((current) => current.map((entry) => entry.slug === product.slug ? next : entry)); }} onBlur={async (event) => { const next = structuredClone(product); next.variants.find((entry) => entry.color === variant.color).sizes.find((entry) => entry.size === size.size).stock = Number(event.target.value); try { await saveProduct(next, "PUT"); setNotice(`Inventory saved for ${product.name}.`); } catch (error) { setNotice(error.message); await load(); } }}/></label>)}</div>)}</article>)}{!products.length && <p>The catalogue is empty. Add a product or import your edited JSON file.</p>}</section></div>}
    {section === "orders" && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Orders</h2><p>Customer address and contact information appears only in these authorized admin records.</p></div><label>Filter by status <select value={orderFilter} onChange={(event) => setOrderFilter(event.target.value)}>{["all","new","processing","shipped","delivered","cancelled"].map((item) => <option key={item}>{item}</option>)}</select></label></div>{orders.map((order) => <article className="admin-order-card" key={order.id}><div><strong>{order.data.reference}</strong><small>{order.email} · {order.data.customer.phone} · {new Date(order.created_at).toLocaleString()}</small><small>{order.data.customer.address}, {order.data.customer.city}, {order.data.customer.state}</small><small>{order.data.items.map((item) => `${item.name} · ${item.color} · ${item.size} × ${item.quantity}`).join(" | ")}</small></div><div className="admin-order-card-side"><strong>{money(order.total)}</strong><span>{order.payment_status} · {order.payment_method}</span><select aria-label={`Update order ${order.data.reference} status`} value={order.status} disabled={order.status === "cancelled"} onChange={(event) => updateStatus(order.id, event.target.value)}>{[order.status, ...(order.payment_status === "paid" ? ["processing","shipped","delivered"] : []), ...(order.payment_status !== "paid" ? ["cancelled"] : ["cancelled"])].filter((item, index, items) => items.indexOf(item) === index).map((item) => <option key={item}>{item}</option>)}</select>{order.payment_status !== "paid" && <small>Fulfilment unlocks after server-confirmed payment.</small>}</div></article>)}{!orders.length && <p>No orders match this filter.</p>}</section>}
    {section === "coupons" && <div className="admin-overview-columns"><section className="admin-panel"><h2>Create a discount code</h2><form className="admin-product-form" onSubmit={saveCoupon}><label className="form-field"><span>Code</span><input required maxLength="32" value={coupon.code} onChange={(event) => setCoupon({ ...coupon, code: event.target.value.toUpperCase() })}/></label><div className="form-grid"><label className="form-field"><span>Percent off</span><input type="number" min="1" max="90" required value={coupon.percentOff} onChange={(event) => setCoupon({ ...coupon, percentOff: event.target.value })}/></label><label className="form-field"><span>Usage limit</span><input type="number" min="1" required value={coupon.usageLimit} onChange={(event) => setCoupon({ ...coupon, usageLimit: event.target.value })}/></label><label className="form-field"><span>Minimum subtotal (NGN)</span><input type="number" min="0" required value={coupon.minSubtotal} onChange={(event) => setCoupon({ ...coupon, minSubtotal: event.target.value })}/></label><label className="form-field"><span>Expires</span><input type="datetime-local" required value={coupon.expiresAt} onChange={(event) => setCoupon({ ...coupon, expiresAt: event.target.value })}/></label><label className="form-field"><span>Allowed category <small>Optional</small></span><select value={couponCategory} onChange={(event) => setCouponCategory(event.target.value)}><option value="">All products</option>{["Women","Men","Kids","Accessories"].map((item) => <option key={item}>{item}</option>)}</select></label></div><p className="summary-tax-note">This sample coupon is validated on the server. Usage is one per customer by default.</p><button className="button button-dark" disabled={busy}><Save size={15}/> Save coupon</button></form></section><section className="admin-panel"><h2>Coupon safety</h2><p>The checkout checks status, expiry, use cap, minimum order, allowed category or product list, and one-per-account before applying any discount.</p><p>Coupon redemption is reserved with the order and released if an unpaid order is cancelled.</p></section></div>}
    <p className="admin-footnote"><PackageCheck size={14}/> Local SQLite is suitable for a single persistent server. Use a managed database and shared rate-limit store before multi-instance/serverless deployment.</p>
  </div>;
}
