import { MapManager } from './modules/map.js';
import { SolarCalculator } from './modules/solar.js';
import { StreetDataManager } from './modules/streets.js';
import { HeatmapManager } from './modules/heatmap.js';
import { UIManager } from './modules/ui.js';
import { CONFIG } from './utils/constants.js';

/**
 * Main application class
 */
class SunMapApp {
    constructor() {
        this.mapManager = null;
        this.solarCalculator = null;
        this.streetDataManager = null;
        this.heatmapManager = null;
        this.uiManager = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing Sun Map Application...');

            // Initialize managers
            this.mapManager = new MapManager('map');
            this.solarCalculator = new SolarCalculator();
            this.streetDataManager = new StreetDataManager();
            this.heatmapManager = new HeatmapManager();
            this.uiManager = new UIManager();

            // Initialize UI
            this.uiManager.init();

            // Initialize map
            this.mapManager.init();

            // Set up UI callbacks
            this.setupUICallbacks();

            // Set up map callbacks
            this.setupMapCallbacks();

            this.isInitialized = true;
            console.log('Application initialized successfully');

            // Show initial info
            this.uiManager.showInfo('Select a date and time, then click "Update Map" to see street alignments');

        } catch (error) {
            console.error('Failed to initialize application:', error);
            if (this.uiManager) {
                this.uiManager.showError('Failed to initialize application. Please refresh the page.');
            }
        }
    }

    /**
     * Set up UI event callbacks
     */
    setupUICallbacks() {
        this.uiManager.setCallbacks({
            onUpdate: (data) => this.handleMapUpdate(data),
            onDateChange: (data) => this.handleDateChange(data),
            onTimeToggleChange: (data) => this.handleTimeToggleChange(data)
        });
    }

    /**
     * Set up map event callbacks
     */
    setupMapCallbacks() {
        this.mapManager.onBoundsChange((bounds) => {
            this.handleBoundsChange(bounds);
        });
    }

    /**
     * Handle map update request
     * @param {Object} data - Form data {date, isSunrise}
     */
    async handleMapUpdate(data) {
        try {
            console.log('Updating map with data:', data);

            const center = this.mapManager.getCenter();
            const bounds = this.mapManager.getBounds();

            // Check if bounds are too large
            if (this.streetDataManager.areBoundsTooLarge(bounds)) {
                this.uiManager.showError('Map area too large. Please zoom in closer.');
                this.uiManager.setLoadingState(false);
                return;
            }

            // Calculate sun azimuth
            const sunAzimuth = this.solarCalculator.getSunAzimuth(
                data.date, 
                center.lat, 
                center.lng, 
                data.isSunrise
            );

            console.log(`Sun azimuth: ${sunAzimuth.toFixed(1)}°`);

            // Fetch street data
            const segments = await this.streetDataManager.fetchStreetData(bounds);
            
            if (segments.length === 0) {
                this.uiManager.showInfo('No street data found in this area');
                this.uiManager.setLoadingState(false);
                return;
            }

            // Calculate alignment scores
            const alignedSegments = this.heatmapManager.calculateAlignmentScores(segments, sunAzimuth);

            // Update map visualization
            this.mapManager.clearStreets();
            this.mapManager.addStreetSegments(alignedSegments);

            // Update UI with statistics
            const stats = this.heatmapManager.getAlignmentStats(alignedSegments);
            this.uiManager.updateLegend(stats);

            // Show completion message
            this.uiManager.showInfo(`Analyzed ${alignedSegments.length} street segments`);

            console.log('Map update completed:', stats);

        } catch (error) {
            console.error('Error updating map:', error);
            this.uiManager.showError('Failed to update map. Please try again.');
        } finally {
            this.uiManager.setLoadingState(false);
        }
    }

    /**
     * Handle date change
     * @param {Object} data - Form data
     */
    handleDateChange(data) {
        console.log('Date changed:', data.date);
        // Could trigger automatic update here if desired
    }

    /**
     * Handle time toggle change
     * @param {Object} data - Form data
     */
    handleTimeToggleChange(data) {
        console.log('Time toggle changed:', data.isSunrise ? 'sunrise' : 'sunset');
        // Could trigger automatic update here if desired
    }

    /**
     * Handle map bounds change
     * @param {Object} bounds - New map bounds
     */
    handleBoundsChange(bounds) {
        console.log('Map bounds changed:', bounds);
        
        // Check if user needs to zoom in
        if (this.streetDataManager.areBoundsTooLarge(bounds)) {
            this.uiManager.showInfo('Zoom in closer for better performance', 2000);
        }
    }

    /**
     * Get current application state
     * @returns {Object} Application state
     */
    getState() {
        if (!this.isInitialized) {
            return { initialized: false };
        }

        return {
            initialized: true,
            ui: this.uiManager.getState(),
            map: {
                center: this.mapManager.getCenter(),
                bounds: this.mapManager.getBounds()
            },
            cache: {
                streets: this.streetDataManager.getCacheStats(),
                calculations: this.heatmapManager.getCacheStats(),
                solar: this.solarCalculator.getCacheStats()
            }
        };
    }

    /**
     * Destroy the application and clean up resources
     */
    destroy() {
        if (this.mapManager) {
            this.mapManager.destroy();
        }
        
        if (this.uiManager) {
            this.uiManager.destroy();
        }

        if (this.streetDataManager) {
            this.streetDataManager.cancelRequest();
        }

        console.log('Application destroyed');
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.sunMapApp = new SunMapApp();
        await window.sunMapApp.init();
    } catch (error) {
        console.error('Failed to start application:', error);
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.sunMapApp) {
        window.sunMapApp.destroy();
    }
});

// Export for debugging
export { SunMapApp };