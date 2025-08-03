export const CONFIG = {
    map: {
        defaultZoom: 13,
        maxZoom: 19,
        minZoom: 14,
        defaultCenter: [43.47299, -80.53950] // E7
    },
    gradient: {
        // Colors for alignment visualization
        highAlignment: '#FF6B35',  // Orange
        lowAlignment: '#cdcb4eff',   // Yellowish
        
        // Alignment score range for interpolation (0-1)
        minScore: 0.7,    // Scores below this won't show on map
        maxScore: 1.0,    // Maximum score for color interpolation
        
        // Opacity control using bezier curve points
        // Each point: [alignment_score, opacity] where both are 0-1
        opacityBezier: [
            [0.5, -0.1],   // At min score (0.5), opacity = 0.05
            [0.7, 0.2],   // Control point for curve shape
            [0.8, 0.6],  // Control point for curve shape  
            [1.0, 1.0]    // At max score (1.0), opacity = 1.0
        ]
    },
    api: {
        overpassUrl: 'https://overpass-api.de/api/interpreter',
        debounceDelay: 300,
        requestTimeout: 25000
    },
    streets: {
        includedTypes: [
            'primary', 'secondary', 'tertiary', 'residential',
            'footway', 'cycleway', 'path'
        ],
        excludedTypes: ['motorway', 'trunk'],
        batching: {
            bearingTolerance: 2.5,      // ±0.75° for segment similarity. Units in degrees
            minBatchLength: 50,         // 50 meters minimum length. Units in meters
            maxBearingDrift: 1.0,       // 1° total accumulated drift limit
            requireBatching: true       // Only render successfully batched segments
        }
    }
};

export const OVERPASS_QUERY_TEMPLATE = `
[out:json][timeout:25];
(
  way["highway"~"^(primary|secondary|tertiary|residential|footway|cycleway|path)$"]
    ["highway"!~"^(motorway|trunk)$"]
    ({south},{west},{north},{east});
);
out geom;
`;