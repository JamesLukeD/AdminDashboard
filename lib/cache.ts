/**
 * Simple in-process TTL cache for Google API responses.
 * Analytics/GSC data doesn't change second-by-second, so a 5-minute TTL
 * makes every second+ page visit essentially instant.
 */

interface CacheEntry<T> {
  value: T;
  expires: number;
}

// Module-level Map persists across requests within the same Node.js process.
const store = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns a cached value if still fresh, otherwise calls `fn`, caches
 * the result, and returns it.
 */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expires > Date.now()) {
    return hit.value;
  }
  const value = await fn();
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

/** Bust all cached entries, or only those whose key starts with `prefix`. */
export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
