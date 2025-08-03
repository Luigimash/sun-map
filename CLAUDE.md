# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based interactive mapping application that visualizes how street orientations align with the sun's azimuth angle at selected dates/times. The app creates heatmaps showing optimal solar alignment for different locations and seasons.

## Development Commands

- `npm run dev` - Start Vite development server (http://localhost:5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Architecture

### Core Design Pattern
The application follows a **modular manager-based architecture** where the main `SunMapApp` class orchestrates communication between specialized managers:

- **MapManager**: Leaflet map operations and street visualization
- **SolarCalculator**: Sun position calculations using SunCalc.js
- **StreetDataManager**: OpenStreetMap Overpass API integration and caching
- **HeatmapManager**: Alignment score calculations and statistics
- **UIManager**: User interface controls and feedback

### Key Architectural Principles
- **Event-driven communication**: Managers communicate through callbacks set in main.js
- **Separation of concerns**: Each manager handles a specific domain
- **Caching layers**: Street data and calculations are cached for performance
- **Debounced API calls**: 300ms delay on map interactions to prevent API flooding

### Data Flow
1. User selects date/time → UI manager captures input
2. SunMapApp calculates sun azimuth for map center
3. Street data fetched from Overpass API for current bounds
4. Individual segments processed and batched into straight sections (≥50m, ≥2 segments)
5. Only valid batched segments proceed to alignment calculations
6. Alignment scores computed against sun azimuth using representative bearings
7. Map visualization updated with cleaner, straighter color-coded segments

## File Structure

```
src/
├── main.js              # Application orchestrator (SunMapApp class)
├── modules/
│   ├── map.js          # Leaflet map management
│   ├── solar.js        # Sun position calculations
│   ├── streets.js      # Overpass API and street data processing
│   ├── heatmap.js      # Alignment calculations and visualization
│   └── ui.js           # UI controls and user feedback
├── utils/
│   ├── constants.js    # Configuration and API endpoints
│   ├── geometry.js     # Bearing/azimuth mathematical calculations
│   ├── colors.js       # Color conversion and gradient utilities
│   └── cache.js        # Data caching utilities
└── styles/
    └── main.css        # Application styles
```

## Working with Street Data

### Street Segment Processing & Batching
- Streets are fetched as OSM ways from Overpass API
- Each way is broken into individual segments between consecutive coordinate points
- **Intelligent Batching**: Consecutive segments with similar bearings (±0.3°) are batched into longer straight sections
- **Filtering Applied**: Only batched segments ≥50 meters and containing ≥2 original segments are rendered
- **Bidirectional Algorithm**: Batching extends both forward and backward from each starting segment
- **Drift Protection**: Total bearing drift across a batch is limited to 1.0° to prevent curved roads
- Bearing is calculated using length-weighted averages for representative values
- Only specific highway types are included (see `constants.js:streets.includedTypes`)

### Batching Configuration
Key parameters in `constants.js:streets.batching`:
- `bearingTolerance`: ±0.3° for segment similarity
- `minBatchLength`: 50 meters minimum length requirement
- `maxBearingDrift`: 1.0° total accumulated drift limit
- `requireBatching`: Only render successfully batched segments (≥2 segments)

### Alignment Calculation
Streets are bidirectional - alignment considers both directions:
```javascript
const bidirectionalDiff = Math.min(angleDiff, Math.abs(angleDiff - 180));
```

## Performance Considerations

- **Spatial bounds checking**: Large areas rejected to prevent excessive API calls
- **Request debouncing**: 300ms delay on map pan/zoom events
- **Caching**: Street data and calculations cached in browser
- **Smart Batching**: Reduces segment count by 60-80% through intelligent grouping
- **Length Filtering**: Eliminates short, noisy segments that don't contribute meaningful data
- **Computational Efficiency**: Fewer segments mean faster alignment calculations and rendering

## API Integration

### OpenStreetMap Overpass API
- Endpoint: `https://overpass-api.de/api/interpreter`
- Rate limit: Max 2 requests/second
- Query template in `constants.js` filters for walkable/drivable streets
- Error handling includes fallback to cached data

### SunCalc.js
- No external API dependency - all calculations local
- Provides sunrise/sunset times and sun position for any date/location

## Configuration

Key settings in `src/utils/constants.js`:
- Map defaults (zoom levels, center coordinates)
- API endpoints and timeouts
- Street type filters
- **Gradient system configuration**:
  - Color scheme for visualization (`gradient.highAlignment`, `gradient.lowAlignment`)
  - Score range filtering (`gradient.minScore`, `gradient.maxScore`)
  - Bezier curve opacity control (`gradient.opacityBezier`)

## Visualization System

### Color and Opacity Management
The application uses an advanced HSL-based gradient system with configurable parameters:

- **HSL Color Interpolation**: Colors transition smoothly without muddy intermediate values
- **Score Range Filtering**: Only segments above `gradient.minScore` are rendered
- **Bezier Curve Opacity**: Opacity follows a customizable bezier curve for nuanced visual representation
- **Modular Color Utilities**: Located in `src/utils/colors.js` with reusable functions:
  - `interpolateColorHsl()`: HSL-based color interpolation
  - `interpolateOpacityBezier()`: Bezier curve opacity calculation
  - `generateHslGradient()`: CSS gradient generation

## Coding Conventions

- **ES6+ modules** with import/export
- **Class-based architecture** for managers
- **camelCase** for functions and variables
- **PascalCase** for classes
- **UPPER_SNAKE_CASE** for constants
- **Error handling** with try/catch and user feedback
- **Console logging** for debugging with descriptive messages

## Testing Notes

No test framework is currently configured. Manual testing workflow:
1. Start dev server with `npm run dev`
2. Test map interactions (pan, zoom)
3. Verify date/time picker functionality
4. Test street data loading in different geographic areas
5. Validate heatmap color accuracy with known sun positions


## Notes from User
Any Large Language Model, Coding Assistant, Agent, or otherwise Developer interacting with this repository should adhere strictly to the rules outlined here.
1. Read PLAN.md and README.md for context about the current state of the software, as well as information about the tech stack
2. Adhere strictly to predetermined conventions in the software. If you are unsure how to format a class, variable, or need to check how to do logging, error handling, etc, please reference README.md, or look for examples of similar situations in the existing code. 
3. Before beginning to write code or tackle a problem, clarify unknown variables and assumptions with the user. Ensure that you are on the same page about the problem at hand, and the solution being planned to solve it, before making any changes. Wait for the user to inform you that you are ready to begin implementation before you commence. 