"use client";

import { useCallback, useEffect, useState } from "react";

export function useCatalogProducts({ limit = 40, slugs = [] } = {}) {
  const slugKey = [...new Set(slugs)].filter(Boolean).sort().join(",");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(Math.min(40, limit)) });
      if (slugKey) params.set("slugs", slugKey);
      const response = await fetch(`/api/products?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load products.");
      setProducts(data.products || []);
      setError("");
    } catch (caught) {
      setProducts([]);
      setError(caught.message || "Could not load products.");
    } finally { setLoading(false); }
  }, [limit, slugKey]);
  useEffect(() => {
    refresh();
    window.addEventListener("decouse:catalog-updated", refresh);
    return () => window.removeEventListener("decouse:catalog-updated", refresh);
  }, [refresh]);
  return { products, loading, error, refresh };
}
