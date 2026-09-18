/**
 * In-Memory Client Cache with TTL and Stale-While-Revalidate pattern.
 * Provides instant page rendering on navigation while keeping data fresh in background.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // in milliseconds
}

class ClientCache {
  private store = new Map<string, CacheEntry<any>>();

  /**
   * Store data in cache with a TTL (default 30 seconds).
   */
  set<T>(key: string, data: T, ttlMs: number = 30_000): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Get cached data if present and not yet expired.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Get cached data even if slightly expired (for Stale-While-Revalidate).
   */
  getStale<T>(key: string): { data: T; isExpired: boolean } | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    return {
      data: entry.data as T,
      isExpired,
    };
  }

  /**
   * Invalidate a specific key or all keys starting with a prefix.
   * e.g. cache.invalidate('produce_listings')
   */
  invalidate(keyOrPrefix: string): void {
    for (const key of this.store.keys()) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear entire cache.
   */
  clear(): void {
    this.store.clear();
  }
}

export const clientCache = new ClientCache();

/**
 * Helper to wrap an async fetcher with Stale-While-Revalidate caching.
 * If fresh cached data exists, returns it immediately.
 * If expired data exists, returns it and silently triggers background refresh.
 * If no cached data exists, awaits network call.
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 30_000
): Promise<T> {
  const cached = clientCache.getStale<T>(key);

  if (cached && !cached.isExpired) {
    return cached.data;
  }

  // Stale-While-Revalidate: If stale data exists, return it immediately and revalidate in background
  if (cached && cached.isExpired) {
    fetcher()
      .then((fresh) => {
        clientCache.set(key, fresh, ttlMs);
      })
      .catch((err) => {
        console.warn(`[Cache] Background revalidation failed for ${key}:`, err);
      });
    return cached.data;
  }

  // Cache miss: execute network fetch and cache result
  const freshData = await fetcher();
  clientCache.set(key, freshData, ttlMs);
  return freshData;
}
