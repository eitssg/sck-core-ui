import { useEffect, useRef, useState } from "react";
import { useApiHeaders } from "@/hooks/useApiHeaders";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string; // applied to img
  containerClassName?: string; // applied to wrapper
  style?: any;
};

// Simple in-memory cache for object URLs to reduce re-fetching and flicker.
// LRU with soft cap. Revokes object URLs on eviction/tab close.
type CacheEntry = { url: string; ts: number };
const URL_CACHE = new Map<string, CacheEntry>();
const PENDING = new Map<string, Promise<string>>();
const MAX_ENTRIES = 200;
const EVICT_CHUNK = 50;

function cacheGet(key: string | null | undefined): string | null {
  if (!key) return null;
  const e = URL_CACHE.get(key);
  if (!e) return null;
  // touch LRU: delete and re-set to move to end
  URL_CACHE.delete(key);
  URL_CACHE.set(key, { url: e.url, ts: Date.now() });
  return e.url;
}

function cacheSet(key: string, url: string) {
  URL_CACHE.set(key, { url, ts: Date.now() });
  if (URL_CACHE.size > MAX_ENTRIES) {
    // Evict oldest
    const toEvict: string[] = Array.from(URL_CACHE.entries())
      .sort((a, b) => a[1].ts - b[1].ts)
      .slice(0, EVICT_CHUNK)
      .map(([k]) => k);
    for (const k of toEvict) {
      const e = URL_CACHE.get(k);
      if (e) {
        try { URL.revokeObjectURL(e.url); } catch { /* ignore */ }
      }
      URL_CACHE.delete(k);
    }
  }
}

// Revoke all cached URLs on unload to avoid leaks
try {
  window.addEventListener('beforeunload', () => {
    for (const [, e] of URL_CACHE) {
      try { URL.revokeObjectURL(e.url); } catch { /* ignore */ }
    }
    URL_CACHE.clear();
  });
} catch { /* ignore SSR */ }

export default function SecureImg({ src, alt, className, containerClassName, style }: Props) {
  const { getAuthHeaders } = useApiHeaders();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!src) {
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
          urlRef.current = null;
        }
        setObjectUrl(null);
        return;
      }
      setError(null);
      // Try in-memory cache first
      const cached = cacheGet(src);
      if (cached) {
        urlRef.current = cached;
        setObjectUrl(cached);
        return;
      }
      try {
        // Deduplicate concurrent fetches for same src
        let p = PENDING.get(src);
        if (!p) {
          p = (async () => {
            const res = await fetch(src, { method: "GET", headers: { ...getAuthHeaders() }, redirect: "follow" });
            if (!res.ok) throw new Error(`Image fetch failed (${res.status})`);
            const blob = await res.blob();
            const newUrl = URL.createObjectURL(blob);
            cacheSet(src, newUrl);
            return newUrl;
          })();
          PENDING.set(src, p);
        }
        const newUrl = await p.finally(() => { PENDING.delete(src); });
        if (cancelled) {
          // Do not revoke cached URL; another component may use it
          return;
        }
        urlRef.current = newUrl;
        setObjectUrl(newUrl);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load image");
      }
    }
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Don't revoke on unmount if URL is cached; only revoke ephemeral ones
  useEffect(() => () => {
    const u = urlRef.current;
    if (!u) return;
    const stillCached = (() => {
      for (const [, e] of URL_CACHE) if (e.url === u) return true;
      return false;
    })();
    if (!stillCached) {
      try { URL.revokeObjectURL(u); } catch { /* ignore */ }
    }
  }, []);

  if (!src || error) return null;
  return (
    <div className={"bg-white rounded-md overflow-hidden " + (containerClassName || "")}
         style={{ display: "inline-block" }}>
      <img src={objectUrl || undefined} alt={alt} className={className} style={style} />
    </div>
  );
}
