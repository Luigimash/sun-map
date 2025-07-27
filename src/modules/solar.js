import SunCalc from 'suncalc';

/**
 * Solar calculation utilities using SunCalc.js
 */
export class SolarCalculator {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Get sun azimuth for given date, time, and location
     * @param {Date} date - Target date
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {boolean} isSunrise - True for sunrise, false for sunset
     * @returns {number} Sun azimuth in degrees (0-360)
     */
    getSunAzimuth(date, lat, lng, isSunrise = true) {
        const cacheKey = `${date.toDateString()}_${lat.toFixed(4)}_${lng.toFixed(4)}_${isSunrise}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Get sun times for the date and location
            const times = SunCalc.getTimes(date, lat, lng);
            const targetTime = isSunrise ? times.sunrise : times.sunset;

            if (!targetTime || isNaN(targetTime.getTime())) {
                console.warn('Invalid sun time calculated, using noon as fallback');
                const noon = new Date(date);
                noon.setHours(12, 0, 0, 0);
                const position = SunCalc.getPosition(noon, lat, lng);
                return this.normalizeAzimuth(position.azimuth);
            }

            // Get sun position at target time
            const position = SunCalc.getPosition(targetTime, lat, lng);
            const azimuth = this.normalizeAzimuth(position.azimuth);

            // Cache the result
            this.cache.set(cacheKey, azimuth);

            return azimuth;
        } catch (error) {
            console.error('Error calculating sun azimuth:', error);
            return 180; // Default to south
        }
    }

    /**
     * Get sun times for a given date and location
     * @param {Date} date - Target date
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Object} Sun times object
     */
    getSunTimes(date, lat, lng) {
        try {
            return SunCalc.getTimes(date, lat, lng);
        } catch (error) {
            console.error('Error calculating sun times:', error);
            return null;
        }
    }

    /**
     * Convert SunCalc azimuth (radians, south-based) to degrees (north-based)
     * @param {number} azimuth - Azimuth in radians from SunCalc
     * @returns {number} Azimuth in degrees (0-360, north-based)
     */
    normalizeAzimuth(azimuth) {
        // SunCalc returns azimuth in radians, measured from south
        // Convert to degrees and adjust to be measured from north
        let degrees = azimuth * (180 / Math.PI);
        degrees = degrees + 180; // Convert from south-based to north-based
        
        // Ensure 0-360 range
        while (degrees < 0) degrees += 360;
        while (degrees >= 360) degrees -= 360;
        
        return degrees;
    }

    /**
     * Get current sun position for real-time display
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Object} Current sun position
     */
    getCurrentSunPosition(lat, lng) {
        const now = new Date();
        try {
            const position = SunCalc.getPosition(now, lat, lng);
            return {
                azimuth: this.normalizeAzimuth(position.azimuth),
                altitude: position.altitude * (180 / Math.PI), // Convert to degrees
                time: now
            };
        } catch (error) {
            console.error('Error getting current sun position:', error);
            return null;
        }
    }

    /**
     * Check if the sun is currently above horizon
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {boolean} True if sun is above horizon
     */
    isSunAboveHorizon(lat, lng) {
        const position = this.getCurrentSunPosition(lat, lng);
        return position && position.altitude > 0;
    }

    /**
     * Format time for display
     * @param {Date} time - Time to format
     * @returns {string} Formatted time string
     */
    formatTime(time) {
        if (!time || isNaN(time.getTime())) {
            return 'N/A';
        }
        
        return time.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    }

    /**
     * Clear calculation cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}