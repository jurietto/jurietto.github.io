/**
 * Smart API Caching and Request Deduplication
 * Prevents redundant network calls and improves perceived performance
 */

// In-memory cache for API responses
const apiCache = new Map();
const pendingRequests = new Map();

// Default TTL: 5 minutes
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * Fetch with caching and deduplication
 * @param {string} key - Cache key
 * @param {Function} fetcher - Async function to fetch data
 * @param {Object} options - { ttl, forceRefresh, staleWhileRevalidate }
 */
export async function cachedFetch(key, fetcher, options = {}) {
  const { ttl = DEFAULT_TTL, forceRefresh = false, staleWhileRevalidate = true } = options;

  // Check memory cache
  if (!forceRefresh) {
    const cached = apiCache.get(key);
    if (cached) {
      const isStale = Date.now() > cached.expiresAt;
      
      if (!isStale) {
        return cached.data;
      }
      
      // Stale-while-revalidate: return stale data, refresh in background
      if (staleWhileRevalidate) {
        refreshInBackground(key, fetcher, ttl);
        return cached.data;
      }
    }
  }

  // Deduplicate concurrent requests
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // Execute fetch
  const promise = executeFetch(key, fetcher, ttl);
  pendingRequests.set(key, promise);

  try {
    return await promise;
  } finally {
    pendingRequests.delete(key);
  }
}

/**
 * Execute fetch and cache result
 */
async function executeFetch(key, fetcher, ttl) {
  try {
    const data = await fetcher();
    
    apiCache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      cachedAt: Date.now()
    });
    
    return data;
  } catch (error) {
    // On error, return stale cache if available
    const stale = apiCache.get(key);
    if (stale) {
      console.warn(`[Cache] Using stale data for ${key} due to error:`, error);
      return stale.data;
    }
    throw error;
  }
}

/**
 * Refresh cache in background
 */
function refreshInBackground(key, fetcher, ttl) {
  if (pendingRequests.has(key)) return;
  
  const promise = executeFetch(key, fetcher, ttl);
  pendingRequests.set(key, promise);
  promise.finally(() => pendingRequests.delete(key));
}

/**
 * Invalidate specific cache entry
 */
export function invalidateCache(key) {
  apiCache.delete(key);
}

/**
 * Invalidate all cache entries matching prefix
 */
export function invalidateCachePrefix(prefix) {
  for (const key of apiCache.keys()) {
    if (key.startsWith(prefix)) {
      apiCache.delete(key);
    }
  }
}

/**
 * Clear entire cache
 */
export function clearCache() {
  apiCache.clear();
}

/**
 * Get cache stats for debugging
 */
export function getCacheStats() {
  const now = Date.now();
  let fresh = 0, stale = 0;
  
  for (const [, value] of apiCache) {
    if (now < value.expiresAt) fresh++;
    else stale++;
  }
  
  return {
    total: apiCache.size,
    fresh,
    stale,
    pending: pendingRequests.size
  };
}

// Expose for debugging
window.__apiCache = { getCacheStats, clearCache };
