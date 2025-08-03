import { CONFIG } from '../utils/constants.js';
import { generateHslGradient } from '../utils/colors.js';

/**
 * UI component management and user interactions
 */
export class UIManager {
    constructor() {
        this.elements = {};
        this.callbacks = {};
        this.isInitialized = false;
    }

    /**
     * Initialize UI components
     */
    init() {
        if (this.isInitialized) return;

        // Get DOM elements
        this.elements = {
            datePicker: document.getElementById('date-picker'),
            timeToggle: document.getElementById('time-toggle'),
            updateButton: document.getElementById('update-map'),
            map: document.getElementById('map')
        };

        // Validate required elements
        if (!this.validateElements()) {
            throw new Error('Required UI elements not found');
        }

        // Set default values
        this.setDefaultValues();

        // Set up event listeners
        this.setupEventListeners();

        // Initialize legend gradient
        this.initializeLegendGradient();

        this.isInitialized = true;
        console.log('UI Manager initialized');
    }

    /**
     * Validate that all required DOM elements exist
     * @returns {boolean} True if all elements found
     */
    validateElements() {
        const required = ['datePicker', 'timeToggle', 'updateButton', 'map'];
        const missing = required.filter(key => !this.elements[key]);
        
        if (missing.length > 0) {
            console.error('Missing required UI elements:', missing);
            return false;
        }
        
        return true;
    }

    /**
     * Set default values for UI controls
     */
    setDefaultValues() {
        // Set date picker to today
        const today = new Date();
        this.elements.datePicker.value = today.toISOString().split('T')[0];
        
        // Set default to sunrise
        this.elements.timeToggle.value = 'sunrise';
    }

    /**
     * Set up event listeners for UI controls
     */
    setupEventListeners() {
        // Update button click
        this.elements.updateButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleUpdateClick();
        });

        // Date picker change
        this.elements.datePicker.addEventListener('change', () => {
            this.handleDateChange();
        });

        // Time toggle change
        this.elements.timeToggle.addEventListener('change', () => {
            this.handleTimeToggleChange();
        });

        // Enter key on date picker
        this.elements.datePicker.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleUpdateClick();
            }
        });
    }

    /**
     * Handle update button click
     */
    handleUpdateClick() {
        const data = this.getFormData();
        
        if (this.callbacks.onUpdate) {
            this.setLoadingState(true);
            this.callbacks.onUpdate(data);
        }
    }

    /**
     * Handle date picker change
     */
    handleDateChange() {
        if (this.callbacks.onDateChange) {
            const data = this.getFormData();
            this.callbacks.onDateChange(data);
        }
    }

    /**
     * Handle time toggle change
     */
    handleTimeToggleChange() {
        if (this.callbacks.onTimeToggleChange) {
            const data = this.getFormData();
            this.callbacks.onTimeToggleChange(data);
        }
    }

    /**
     * Get current form data
     * @returns {Object} Form data
     */
    getFormData() {
        return {
            date: new Date(this.elements.datePicker.value),
            isSunrise: this.elements.timeToggle.value === 'sunrise'
        };
    }

    /**
     * Set form data
     * @param {Object} data - Form data
     */
    setFormData(data) {
        if (data.date instanceof Date) {
            this.elements.datePicker.value = data.date.toISOString().split('T')[0];
        }
        
        if (typeof data.isSunrise === 'boolean') {
            this.elements.timeToggle.value = data.isSunrise ? 'sunrise' : 'sunset';
        }
    }

    /**
     * Set loading state for UI
     * @param {boolean} loading - Loading state
     */
    setLoadingState(loading) {
        this.elements.updateButton.disabled = loading;
        this.elements.updateButton.textContent = loading ? 'Loading...' : 'Update Map';
        
        if (loading) {
            this.elements.updateButton.classList.add('loading');
        } else {
            this.elements.updateButton.classList.remove('loading');
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        // Create or update error element
        let errorElement = document.querySelector('.error-message');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ff4444;
                color: white;
                padding: 1rem;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 10000;
                max-width: 300px;
            `;
            document.body.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    /**
     * Hide error message
     */
    hideError() {
        const errorElement = document.querySelector('.error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    /**
     * Show info message
     * @param {string} message - Info message
     * @param {number} duration - Display duration in ms
     */
    showInfo(message, duration = 3000) {
        let infoElement = document.querySelector('.info-message');
        
        if (!infoElement) {
            infoElement = document.createElement('div');
            infoElement.className = 'info-message';
            infoElement.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #2196F3;
                color: white;
                padding: 0.75rem 1rem;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 10000;
                font-size: 0.875rem;
            `;
            document.body.appendChild(infoElement);
        }
        
        infoElement.textContent = message;
        infoElement.style.display = 'block';
        
        // Auto-hide
        setTimeout(() => {
            if (infoElement) {
                infoElement.style.display = 'none';
            }
        }, duration);
    }

    /**
     * Initialize legend gradient with HSL-based colors
     */
    initializeLegendGradient() {
        const legendBar = document.querySelector('.legend-bar');
        if (legendBar) {
            const gradient = generateHslGradient(
                CONFIG.gradient.highAlignment,
                CONFIG.gradient.lowAlignment,
                20 // More steps for smoother gradient
            );
            legendBar.style.background = gradient;
        }
    }

    /**
     * Update legend with current statistics
     * @param {Object} stats - Alignment statistics
     */
    updateLegend(stats) {
        const legend = document.querySelector('.legend');
        if (!legend) return;

        // Add statistics display
        let statsElement = legend.querySelector('.legend-stats');
        if (!statsElement) {
            statsElement = document.createElement('div');
            statsElement.className = 'legend-stats';
            statsElement.style.cssText = `
                margin-top: 0.5rem;
                font-size: 0.75rem;
                color: #666;
            `;
            legend.appendChild(statsElement);
        }

        if (stats && stats.total > 0) {
            statsElement.innerHTML = `
                <div>Total segments: ${stats.total}</div>
                <div>Average alignment: ${(stats.averageScore * 100).toFixed(2)}%</div>
                <div>Perfect alignments: ${stats.perfectAlignments}</div>
            `;
        } else {
            statsElement.innerHTML = '<div>No data available</div>';
        }
    }

    /**
     * Set callback functions
     * @param {Object} callbacks - Callback functions
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Get current UI state
     * @returns {Object} UI state
     */
    getState() {
        return {
            formData: this.getFormData(),
            isLoading: this.elements.updateButton.disabled
        };
    }

    /**
     * Disable/enable UI controls
     * @param {boolean} disabled - Disabled state
     */
    setDisabled(disabled) {
        this.elements.datePicker.disabled = disabled;
        this.elements.timeToggle.disabled = disabled;
        this.elements.updateButton.disabled = disabled;
    }

    /**
     * Destroy UI manager and clean up
     */
    destroy() {
        // Remove event listeners
        if (this.isInitialized) {
            Object.values(this.elements).forEach(element => {
                if (element && element.removeEventListener) {
                    // Clone node to remove all event listeners
                    const clone = element.cloneNode(true);
                    element.parentNode.replaceChild(clone, element);
                }
            });
        }

        // Clear references
        this.elements = {};
        this.callbacks = {};
        this.isInitialized = false;
    }
}