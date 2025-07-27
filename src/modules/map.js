import L from 'leaflet';
import { CONFIG } from '../utils/constants.js';

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
            const color = this.getSegmentColor(segment.alignmentScore);
            const weight = this.getSegmentWeight(segment.highway);
            
            const polyline = L.polyline([
                [segment.start.lat, segment.start.lon],
                [segment.end.lat, segment.end.lon]
            ], {
                color: color,
                weight: weight,
                opacity: 0.8
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
        // Interpolate between low alignment (blue) and high alignment (orange)
        const r = Math.round(255 * score + 78 * (1 - score));
        const g = Math.round(107 * score + 205 * (1 - score));
        const b = Math.round(53 * score + 196 * (1 - score));
        
        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Get line weight based on highway type
     * @param {string} highway - Highway type
     * @returns {number} Line weight
     */
    getSegmentWeight(highway) {
        const weights = {
            primary: 4,
            secondary: 3,
            tertiary: 2,
            residential: 2,
            footway: 1,
            cycleway: 1,
            path: 1
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