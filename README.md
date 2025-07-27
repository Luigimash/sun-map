# Sun Azimuth Street Mapping

A web-based interactive map that visualizes how closely street orientations align with the sun's azimuth angle at selected dates/times, creating heatmaps to show optimal solar alignment for different locations and seasons.

## 🎯 Overview

This application combines solar calculations, geographic data, and real-time visualization to help users understand how street layouts interact with the sun's path throughout the year. Perfect for urban planning, solar panel installation planning, photography, and general curiosity about solar geometry.

## ✨ Features

- **Interactive Leaflet Map** - Pan/zoom with OpenStreetMap tiles, smooth navigation
- **Solar Azimuth Calculations** - Precise sunrise/sunset angles for any date/location using SunCalc.js
- **Real-time Street Data** - Fetches current street data from OpenStreetMap Overpass API
- **Dynamic Heatmap Visualization** - Color-coded street segments showing alignment quality
- **Responsive Controls** - Date picker, sunrise/sunset toggle, manual update trigger
- **Performance Optimized** - Multi-layer caching, debounced API calls, area limitations
- **Error Handling** - Graceful fallbacks and user-friendly error messages

## 🚀 Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd sun-map
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:5173`

## 📖 How to Use

1. **Navigate:** Pan and zoom the map to your desired location
2. **Select Date:** Use the date picker to choose any date
3. **Choose Time:** Toggle between sunrise and sunset
4. **Analyze:** Click "Update Map" to visualize street alignments

**Color Legend:**
- 🟠 **Orange/Red** - Perfect alignment with sun's direction (ideal for solar)
- 🔵 **Blue/Teal** - Perpendicular to sun's direction (maximum shade)
- 🌈 **Gradient** - Varying degrees of alignment (0-100%)

## 🛠 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Vanilla JavaScript ES6+ | Core application logic |
| **UI Framework** | HTML5, CSS3 | Responsive interface |
| **Mapping** | Leaflet.js 1.9.4 | Interactive map rendering |
| **Solar Calculations** | SunCalc.js 1.9.0 | Astronomical calculations |
| **Street Data** | OpenStreetMap Overpass API | Real-time geographic data |
| **Build Tool** | Vite 4.5.3 | Fast development and bundling |
| **Package Manager** | npm | Dependency management |

## 📁 Detailed File Structure

```
sun-map/
├── 📄 index.html                   # Entry point HTML with map container
├── 📄 package.json                 # Project dependencies and scripts
├── 📄 README.md                    # This documentation
├── 📄 PLAN.md                      # Technical specifications
│
└── src/                            # Source code directory
    ├── 📄 main.js                  # Application bootstrapper and coordinator
    │
    ├── modules/                    # Core feature modules
    │   ├── 📄 map.js              # Leaflet map management and rendering
    │   ├── 📄 solar.js            # SunCalc integration and azimuth calculations
    │   ├── 📄 streets.js          # Overpass API integration and data fetching
    │   ├── 📄 heatmap.js          # Alignment scoring and visualization logic
    │   └── 📄 ui.js               # DOM manipulation and user interactions
    │
    ├── styles/                     # Styling and layout
    │   └── 📄 main.css            # Complete application styles
    │
    └── utils/                      # Shared utilities and helpers
        ├── 📄 constants.js        # Configuration, API endpoints, defaults
        ├── 📄 geometry.js         # Mathematical calculations (bearings, alignment)
        └── 📄 cache.js            # Data caching with LRU eviction
