/**
 * Simple In-Memory Cache Utility
 * For production, use Redis instead
 */
class Cache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * Set cache value with TTL
   */
  set(key, value, ttl = 3600) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Store value
    this.cache.set(key, value);

    // Set expiration timer
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttl * 1000);

    this.timers.set(key, timer);
  }

  /**
   * Get cache value
   */
  get(key) {
    return this.cache.get(key) || null;
  }

  /**
   * Check if key exists
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Delete cache value
   */
  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Get cache size
   */
  size() {
    return this.cache.size;
  }

  /**
   * Cache middleware
   */
  middleware(ttl = 3600) {
    return (req, res, next) => {
      const key = `${req.method}:${req.originalUrl}`;
      
      // Check if cached
      if (req.method === 'GET' && this.has(key)) {
        return res.json(this.get(key));
      }

      // Override res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = function (data) {
        if (req.method === 'GET' && res.statusCode === 200) {
          Cache.set(key, data, ttl);
        }
        return originalJson(data);
      };

      next();
    };
  }
}

module.exports = new Cache();
