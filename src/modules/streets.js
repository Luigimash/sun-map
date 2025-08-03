import { CONFIG, OVERPASS_QUERY_TEMPLATE } from '../utils/constants.js';
import { processStreetSegments, batchStraightSegments } from '../utils/geometry.js';
import { streetCache } from '../utils/cache.js';

/**
 * Street data fetching and processing
 */
export class StreetDataManager {
    constructor() {
        this.isLoading = false;
        this.abortController = null;
    }

    /**
     * Fetch street data for given bounds
     * @param {Object} bounds - Map bounds {north, south, east, west}
     * @returns {Promise<Array>} Array of street segments
     */
    async fetchStreetData(bounds) {
        const cacheKey = streetCache.getBoundsKey(bounds);
        
        // Check cache first
        if (streetCache.has(cacheKey)) {
            console.log('Using cached street data');
            return streetCache.get(cacheKey);
        }

        // Cancel any ongoing request
        if (this.abortController) {
            this.abortController.abort();
        }

        this.abortController = new AbortController();
        this.isLoading = true;

        try {
            console.log('Fetching street data from Overpass API...');
            
            const query = this.buildOverpassQuery(bounds);
            const response = await fetch(CONFIG.api.overpassUrl, {
                method: 'POST',
                body: query,
                headers: {
                    'Content-Type': 'text/plain'
                },
                signal: this.abortController.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`Received ${data.elements?.length || 0} ways from Overpass API`);

            // Process the OSM data into street segments
            const segments = this.processOsmData(data);
            
            // Cache the results
            streetCache.set(cacheKey, segments);
            
            return segments;

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Street data request was cancelled');
                return [];
            }
            
            console.error('Error fetching street data:', error);
            
            // Try to return cached data as fallback
            const fallbackData = streetCache.get(cacheKey);
            if (fallbackData) {
                console.log('Using fallback cached data');
                return fallbackData;
            }
            
            throw error;
        } finally {
            this.isLoading = false;
            this.abortController = null;
        }
    }

    /**
     * Build Overpass API query string
     * @param {Object} bounds - Map bounds
     * @returns {string} Overpass query
     */
    buildOverpassQuery(bounds) {
        return OVERPASS_QUERY_TEMPLATE
            .replace('{south}', bounds.south)
            .replace('{west}', bounds.west)
            .replace('{north}', bounds.north)
            .replace('{east}', bounds.east);
    }

    /**
     * Process OSM data into batched street segments
     * @param {Object} osmData - Raw OSM data from Overpass API
     * @returns {Array} Array of batched street segments
     */
    processOsmData(osmData) {
        if (!osmData.elements || !Array.isArray(osmData.elements)) {
            console.warn('Invalid OSM data received');
            return [];
        }

        const batchedSegments = [];
        let totalOriginalSegments = 0;
        
        osmData.elements.forEach(element => {
            if (element.type === 'way' && element.geometry) {
                try {
                    // Process way into individual segments
                    const waySegments = processStreetSegments(element);
                    totalOriginalSegments += waySegments.length;
                    
                    // Batch segments into straight sections
                    const batched = batchStraightSegments(waySegments, CONFIG.streets.batching);
                    batchedSegments.push(...batched);
                } catch (error) {
                    console.warn('Error processing OSM way:', element.id, error);
                }
            }
        });

        console.log(`Processed ${totalOriginalSegments} original segments into ${batchedSegments.length} batched segments`);
        console.log(`Filtering applied: min length ${CONFIG.streets.batching.minBatchLength}m, require batching: ${CONFIG.streets.batching.requireBatching}`);
        
        return batchedSegments;
    }

    /**
     * Filter segments by highway type
     * @param {Array} segments - Street segments
     * @param {Array} allowedTypes - Allowed highway types
     * @returns {Array} Filtered segments
     */
    filterSegmentsByType(segments, allowedTypes = CONFIG.streets.includedTypes) {
        return segments.filter(segment => {
            const highway = segment.highway;
            return highway && allowedTypes.includes(highway);
        });
    }

    /**
     * Get loading status
     * @returns {boolean} True if currently loading
     */
    isLoadingData() {
        return this.isLoading;
    }

    /**
     * Cancel any ongoing request
     */
    cancelRequest() {
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    /**
     * Estimate bounds area in square kilometers
     * @param {Object} bounds - Map bounds
     * @returns {number} Area in square kilometers
     */
    estimateBoundsArea(bounds) {
        const latDiff = bounds.north - bounds.south;
        const lngDiff = bounds.east - bounds.west;
        
        // Rough approximation (not accounting for projection distortion)
        const latKm = latDiff * 111; // ~111 km per degree latitude
        const lngKm = lngDiff * 111 * Math.cos(((bounds.north + bounds.south) / 2) * Math.PI / 180);
        
        return Math.abs(latKm * lngKm);
    }

    /**
     * Check if bounds are too large for efficient processing
     * @param {Object} bounds - Map bounds
     * @returns {boolean} True if bounds are too large
     */
    areBoundsTooLarge(bounds) {
        const area = this.estimateBoundsArea(bounds);
        return area > 10000; // 10,000 km² threshold
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        return streetCache.getStats();
    }
}