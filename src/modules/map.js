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

            // Add popup with segment info and optimal day functionality
            const popupContent = this.createPopupContent(segment);
            const popup = polyline.bindPopup(popupContent);
            
            // Set up popup event handlers after popup opens
            polyline.on('popupopen', (e) => {
                // Small delay to ensure DOM is ready
                setTimeout(() => {
                    this.handlePopupOpen(segment, e.popup);
                }, 50);
            });

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
     * Create popup content HTML for street segment
     * @param {Object} segment - Street segment data
     * @returns {string} HTML content for popup
     */
    createPopupContent(segment) {
        const segmentId = `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return `
            <div class="street-popup" data-segment-id="${segmentId}">
                <div class="segment-info">
                    <strong>Street Segment</strong><br>
                    Type: ${segment.highway || 'unknown'}<br>
                    Bearing: ${segment.bearing.toFixed(2)}°<br>
                    Alignment: ${(segment.alignmentScore * 100).toFixed(2)}%<br>
                    Length: ${segment.length ? segment.length.toFixed(0) + 'm' : 'N/A'}
                </div>
                <div id="optimal-day-loading-${segmentId}" class="optimal-day-loading" style="display: block;">
                    <div class="loading-spinner"></div>
                    <span class="loading-text">Finding optimal days...</span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                </div>
                <div id="optimal-day-results-${segmentId}" class="optimal-day-results" style="display: none;">
                    <!-- Results will be populated here -->
                </div>
            </div>
        `;
    }

    /**
     * Handle popup opening and automatically start optimal day calculation
     * @param {Object} segment - Street segment data
     * @param {Object} popup - Leaflet popup instance
     */
    async handlePopupOpen(segment, popup) {
        const popupElement = popup.getElement();
        console.log('Popup opened, automatically calculating optimal days...');
        
        if (!popupElement) {
            console.warn('No popup element found');
            return;
        }

        const streetPopup = popupElement.querySelector('.street-popup');
        if (!streetPopup) {
            console.warn('No .street-popup element found');
            return;
        }

        const segmentId = streetPopup.dataset.segmentId;
        console.log('Segment ID:', segmentId);
        
        // Automatically start optimal day calculation
        this.calculateOptimalDaysForSegment(segment, segmentId, popup);
    }

    /**
     * Calculate optimal days for a street segment automatically
     * @param {Object} segment - Street segment data
     * @param {string} segmentId - Unique segment identifier
     * @param {Object} popup - Leaflet popup instance
     */
    async calculateOptimalDaysForSegment(segment, segmentId, popup) {
        console.log('calculateOptimalDaysForSegment called with:', { segment, segmentId, popup });
        
        if (!this.onOptimalDayCalculation) {
            console.error('No optimal day calculation callback set');
            return;
        }
        
        console.log('Optimal day calculation callback found, proceeding...');

        const loadingElement = popup.getElement().querySelector(`#optimal-day-loading-${segmentId}`);
        const resultsElement = popup.getElement().querySelector(`#optimal-day-results-${segmentId}`);
        
        // Loading is already shown, just make sure results are hidden
        if (resultsElement) resultsElement.style.display = 'none';

        // Update progress
        const progressBar = popup.getElement().querySelector(`#optimal-day-loading-${segmentId} .progress-fill`);
        const updateProgress = (progress) => {
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
        };

        try {
            // Calculate segment center for location
            const centerLat = (segment.start.lat + segment.end.lat) / 2;
            const centerLng = (segment.start.lon + segment.end.lon) / 2;

            // Call the optimal day calculation callback
            const result = await this.onOptimalDayCalculation(
                segment.bearing, 
                centerLat, 
                centerLng, 
                updateProgress
            );

            // Hide loading and show results
            if (loadingElement) loadingElement.style.display = 'none';
            if (resultsElement) {
                resultsElement.innerHTML = this.createOptimalDayResultsHTML(result, segment);
                resultsElement.style.display = 'block';
                
                // Set up result handlers
                this.setupOptimalDayResultHandlers(result, resultsElement);
            }

        } catch (error) {
            console.error('Error calculating optimal day:', error);
            
            // Show error state
            if (loadingElement) loadingElement.style.display = 'none';
            if (resultsElement) {
                resultsElement.innerHTML = `
                    <div class="optimal-day-error">
                        <strong>Error</strong><br>
                        Could not calculate optimal day. Please try again.
                    </div>
                `;
                resultsElement.style.display = 'block';
            }
        } finally {
            // No button to re-enable since we removed it
        }
    }

    /**
     * Create HTML for optimal day results
     * @param {Object} result - Optimal day calculation result
     * @param {Object} segment - Street segment data
     * @returns {string} HTML content
     */
    createOptimalDayResultsHTML(result, segment) {
        if (!result.topDays || result.topDays.length === 0) {
            return `
                <div class="optimal-day-no-results">
                    <strong>No Optimal Days Found</strong><br>
                    No local maxima with good solar alignment were found for this street.
                </div>
            `;
        }

        const totalMaxima = result.totalLocalMaxima || result.topDays.length;
        let html = `
            <div class="optimal-day-success">
                <strong>Found ${totalMaxima} Optimal Days (Local Maxima)</strong><br>
                <div class="optimal-days-list">
        `;

        // Show top 5 local maxima
        result.topDays.slice(0, 5).forEach((day, index) => {
            const formattedDate = day.date.toLocaleDateString([], {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            const alignmentScore = (day.bestAlignment.alignmentScore * 100).toFixed(2);
            const sunTime = day.bestAlignment.type;
            
            html += `
                <div class="optimal-day-item ${index === 0 ? 'best-day' : ''}">
                    <div class="optimal-day-header">
                        <strong>${index === 0 ? '🥇 ' : `${index + 1}. `}${formattedDate}</strong>
                        <span class="alignment-score">${alignmentScore}%</span>
                    </div>
                    <div class="optimal-day-details">
                        <span class="time-info">${sunTime} • ${day.bestAlignment.sunAzimuth.toFixed(2)}°</span>
                        <button class="jump-to-date-btn small" data-date="${day.date.toISOString()}" data-sunrise="${sunTime === 'sunrise'}">
                            Jump
                        </button>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Set up handlers for optimal day result elements
     * @param {Object} result - Optimal day calculation result
     * @param {HTMLElement} resultsElement - Results container element
     */
    setupOptimalDayResultHandlers(result, resultsElement) {
        const jumpToDateBtns = resultsElement.querySelectorAll('.jump-to-date-btn');
        
        jumpToDateBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const dateStr = btn.dataset.date;
                const isSunrise = btn.dataset.sunrise === 'true';
                
                if (this.onJumpToDate) {
                    this.onJumpToDate(new Date(dateStr), isSunrise);
                }
            });
        });
    }

    /**
     * Set callback for optimal day calculations
     * @param {Function} callback - Callback function
     */
    setOptimalDayCalculationCallback(callback) {
        this.onOptimalDayCalculation = callback;
    }

    /**
     * Set callback for jump to date functionality
     * @param {Function} callback - Callback function
     */
    setJumpToDateCallback(callback) {
        this.onJumpToDate = callback;
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