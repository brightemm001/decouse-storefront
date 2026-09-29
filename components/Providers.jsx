"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const StoreContext = createContext(null);

export function Providers({ children }) {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCart(JSON.parse(window.localStorage.getItem("decouse:cart:v2") || "[]"));
      setWishlist(JSON.parse(window.localStorage.getItem("decouse:wishlist:v2") || "[]"));
    } catch {
      setCart([]);
      setWishlist([]);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem("decouse:cart:v2", JSON.stringify(cart));
  }, [cart, ready]);

  useEffect(() => {
    if (ready) window.localStorage.setItem("decouse:wishlist:v2", JSON.stringify(wishlist));
  }, [wishlist, ready]);

  const value = useMemo(() => ({
    cart,
    wishlist,
    ready,
    cartCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    addToCart(product, options = {}) {
      const size = options.size || product.sizes[0];
      const color = options.color || product.colors[0];
      const quantity = Math.min(10, Math.max(1, Number(options.quantity) || 1));
      setCart((current) => {
        const existing = current.find((item) => item.slug === product.slug && item.size === size && item.color === color);
        if (existing) return current.map((item) => item === existing ? { ...item, quantity: Math.min(10, item.quantity + quantity) } : item);
        return [...current, { slug: product.slug, size, color, quantity }];
      });
    },
    updateQuantity(slug, size, color, quantity) {
      if (quantity <= 0) {
        setCart((current) => current.filter((item) => !(item.slug === slug && item.size === size && item.color === color)));
        return;
      }
      setCart((current) => current.map((item) => item.slug === slug && item.size === size && item.color === color ? { ...item, quantity: Math.min(10, Math.max(1, Number(quantity) || 1)) } : item));
    },
    removeFromCart(slug, size, color) {
      setCart((current) => current.filter((item) => !(item.slug === slug && item.size === size && item.color === color)));
    },
    clearCart() { setCart([]); },
    toggleWishlist(slug) {
      setWishlist((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
    },
  }), [cart, wishlist, ready]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside Providers");
  return context;
}
