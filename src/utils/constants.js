export const CONFIG = {
    map: {
        defaultZoom: 13,
        maxZoom: 18,
        minZoom: 10,
        defaultCenter: [40.7128, -74.0060] // New York City
    },
    colors: {
        highAlignment: '#FF6B35',  // Orange
        lowAlignment: '#4ECDC4'    // Blue
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
        excludedTypes: ['motorway', 'trunk']
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