```

## 🏗 Architecture Deep Dive

### Core Modules

**`main.js`** - Application orchestrator
- Initializes all managers and coordinates data flow
- Handles high-level error management and user feedback
- Manages application lifecycle and cleanup

**`map.js`** - Leaflet map controller
- Map initialization with OpenStreetMap tiles
- Event handling for pan/zoom with debouncing
- Street segment rendering with dynamic styling
- Bounds calculation and viewport management

**`solar.js`** - Solar calculation engine
- SunCalc.js wrapper with caching
- Azimuth conversion from radians to compass degrees
- Sunrise/sunset time calculations
- Real-time sun position tracking

**`streets.js`** - Geographic data manager
- Overpass API query construction and execution
- OSM way processing into street segments
- Request cancellation and timeout handling
- Data validation and error recovery

**`heatmap.js`** - Visualization processor
- Street-sun alignment scoring algorithm
- Statistical analysis (averages, distributions)
- Color interpolation for visual feedback
- Performance filtering and threshold management

**`ui.js`** - User interface controller
- Form state management and validation
- Event binding and callback coordination
- Loading states and error message display
- Responsive layout adjustments

### Utility Libraries

**`constants.js`** - Centralized configuration
- API endpoints and timeout settings
- Map defaults (zoom levels, center coordinates)
- Color schemes and visual constants
- Street type filtering rules

**`geometry.js`** - Mathematical operations
- Bearing calculations between coordinate pairs
- Street alignment scoring with bidirectional support
- OSM way processing into analyzable segments
- Coordinate system conversions

**`cache.js`** - Performance optimization
- LRU cache implementation for street data
- Calculation result memoization
- Configurable cache sizes and expiration
- Cache statistics and debugging tools

## 🔧 Development Commands

```bash
npm run dev      # Start development server (Vite HMR)
npm run build    # Build optimized production bundle
npm run preview  # Preview production build locally
```

## 🌐 Browser Compatibility

- **Chrome** 90+ (recommended)
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+

**Requirements:**
- ES6+ module support
- Fetch API
- CSS Grid and Flexbox
- Modern JavaScript features (async/await, destructuring)

## ⚡ Performance Features

**Data Management:**
- **Street Cache** - LRU cache (50 entries) for Overpass API responses
- **Calculation Cache** - Memoization (100 entries) for alignment computations
- **Solar Cache** - Date-based caching for sun position calculations

**API Optimization:**
- **Debounced Requests** - 300ms delay on map interactions
- **Area Limiting** - Prevents queries on overly large map areas
- **Request Cancellation** - Aborts in-flight requests when obsolete
- **Timeout Protection** - 25-second timeout for external API calls

**Rendering Optimization:**
- **Segment Filtering** - Only renders significant alignment scores
- **Progressive Loading** - Processes and displays data incrementally
- **Layer Management** - Efficient map layer clearing and updating

## 🐛 Development Guidelines

### Adding New Features

1. **Create module files** in `src/modules/` following existing patterns
2. **Add utilities** in `src/utils/` for reusable functionality
3. **Update constants** in `constants.js` for configuration
4. **Register with main.js** to integrate with application lifecycle

### Code Standards

- **ES6+ modules** with explicit imports/exports
- **JSDoc comments** for all public methods
- **Error handling** with try/catch and user feedback
- **Performance considerations** for data-heavy operations
- **Mobile-first** responsive design principles

### API Integration

- **Overpass API** queries must include timeout and area limitations
- **SunCalc.js** results require conversion from radians to degrees
- **Leaflet.js** events should be debounced for performance
- **Browser APIs** need feature detection and fallbacks

## 🔍 Troubleshooting

**Common Issues:**

1. **"No street data found"** - Zoom into a more urban area
2. **Slow loading** - Area too large, zoom in closer
3. **Inaccurate alignment** - Check date/time settings and location
4. **Map not loading** - Verify internet connection for tile loading

**Debug Tools:**
- Browser console shows detailed logging
- Cache statistics available via `window.sunMapApp.getState()`
- Performance timing logged for major operations

## 📋 Contributing

This project follows the specifications in **PLAN.md**. Key areas for contribution:

- **Enhanced visualizations** (3D rendering, animation)
- **Additional data sources** (weather, building heights)
- **Mobile app** development using the same core algorithms
- **Performance optimization** for larger geographic areas
- **Accessibility improvements** for screen readers and keyboard navigation

## 📄 License

ISC License - See package.json for details.