/**
 * Simple cache utility for storing street data and calculations
 */
class Cache {
    constructor(maxSize = 100) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }

    /**
     * Generate cache key from bounds
     * @param {Object} bounds - Map bounds object
     * @returns {string} Cache key
     */
    getBoundsKey(bounds) {
        const precision = 4; // ~11m precision
        return `${bounds.north.toFixed(precision)},${bounds.south.toFixed(precision)},${bounds.east.toFixed(precision)},${bounds.west.toFixed(precision)}`;
    }

    /**
     * Get cached data
     * @param {string} key
     * @returns {*} Cached data or null
     */
    get(key) {
        if (this.cache.has(key)) {
            const item = this.cache.get(key);
            // Move to end (LRU)
            this.cache.delete(key);
            this.cache.set(key, item);
            return item.data;
        }
        return null;
    }

    /**
     * Set cached data
     * @param {string} key
     * @param {*} data
     */
    set(key, data) {
        // Remove oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Check if key exists and is not expired
     * @param {string} key
     * @param {number} maxAge - Maximum age in milliseconds
     * @returns {boolean}
     */
    has(key, maxAge = 300000) { // 5 minutes default
        if (!this.cache.has(key)) {
            return false;
        }

        const item = this.cache.get(key);
        const isExpired = Date.now() - item.timestamp > maxAge;
        
        if (isExpired) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Clear all cached data
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Export singleton instance
export const streetCache = new Cache(50);
export const calculationCache = new Cache(100);