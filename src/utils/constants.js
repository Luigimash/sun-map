export const CONFIG = {
    map: {
        defaultZoom: 13,
        maxZoom: 19,
        minZoom: 14,
        defaultCenter: [43.47299, -80.53950] // E7
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