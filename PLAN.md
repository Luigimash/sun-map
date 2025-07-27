# Sun Azimuth Street Mapping - Technical Project Plan

## Project Overview
A web-based interactive map that visualizes how closely street orientations align with the sun's azimuth angle at selected dates/times, creating heatmaps to show optimal solar alignment for different locations and seasons.

## Technical Architecture

### Core Technology Stack
- **Frontend Framework**: Vanilla JavaScript + HTML5/CSS3 (for prototype simplicity)
- **Mapping Library**: Leaflet.js v1.9+ with OpenStreetMap tiles
- **Solar Calculations**: SunCalc.js for sun position algorithms
- **Street Data**: OpenStreetMap Overpass API for street geometry
- **Visualization**: Custom heatmap implementation using Leaflet plugins

### Development Environment
- **Package Manager**: npm
- **Build Tool**: Vite (lightweight, fast development server)
- **Code Quality**: ESLint + Prettier
- **Version Control**: Git with conventional commits
- **Hosting**: Static hosting with backend API (Node.js/Express for Overpass API proxy)
- **Browser Support**: Modern browsers (Chrome 90+, Firefox 88+), desktop-first
- **Target Scale**: 10km x 10km development area (scalable to 100km x 100km)

## Technical Implementation Strategy

### 1. Map Infrastructure
```javascript
// Core map setup with Leaflet
const map = L.map('map').setView([lat, lng], zoom);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
```

**Key Components:**
- Leaflet base map with OSM tiles
- Custom zoom/pan event handlers
- Responsive design for mobile compatibility

### 2. Solar Calculation Module
```javascript
// Integration with SunCalc.js
import SunCalc from 'suncalc';

function getSunAzimuth(date, lat, lng, isSunrise) {
    const times = SunCalc.getTimes(date, lat, lng);
    const targetTime = isSunrise ? times.sunrise : times.sunset;
    return SunCalc.getPosition(targetTime, lat, lng).azimuth;
}
```

**Features:**
- Date/time picker UI component
- Sunrise/sunset toggle
- Real-time azimuth calculation for map center
- Caching for performance optimization

### 3. Street Data Acquisition
```javascript
// Overpass API query for street data
const overpassQuery = `
[out:json][timeout:25];
(
  way["highway"~"^(primary|secondary|tertiary|residential|footway|cycleway|path)$"]
    ["highway"!~"^(motorway|trunk)$"]
    (${south},${west},${north},${east});
);
out geom;
`;
```

**Strategy:**
- Use Overpass API to fetch street geometries in current map bounds
- Include: primary, secondary, tertiary, residential streets + pedestrian paths
- Exclude: highways (motorway, trunk), parking lots, driveways
- Calculate segment-by-segment bearing from consecutive coordinate points
- Process each OSM way as multiple straight-line segments
- Target area: ~10km x 10km for initial development (scalable to 100km x 100km)

### 4. Heatmap Visualization
```javascript
// Street segment azimuth comparison and coloring
function calculateStreetAlignment(streetAzimuth, sunAzimuth) {
    // Handle bidirectional streets - sun can be approached from either direction
    const angleDiff = Math.abs(streetAzimuth - sunAzimuth);
    const bidirectionalDiff = Math.min(angleDiff, Math.abs(angleDiff - 180));
    const normalizedDiff = Math.min(bidirectionalDiff, 360 - bidirectionalDiff);
    return 1 - (normalizedDiff / 90); // 0-1 alignment score (perfect=orange, perpendicular=blue)
}

function processStreetSegments(osmWay) {
    const segments = [];
    for (let i = 0; i < osmWay.geometry.length - 1; i++) {
        const bearing = calculateBearing(osmWay.geometry[i], osmWay.geometry[i + 1]);
        segments.push({
            start: osmWay.geometry[i],
            end: osmWay.geometry[i + 1],
            bearing: bearing
        });
    }
    return segments;
}
```

**Implementation:**
- Process each OSM way into individual straight-line segments
- Calculate bearing for each segment from consecutive coordinate pairs
- Custom Leaflet layer for segment-by-segment coloring
- Orange-to-blue gradient (perfect alignment=orange, perpendicular=blue)
- Color legend showing alignment scale
- Bidirectional street consideration (can face sun from either direction)

