/**
 * Calculate bearing between two geographic points
 * @param {Object} point1 - {lat, lon}
 * @param {Object} point2 - {lat, lon}
 * @returns {number} Bearing in degrees (0-360)
 */
export function calculateBearing(point1, point2) {
    const lat1 = toRadians(point1.lat);
    const lat2 = toRadians(point2.lat);
    const deltaLon = toRadians(point2.lon - point1.lon);

    const x = Math.sin(deltaLon) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    const bearing = Math.atan2(x, y);
    return (toDegrees(bearing) + 360) % 360;
}

/**
 * Calculate alignment score between street bearing and sun azimuth
 * @param {number} streetBearing - Street bearing in degrees
 * @param {number} sunAzimuth - Sun azimuth in degrees
 * @returns {number} Alignment score (0-1, where 1 is perfect alignment)
 */
export function calculateStreetAlignment(streetBearing, sunAzimuth) {
    // Handle bidirectional streets - sun can be approached from either direction
    const angleDiff = Math.abs(streetBearing - sunAzimuth);
    const bidirectionalDiff = Math.min(angleDiff, Math.abs(angleDiff - 180));
    const normalizedDiff = Math.min(bidirectionalDiff, 360 - bidirectionalDiff);
    
    // Perfect alignment = 1, perpendicular = 0
    return 1 - (normalizedDiff / 90);
}

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} Radians
 */
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 * @param {number} radians
 * @returns {number} Degrees
 */
function toDegrees(radians) {
    return radians * (180 / Math.PI);
}

/**
 * Calculate distance between two geographic points using Haversine formula
 * @param {Object} point1 - {lat, lon}
 * @param {Object} point2 - {lat, lon}
 * @returns {number} Distance in meters
 */
export function calculateDistance(point1, point2) {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = toRadians(point1.lat);
    const lat2Rad = toRadians(point2.lat);
    const deltaLatRad = toRadians(point2.lat - point1.lat);
    const deltaLonRad = toRadians(point2.lon - point1.lon);

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Calculate bearing difference accounting for circular nature (0-360°)
 * @param {number} bearing1 - First bearing in degrees
 * @param {number} bearing2 - Second bearing in degrees
 * @returns {number} Absolute difference in degrees (0-180°)
 */
export function calculateBearingDifference(bearing1, bearing2) {
    let diff = Math.abs(bearing1 - bearing2);
    return Math.min(diff, 360 - diff);
}

/**
 * Process OSM way into individual street segments
 * @param {Object} osmWay - OSM way object with geometry array
 * @returns {Array} Array of street segments with bearing
 */
/**
 * Batch consecutive segments with similar bearings into longer straight sections
 * @param {Array} segments - Array of individual segments from an OSM way
 * @param {Object} config - Batching configuration
 * @returns {Array} Array of batched straight segments
 */
export function batchStraightSegments(segments, config) {
    if (!segments || segments.length === 0) return [];
    
    const { bearingTolerance, minBatchLength, maxBearingDrift, requireBatching } = config;
    const processedSegments = new Set();
    const batchedResults = [];
    
    for (let i = 0; i < segments.length; i++) {
        const segmentId = `${segments[i].osmId}_${segments[i].segmentIndex}`;
        
        if (processedSegments.has(segmentId)) {
            continue;
        }
        
        const batch = createBidirectionalBatch(i, segments, bearingTolerance, maxBearingDrift);
        
        // Mark all segments in batch as processed
        batch.constituents.forEach(segIndex => {
            const id = `${segments[segIndex].osmId}_${segments[segIndex].segmentIndex}`;
            processedSegments.add(id);
        });
        
        // Calculate representative segment
        const representativeSegment = createRepresentativeSegment(batch, segments);
        
        // Apply filtering criteria
        const meetsLengthRequirement = representativeSegment.totalLength >= minBatchLength;
        const meetsBatchingRequirement = !requireBatching || batch.constituents.length >= 2;
        
        if (meetsLengthRequirement && meetsBatchingRequirement) {
            batchedResults.push(representativeSegment);
        }
    }
    
    return batchedResults;
}

/**
 * Create bidirectional batch starting from a segment index
 * @param {number} startIndex - Starting segment index
 * @param {Array} segments - All segments
 * @param {number} bearingTolerance - Bearing tolerance in degrees
 * @param {number} maxBearingDrift - Maximum total bearing drift
 * @returns {Object} Batch with constituent segment indices
 */
function createBidirectionalBatch(startIndex, segments, bearingTolerance, maxBearingDrift) {
    const batch = {
        constituents: [startIndex],
        startIndex: startIndex,
        endIndex: startIndex
    };
    
    const referenceBearing = segments[startIndex].bearing;
    let totalDrift = 0;
    
    // Batch forward
    let currentIndex = startIndex;
    while (currentIndex + 1 < segments.length) {
        const nextSegment = segments[currentIndex + 1];
        const bearingDiff = calculateBearingDifference(referenceBearing, nextSegment.bearing);
        const newTotalDrift = totalDrift + bearingDiff;
        
        if (bearingDiff <= bearingTolerance && newTotalDrift <= maxBearingDrift) {
            currentIndex++;
            batch.constituents.push(currentIndex);
            batch.endIndex = currentIndex;
            totalDrift = newTotalDrift;
        } else {
            break;
        }
    }
    
    // Batch backward
    totalDrift = 0; // Reset drift calculation for backward direction
    currentIndex = startIndex;
    while (currentIndex - 1 >= 0) {
        const prevSegment = segments[currentIndex - 1];
        const bearingDiff = calculateBearingDifference(referenceBearing, prevSegment.bearing);
        const newTotalDrift = totalDrift + bearingDiff;
        
        if (bearingDiff <= bearingTolerance && newTotalDrift <= maxBearingDrift) {
            currentIndex--;
            batch.constituents.unshift(currentIndex);
            batch.startIndex = currentIndex;
            totalDrift = newTotalDrift;
        } else {
            break;
        }
    }
    
    return batch;
}

/**
 * Create representative segment from batch
 * @param {Object} batch - Batch with constituent indices
 * @param {Array} segments - All segments
 * @returns {Object} Representative segment
 */
function createRepresentativeSegment(batch, segments) {
    const firstSegment = segments[batch.startIndex];
    const lastSegment = segments[batch.endIndex];
    
    // Calculate length-weighted average bearing
    let totalLength = 0;
    let weightedBearingSum = 0;
    
    batch.constituents.forEach(index => {
        const segment = segments[index];
        const segmentLength = calculateDistance(segment.start, segment.end);
        totalLength += segmentLength;
        weightedBearingSum += segment.bearing * segmentLength;
    });
    
    const representativeBearing = totalLength > 0 ? weightedBearingSum / totalLength : firstSegment.bearing;
    const totalBatchLength = calculateDistance(firstSegment.start, lastSegment.end);
    
    return {
        start: firstSegment.start,
        end: lastSegment.end,
        bearing: representativeBearing,
        osmId: firstSegment.osmId,
        highway: firstSegment.highway,
        segmentCount: batch.constituents.length,
        totalLength: totalBatchLength,
        constituents: batch.constituents
    };
}

export function processStreetSegments(osmWay) {
    const segments = [];
    const geometry = osmWay.geometry;
    
    for (let i = 0; i < geometry.length - 1; i++) {
        const bearing = calculateBearing(geometry[i], geometry[i + 1]);
        segments.push({
            start: geometry[i],
            end: geometry[i + 1],
            bearing: bearing,
            osmId: osmWay.id,
            highway: osmWay.tags?.highway,
            segmentIndex: i
        });
    }
    
    return segments;
}