import { calculateStreetAlignment } from '../utils/geometry.js';
import { calculationCache } from '../utils/cache.js';

/**
 * Heatmap visualization and street alignment calculation
 */
export class HeatmapManager {
    constructor() {
        this.currentSunAzimuth = null;
        this.alignmentThreshold = 0.1; // Minimum alignment score to display
    }

    /**
     * Calculate alignment scores for street segments
     * @param {Array} segments - Street segments with bearing
     * @param {number} sunAzimuth - Sun azimuth in degrees
     * @returns {Array} Segments with alignment scores
     */
    calculateAlignmentScores(segments, sunAzimuth) {
        this.currentSunAzimuth = sunAzimuth;
        
        const cacheKey = `alignment_${sunAzimuth.toFixed(4)}`;
        
        return segments.map(segment => {
            const segmentCacheKey = `${cacheKey}_${segment.bearing.toFixed(4)}`;
            
            let alignmentScore;
            if (calculationCache.has(segmentCacheKey)) {
                alignmentScore = calculationCache.get(segmentCacheKey);
            } else {
                alignmentScore = calculateStreetAlignment(segment.bearing, sunAzimuth);
                calculationCache.set(segmentCacheKey, alignmentScore);
            }

            return {
                ...segment,
                alignmentScore,
                sunAzimuth
            };
        });
    }

    /**
     * Filter segments by alignment threshold
     * @param {Array} segments - Segments with alignment scores
     * @param {number} minScore - Minimum alignment score (0-1)
     * @returns {Array} Filtered segments
     */
    filterByAlignment(segments, minScore = this.alignmentThreshold) {
        return segments.filter(segment => segment.alignmentScore >= minScore);
    }

    /**
     * Get alignment statistics
     * @param {Array} segments - Segments with alignment scores
     * @returns {Object} Statistics
     */
    getAlignmentStats(segments) {
        if (!segments.length) {
            return {
                total: 0,
                averageScore: 0,
                perfectAlignments: 0,
                goodAlignments: 0,
                poorAlignments: 0
            };
        }

        const scores = segments.map(s => s.alignmentScore);
        const total = segments.length;
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / total;
        
        const perfectAlignments = scores.filter(score => score >= 0.9).length;
        const goodAlignments = scores.filter(score => score >= 0.6 && score < 0.9).length;
        const poorAlignments = scores.filter(score => score < 0.3).length;

        return {
            total,
            averageScore,
            perfectAlignments,
            goodAlignments,
            poorAlignments,
            percentagePerfect: (perfectAlignments / total) * 100,
            percentageGood: (goodAlignments / total) * 100,
            percentagePoor: (poorAlignments / total) * 100
        };
    }

    /**
     * Group segments by alignment quality
     * @param {Array} segments - Segments with alignment scores
     * @returns {Object} Grouped segments
     */
    groupByAlignmentQuality(segments) {
        const groups = {
            perfect: [], // 0.9-1.0
            excellent: [], // 0.8-0.9
            good: [], // 0.6-0.8
            fair: [], // 0.4-0.6
            poor: [], // 0.2-0.4
            veryPoor: [] // 0-0.2
        };

        segments.forEach(segment => {
            const score = segment.alignmentScore;
            
            if (score >= 0.9) groups.perfect.push(segment);
            else if (score >= 0.8) groups.excellent.push(segment);
            else if (score >= 0.6) groups.good.push(segment);
            else if (score >= 0.4) groups.fair.push(segment);
            else if (score >= 0.2) groups.poor.push(segment);
            else groups.veryPoor.push(segment);
        });

        return groups;
    }

    /**
     * Get color interpolation between two colors
     * @param {string} color1 - First color (hex)
     * @param {string} color2 - Second color (hex)
     * @param {number} factor - Interpolation factor (0-1)
     * @returns {string} Interpolated color
     */
    interpolateColor(color1, color2, factor) {
        const hex1 = color1.replace('#', '');
        const hex2 = color2.replace('#', '');
        
        const r1 = parseInt(hex1.substr(0, 2), 16);
        const g1 = parseInt(hex1.substr(2, 2), 16);
        const b1 = parseInt(hex1.substr(4, 2), 16);
        
        const r2 = parseInt(hex2.substr(0, 2), 16);
        const g2 = parseInt(hex2.substr(2, 2), 16);
        const b2 = parseInt(hex2.substr(4, 2), 16);
        
        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    /**
     * Sort segments by alignment score
     * @param {Array} segments - Segments with alignment scores
     * @param {boolean} descending - Sort order
     * @returns {Array} Sorted segments
     */
    sortByAlignment(segments, descending = true) {
        return segments.sort((a, b) => {
            return descending ? 
                b.alignmentScore - a.alignmentScore : 
                a.alignmentScore - b.alignmentScore;
        });
    }

    /**
     * Find best aligned streets in area
     * @param {Array} segments - Segments with alignment scores
     * @param {number} topN - Number of top segments to return
     * @returns {Array} Top aligned segments
     */
    findBestAlignedStreets(segments, topN = 10) {
        const sorted = this.sortByAlignment(segments, true);
        return sorted.slice(0, topN);
    }

    /**
     * Calculate alignment distribution
     * @param {Array} segments - Segments with alignment scores
     * @param {number} bins - Number of bins for distribution
     * @returns {Array} Distribution data
     */
    getAlignmentDistribution(segments, bins = 10) {
        const distribution = new Array(bins).fill(0);
        const binSize = 1 / bins;
        
        segments.forEach(segment => {
            const binIndex = Math.min(Math.floor(segment.alignmentScore / binSize), bins - 1);
            distribution[binIndex]++;
        });
        
        return distribution.map((count, index) => ({
            minScore: index * binSize,
            maxScore: (index + 1) * binSize,
            count,
            percentage: (count / segments.length) * 100
        }));
    }

    /**
     * Set alignment threshold for filtering
     * @param {number} threshold - New threshold (0-1)
     */
    setAlignmentThreshold(threshold) {
        this.alignmentThreshold = Math.max(0, Math.min(1, threshold));
    }

    /**
     * Get current alignment threshold
     * @returns {number} Current threshold
     */
    getAlignmentThreshold() {
        return this.alignmentThreshold;
    }

    /**
     * Clear calculation cache
     */
    clearCache() {
        calculationCache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        return calculationCache.getStats();
    }
}