## File Structure
```
src/
├── index.html
├── main.js                 # Application entry point
├── modules/
│   ├── map.js             # Leaflet map initialization
│   ├── solar.js           # SunCalc integration
│   ├── streets.js         # Street data fetching/processing
│   ├── heatmap.js         # Visualization logic
│   └── ui.js              # Date/time picker and controls
├── styles/
│   ├── main.css           # Global styles
│   └── components.css     # UI component styles
└── utils/
    ├── geometry.js        # Bearing/azimuth calculations
    ├── cache.js           # Data caching utilities
    └── constants.js       # Color schemes, API endpoints
```

## Data Flow Architecture

### 1. User Interaction Flow
1. User selects date and sunrise/sunset
2. System calculates sun azimuth for map center
3. Fetch street data for current map bounds
4. Calculate alignment scores for each street
5. Render heatmap visualization

### 2. Performance Considerations
- **Debounced API calls** (300ms delay on map pan/zoom)
- **Spatial indexing** for street data
- **Progressive loading** for large datasets
- **Web Workers** for heavy calculations (if needed)

## API Integration Strategy

### OpenStreetMap Overpass API
- **Endpoint**: `https://overpass-api.de/api/interpreter`
- **Rate Limiting**: Max 2 requests/second
- **Caching**: Browser localStorage for repeated queries
- **Error Handling**: Fallback to cached data, user notifications

### SunCalc.js Integration
- **Local computation**: No external API dependency
- **Precision**: Sufficient for visualization purposes
- **Performance**: Fast calculation for real-time updates

## Development Conventions

### Code Style
```javascript
// Use modern ES6+ features
const config = {
    map: {
        defaultZoom: 13,
        maxZoom: 18,
        minZoom: 10
    },
    colors: {
        highAlignment: '#FF6B35',  // Orange
        lowAlignment: '#4ECDC4'    // Blue
    }
};
```

### Naming Conventions
- **Files**: kebab-case (`street-analyzer.js`)
- **Functions**: camelCase (`calculateStreetBearing`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_ZOOM_LEVEL`)
- **CSS Classes**: BEM methodology (`.map-container__controls--active`)

### Git Workflow
- **Branches**: `feature/street-data-fetching`, `fix/heatmap-performance`
- **Commits**: Conventional commits (`feat: add street bearing calculation`)
- **PRs**: Require code review and automated tests

## Performance Targets
- **Initial Load**: < 3 seconds on 3G connection
- **Map Interaction**: < 100ms response time
- **Data Processing**: < 500ms for 1000 street segments
- **Memory Usage**: < 50MB for typical city view

## Testing Strategy
- **Unit Tests**: Jest for utility functions
- **Integration Tests**: Map interactions and API calls
- **Visual Tests**: Screenshot comparison for heatmap rendering
- **Performance Tests**: Lighthouse CI integration

## Future Scalability Considerations
- **Backend API**: For complex calculations and data preprocessing
- **Database**: PostGIS for spatial street data storage
- **CDN**: For static assets and tile caching
- **Real-time Updates**: WebSocket for collaborative features

## Risk Mitigation
- **API Limits**: Implement robust caching and graceful degradation
- **Browser Compatibility**: Desktop-first, modern browsers (Chrome 90+, Firefox 88+)
- **Future Mobile Support**: Plan responsive design for later implementation
- **Data Quality**: Calculate bearing from coordinate sequences (OSM provides geometry points)
- **Geographic Edge Cases**: Flag polar region sun calculations for future consideration

## Success Metrics
- **User Engagement**: Time spent interacting with map
- **Performance**: Page load times and interaction responsiveness
- **Accuracy**: Visual validation of sun/street alignment calculations
- **Scalability**: Support for major metropolitan areas

## Next Steps for MVP
1. Set up development environment with Vite
2. Implement basic Leaflet map with OSM tiles
3. Integrate SunCalc.js with date/time picker
4. Create Overpass API integration for street data
5. Develop heatmap visualization algorithm
6. Add responsive UI and mobile optimization
7. Implement caching and performance optimizations

This technical foundation provides a clear roadmap for building a robust, maintainable, and scalable sun-azimuth street mapping application.