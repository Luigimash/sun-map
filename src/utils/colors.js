/**
 * Color conversion and interpolation utilities
 */

/**
 * Convert hex color to HSL
 * @param {string} hex - Hex color (e.g., '#FF6B35')
 * @returns {Object} {h, s, l} values
 */
export function hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l;

    l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to hex color
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} Hex color
 */
export function hslToHex(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;

    const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };

    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (c) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Interpolate between two colors using HSL color space to preserve saturation
 * @param {string} color1 - Start color (hex)
 * @param {string} color2 - End color (hex)
 * @param {number} factor - Interpolation factor (0-1)
 * @returns {string} Interpolated color (hex)
 */
export function interpolateColorHsl(color1, color2, factor) {
    const hsl1 = hexToHsl(color1);
    const hsl2 = hexToHsl(color2);
    
    const hue = hsl1.h + (hsl2.h - hsl1.h) * factor;
    const saturation = hsl1.s + (hsl2.s - hsl1.s) * factor;
    const lightness = hsl1.l + (hsl2.l - hsl1.l) * factor;
    
    return hslToHex(hue, saturation, lightness);
}

/**
 * Evaluate a cubic bezier curve at parameter t
 * @param {number} t - Parameter (0-1)
 * @param {Array} points - Four control points [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
 * @returns {Array} [x, y] point on curve
 */
export function evaluateBezier(t, points) {
    const [p0, p1, p2, p3] = points;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    
    const x = mt3 * p0[0] + 3 * mt2 * t * p1[0] + 3 * mt * t2 * p2[0] + t3 * p3[0];
    const y = mt3 * p0[1] + 3 * mt2 * t * p1[1] + 3 * mt * t2 * p2[1] + t3 * p3[1];
    
    return [x, y];
}

/**
 * Interpolate opacity using bezier curve
 * @param {number} score - Alignment score (0-1)
 * @param {Array} bezierPoints - Array of [score, opacity] control points
 * @returns {number} Interpolated opacity (0-1)
 */
export function interpolateOpacityBezier(score, bezierPoints) {
    if (bezierPoints.length !== 4) {
        throw new Error('Bezier curve requires exactly 4 control points');
    }
    
    // Find the t parameter that gives us the desired score
    // Use binary search for efficiency
    let tMin = 0, tMax = 1;
    let t = 0.5;
    
    for (let i = 0; i < 20; i++) { // 20 iterations should be sufficient
        const [currentScore] = evaluateBezier(t, bezierPoints);
        
        if (Math.abs(currentScore - score) < 0.001) break;
        
        if (currentScore < score) {
            tMin = t;
        } else {
            tMax = t;
        }
        t = (tMin + tMax) / 2;
    }
    
    const [, opacity] = evaluateBezier(t, bezierPoints);
    return Math.max(0, Math.min(1, opacity)); // Clamp to [0,1]
}

/**
 * Generate CSS linear gradient string using HSL interpolation
 * @param {string} color1 - Start color (hex)
 * @param {string} color2 - End color (hex)
 * @param {number} steps - Number of intermediate steps (default: 10)
 * @returns {string} CSS gradient string
 */
export function generateHslGradient(color1, color2, steps = 10) {
    const colors = [];
    
    for (let i = 0; i <= steps; i++) {
        const factor = i / steps;
        const color = interpolateColorHsl(color1, color2, factor);
        colors.push(color);
    }
    
    return `linear-gradient(to right, ${colors.join(', ')})`;
}