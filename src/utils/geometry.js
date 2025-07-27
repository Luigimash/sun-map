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
 * Process OSM way into individual street segments
 * @param {Object} osmWay - OSM way object with geometry array
 * @returns {Array} Array of street segments with bearing
 */
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
            highway: osmWay.tags?.highway
        });
    }
    
    return segments;
}