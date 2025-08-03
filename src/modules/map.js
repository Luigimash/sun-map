import L from 'leaflet';
import { CONFIG } from '../utils/constants.js';
import { interpolateColorHsl, interpolateOpacityBezier } from '../utils/colors.js';

/**
 * Initialize and manage the Leaflet map
 */
export class MapManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.streetLayer = null;
        this.onBoundsChangeCallback = null;
        this.debounceTimeout = null;
    }

    /**
     * Initialize the map
     */
    init() {
        // Initialize map
        this.map = L.map(this.containerId, {
            center: CONFIG.map.defaultCenter,
            zoom: CONFIG.map.defaultZoom,
            minZoom: CONFIG.map.minZoom,
            maxZoom: CONFIG.map.maxZoom
        });

        // Add OSM tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: CONFIG.map.maxZoom
        }).addTo(this.map);

        // Initialize street layer group
        this.streetLayer = L.layerGroup().addTo(this.map);

        // Set up event listeners
        this.setupEventListeners();

        return this.map;
    }

    /**
     * Set up map event listeners
     */
    setupEventListeners() {
        // Debounced bounds change handler
        this.map.on('moveend zoomend', () => {
            if (this.debounceTimeout) {
                clearTimeout(this.debounceTimeout);
            }
            
            this.debounceTimeout = setTimeout(() => {
                if (this.onBoundsChangeCallback) {
                    const bounds = this.getBounds();
                    this.onBoundsChangeCallback(bounds);
                }
            }, CONFIG.api.debounceDelay);
        });
    }

    /**
     * Get current map bounds
     * @returns {Object} Bounds object
     */
    getBounds() {
        const bounds = this.map.getBounds();
        return {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
        };
    }

    /**
     * Set bounds change callback
     * @param {Function} callback
     */
    onBoundsChange(callback) {
        this.onBoundsChangeCallback = callback;
    }

    /**
     * Clear all street segments from the map
     */
    clearStreets() {
        this.streetLayer.clearLayers();
    }

    /**
     * Add street segments to the map
     * @param {Array} segments - Array of street segments with alignment scores
     */
    addStreetSegments(segments) {
        segments.forEach(segment => {
            // Filter by minimum score threshold
            if (segment.alignmentScore < CONFIG.gradient.minScore) {
                return;
            }

            const color = this.getSegmentColor(segment.alignmentScore);
            const opacity = this.getSegmentOpacity(segment.alignmentScore);
            const weight = this.getSegmentWeight(segment.highway);
            
            const polyline = L.polyline([
                [segment.start.lat, segment.start.lon],
                [segment.end.lat, segment.end.lon]
            ], {
                color: color,
                weight: weight,
                opacity: opacity
            });

            // Add popup with segment info
            polyline.bindPopup(`
                <strong>Street Segment</strong><br>
                Type: ${segment.highway || 'unknown'}<br>
                Bearing: ${segment.bearing.toFixed(1)}°<br>
                Alignment: ${(segment.alignmentScore * 100).toFixed(1)}%
            `);

            this.streetLayer.addLayer(polyline);
        });
    }

    /**
     * Get color for segment based on alignment score
     * @param {number} score - Alignment score (0-1)
     * @returns {string} Hex color
     */
    getSegmentColor(score) {
        // Normalize score to the configured range
        const normalizedScore = (score - CONFIG.gradient.minScore) / 
                               (CONFIG.gradient.maxScore - CONFIG.gradient.minScore);
        const clampedScore = Math.max(0, Math.min(1, normalizedScore));
        
        return interpolateColorHsl(
            CONFIG.gradient.lowAlignment,
            CONFIG.gradient.highAlignment,
            clampedScore
        );
    }

    /**
     * Get opacity for segment based on alignment score using bezier curve
     * @param {number} score - Alignment score (0-1)
     * @returns {number} Opacity (0-1)
     */
    getSegmentOpacity(score) {
        return interpolateOpacityBezier(score, CONFIG.gradient.opacityBezier);
    }

    /**
     * Get line weight based on highway type
     * @param {string} highway - Highway type
     * @returns {number} Line weight
     */
    getSegmentWeight(highway) {
        const weights = {
            primary: 5,
            secondary: 5,
            tertiary: 5,
            residential: 5,
            footway: 5,
            cycleway: 5,
            path: 5
        };
        
        return weights[highway] || 2;
    }

    /**
     * Get map center coordinates
     * @returns {Object} {lat, lng}
     */
    getCenter() {
        const center = this.map.getCenter();
        return {
            lat: center.lat,
            lng: center.lng
        };
    }

    /**
     * Set map view to specific coordinates
     * @param {number} lat
     * @param {number} lng
     * @param {number} zoom
     */
    setView(lat, lng, zoom = null) {
        const zoomLevel = zoom || this.map.getZoom();
        this.map.setView([lat, lng], zoomLevel);
    }

    /**
     * Destroy the map instance
     */
    destroy() {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
}