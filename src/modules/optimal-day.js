import { SolarCalculator } from './solar.js';
import { calculateStreetAlignment } from '../utils/geometry.js';

/**
 * Calculate optimal days for street solar alignment
 */
export class OptimalDayCalculator {
    constructor() {
        this.solarCalculator = new SolarCalculator();
        this.cache = new Map();
    }

    /**
     * Find the optimal day(s) of the year for street alignment
     * @param {number} streetBearing - Street bearing in degrees
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {number} year - Year to search (defaults to current year)
     * @param {boolean} includeSunrise - Include sunrise calculations
     * @param {boolean} includeSunset - Include sunset calculations
     * @returns {Promise<Object>} Optimal day results
     */
    async findOptimalDay(streetBearing, lat, lng, year = null, includeSunrise = true, includeSunset = true) {
        const searchYear = year || new Date().getFullYear();
        const cacheKey = `${streetBearing.toFixed(4)}_${lat.toFixed(6)}_${lng.toFixed(6)}_${searchYear}_${includeSunrise}_${includeSunset}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const results = [];
        const daysInYear = this.isLeapYear(searchYear) ? 366 : 365;
        
        // Calculate alignment for each day of the year
        for (let dayOfYear = 1; dayOfYear <= daysInYear; dayOfYear++) {
            const date = this.dayOfYearToDate(dayOfYear, searchYear);
            
            const dayResults = {
                date: date,
                dayOfYear: dayOfYear,
                alignments: []
            };

            // Calculate sunrise alignment if requested
            if (includeSunrise) {
                try {
                    const sunriseAzimuth = this.solarCalculator.getSunAzimuth(date, lat, lng, true);
                    const sunriseAlignment = calculateStreetAlignment(streetBearing, sunriseAzimuth);
                    
                    dayResults.alignments.push({
                        type: 'sunrise',
                        sunAzimuth: sunriseAzimuth,
                        alignmentScore: sunriseAlignment
                    });
                } catch (error) {
                    console.warn(`Error calculating sunrise for day ${dayOfYear}:`, error);
                }
            }

            // Calculate sunset alignment if requested
            if (includeSunset) {
                try {
                    const sunsetAzimuth = this.solarCalculator.getSunAzimuth(date, lat, lng, false);
                    const sunsetAlignment = calculateStreetAlignment(streetBearing, sunsetAzimuth);
                    
                    dayResults.alignments.push({
                        type: 'sunset',
                        sunAzimuth: sunsetAzimuth,
                        alignmentScore: sunsetAlignment
                    });
                } catch (error) {
                    console.warn(`Error calculating sunset for day ${dayOfYear}:`, error);
                }
            }

            // Find best alignment for this day
            if (dayResults.alignments.length > 0) {
                const bestAlignment = dayResults.alignments.reduce((best, current) => 
                    current.alignmentScore > best.alignmentScore ? current : best
                );
                dayResults.bestAlignment = bestAlignment;
                results.push(dayResults);
            }

            // Yield control periodically to prevent UI blocking
            if (dayOfYear % 30 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        // Find local maxima (peaks) instead of just highest scores
        const localMaxima = this.findLocalMaxima(results);
        
        const optimalResult = {
            streetBearing,
            year: searchYear,
            searchParams: { includeSunrise, includeSunset },
            bestDay: localMaxima[0] || null,
            topDays: localMaxima.slice(0, 5),
            averageAlignment: this.calculateAverageAlignment(results),
            statistics: this.calculateStatistics(results),
            totalLocalMaxima: localMaxima.length
        };

        // Cache the result
        this.cache.set(cacheKey, optimalResult);
        
        return optimalResult;
    }

    /**
     * Find optimal day with progress callback
     * @param {number} streetBearing - Street bearing in degrees
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {Function} progressCallback - Called with progress percentage
     * @param {Object} options - Search options
     * @returns {Promise<Object>} Optimal day results
     */
    async findOptimalDayWithProgress(streetBearing, lat, lng, progressCallback, options = {}) {
        const {
            year = new Date().getFullYear(),
            includeSunrise = true,
            includeSunset = true
        } = options;

        const results = [];
        const daysInYear = this.isLeapYear(year) ? 366 : 365;
        
        for (let dayOfYear = 1; dayOfYear <= daysInYear; dayOfYear++) {
            const date = this.dayOfYearToDate(dayOfYear, year);
            
            const dayResults = {
                date: date,
                dayOfYear: dayOfYear,
                alignments: []
            };

            if (includeSunrise) {
                try {
                    const sunriseAzimuth = this.solarCalculator.getSunAzimuth(date, lat, lng, true);
                    const sunriseAlignment = calculateStreetAlignment(streetBearing, sunriseAzimuth);
                    
                    dayResults.alignments.push({
                        type: 'sunrise',
                        sunAzimuth: sunriseAzimuth,
                        alignmentScore: sunriseAlignment
                    });
                } catch (error) {
                    console.warn(`Error calculating sunrise for day ${dayOfYear}:`, error);
                }
            }

            if (includeSunset) {
                try {
                    const sunsetAzimuth = this.solarCalculator.getSunAzimuth(date, lat, lng, false);
                    const sunsetAlignment = calculateStreetAlignment(streetBearing, sunsetAzimuth);
                    
                    dayResults.alignments.push({
                        type: 'sunset',
                        sunAzimuth: sunsetAzimuth,
                        alignmentScore: sunsetAlignment
                    });
                } catch (error) {
                    console.warn(`Error calculating sunset for day ${dayOfYear}:`, error);
                }
            }

            if (dayResults.alignments.length > 0) {
                const bestAlignment = dayResults.alignments.reduce((best, current) => 
                    current.alignmentScore > best.alignmentScore ? current : best
                );
                dayResults.bestAlignment = bestAlignment;
                results.push(dayResults);
            }

            // Report progress
            if (progressCallback && dayOfYear % 10 === 0) {
                const progress = (dayOfYear / daysInYear) * 100;
                progressCallback(progress);
            }

            // Yield control periodically
            if (dayOfYear % 20 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        progressCallback && progressCallback(100);

        const localMaxima = this.findLocalMaxima(results);
        
        return {
            streetBearing,
            year,
            searchParams: { includeSunrise, includeSunset },
            bestDay: localMaxima[0] || null,
            topDays: localMaxima.slice(0, 5),
            averageAlignment: this.calculateAverageAlignment(results),
            statistics: this.calculateStatistics(results),
            totalLocalMaxima: localMaxima.length
        };
    }

    /**
     * Find local maxima in the alignment scores
     * @param {Array} results - Day results with alignment scores
     * @returns {Array} Array of local maxima sorted by alignment score (highest first)
     */
    findLocalMaxima(results) {
        if (!results || results.length < 3) {
            // Need at least 3 points to find a local maximum
            return results.sort((a, b) => b.bestAlignment.alignmentScore - a.bestAlignment.alignmentScore);
        }

        // Sort results by day of year to ensure chronological order
        const sortedByDay = results.sort((a, b) => a.dayOfYear - b.dayOfYear);
        const localMaxima = [];

        for (let i = 1; i < sortedByDay.length - 1; i++) {
            const prev = sortedByDay[i - 1];
            const current = sortedByDay[i];
            const next = sortedByDay[i + 1];

            const prevScore = prev.bestAlignment.alignmentScore;
            const currentScore = current.bestAlignment.alignmentScore;
            const nextScore = next.bestAlignment.alignmentScore;

            // Check if current day is a local maximum
            // (higher than both neighbors)
            if (currentScore > prevScore && currentScore > nextScore) {
                localMaxima.push(current);
            }
        }

        // Handle edge cases for first and last days
        // First day is a local maximum if it's higher than the second day
        if (sortedByDay.length >= 2) {
            const first = sortedByDay[0];
            const second = sortedByDay[1];
            if (first.bestAlignment.alignmentScore > second.bestAlignment.alignmentScore) {
                localMaxima.push(first);
            }
        }

        // Last day is a local maximum if it's higher than the second-to-last day
        if (sortedByDay.length >= 2) {
            const last = sortedByDay[sortedByDay.length - 1];
            const secondLast = sortedByDay[sortedByDay.length - 2];
            if (last.bestAlignment.alignmentScore > secondLast.bestAlignment.alignmentScore) {
                localMaxima.push(last);
            }
        }

        // Sort local maxima by alignment score (highest first)
        return localMaxima.sort((a, b) => b.bestAlignment.alignmentScore - a.bestAlignment.alignmentScore);
    }

    /**
     * Convert day of year to Date object
     * @param {number} dayOfYear - Day of year (1-366)
     * @param {number} year - Year
     * @returns {Date} Date object
     */
    dayOfYearToDate(dayOfYear, year) {
        const date = new Date(year, 0, dayOfYear);
        return date;
    }

    /**
     * Check if year is leap year
     * @param {number} year - Year to check
     * @returns {boolean} True if leap year
     */
    isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }

    /**
     * Calculate average alignment score
     * @param {Array} results - Day results
     * @returns {number} Average alignment score
     */
    calculateAverageAlignment(results) {
        if (!results.length) return 0;
        
        const totalScore = results.reduce((sum, day) => sum + day.bestAlignment.alignmentScore, 0);
        return totalScore / results.length;
    }

    /**
     * Calculate statistics for alignment results
     * @param {Array} results - Day results
     * @returns {Object} Statistics
     */
    calculateStatistics(results) {
        if (!results.length) {
            return {
                totalDays: 0,
                excellent: 0,
                good: 0,
                fair: 0,
                poor: 0
            };
        }

        const stats = {
            totalDays: results.length,
            excellent: 0, // >= 0.9
            good: 0,      // >= 0.7
            fair: 0,      // >= 0.5
            poor: 0       // < 0.5
        };

        results.forEach(day => {
            const score = day.bestAlignment.alignmentScore;
            if (score >= 0.9) stats.excellent++;
            else if (score >= 0.7) stats.good++;
            else if (score >= 0.5) stats.fair++;
            else stats.poor++;
        });

        return stats;
    }

    /**
     * Format date for display
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        return date.toLocaleDateString([], {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Format alignment score as percentage
     * @param {number} score - Alignment score (0-1)
     * @returns {string} Formatted percentage
     */
    formatAlignmentScore(score) {
        return `${(score * 100).toFixed(2)}%`;
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