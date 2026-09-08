// ═══════════════════════════════════════════════════════════════════
//  SPECTRAL AI SYSTEM – Pure JavaScript Digitizer Engine (OpenCV-Free)
//  All image processing runs locally in pure JS.
//  No external WebAssembly compilation or script download is required!
// ═══════════════════════════════════════════════════════════════════

// Direct resolve since JS engine is active immediately
window.cvReady = true;
window.cvReadyPromise = Promise.resolve();

// Mock cv object to prevent reference errors
window.cv = {
    Mat: class {},
    Rect: class {}
};

// ─────────────────────────────────────────────────────────────────
//  HSV COLOR RANGES  (h: 0-180, s/v: 0-255)
//  Matches OpenCV's internal color thresholds.
// ─────────────────────────────────────────────────────────────────
const CV_COLOR_RANGES = {
    red: [
        { lower: [0, 20, 20],   upper: [12, 255, 255] },
        { lower: [160, 20, 20], upper: [180, 255, 255] }
    ],
    yellow: [
        { lower: [20, 30, 50],  upper: [38, 255, 255] }
    ],
    green: [
        { lower: [35, 20, 20],  upper: [85, 255, 255] }
    ],
    cyan: [
        { lower: [80, 20, 20],  upper: [102, 255, 255] }
    ],
    blue: [
        { lower: [90, 20, 20],  upper: [138, 255, 255] }
    ],
    magenta: [
        { lower: [138, 20, 20], upper: [165, 255, 255] }
    ],
    orange: [
        { lower: [8, 25, 25],  upper: [25, 255, 255] }
    ],
    black: [
        { lower: [0, 0, 0],     upper: [180, 60, 130] }
    ]
};

// ─────────────────────────────────────────────────────────────────
//  HSV & COLOR CLASSIFIER IN PURE JAVASCRIPT
// ─────────────────────────────────────────────────────────────────
function rgbToCvHsv(r, g, b) {
    let r_n = r / 255, g_n = g / 255, b_n = b / 255;
    let max = Math.max(r_n, g_n, b_n), min = Math.min(r_n, g_n, b_n);
    let d = max - min;
    let h = 0;
    let s = max === 0 ? 0 : d / max;
    let v = max;
    if (d !== 0) {
        if (max === r_n)      h = ((g_n - b_n) / d + (g_n < b_n ? 6 : 0)) / 6;
        else if (max === g_n) h = ((b_n - r_n) / d + 2) / 6;
        else                  h = ((r_n - g_n) / d + 4) / 6;
    }
    return {
        h: Math.round(h * 180),
        s: Math.round(s * 255),
        v: Math.round(v * 255)
    };
}

function isColorMatch(r, g, b, colorMode, whitenessThresh = 255) {
    if (r >= whitenessThresh && g >= whitenessThresh && b >= whitenessThresh) {
        return false;
    }
    if (colorMode === 'grayscale') {
        return !(r >= 250 && g >= 250 && b >= 250);
    }
    const { h, s, v } = rgbToCvHsv(r, g, b);
    const ranges = CV_COLOR_RANGES[colorMode];
    if (!ranges) return false;

    for (const range of ranges) {
        if (h >= range.lower[0] && h <= range.upper[0] &&
            s >= range.lower[1] && s <= range.upper[1] &&
            v >= range.lower[2] && v <= range.upper[2]) {
            return true;
        }
    }
    return false;
}

// ─────────────────────────────────────────────────────────────────
//  IMAGE ENHANCEMENT & VERTEX DETECTION FALLBACKS (Pure JS)
// ─────────────────────────────────────────────────────────────────
async function cvEnhanceImage(srcCanvas) {
    // Client-side CLAHE is bypassed, filters can be run manually
    return srcCanvas.toDataURL();
}

async function cvDetectPlotVertices(srcCanvas) {
    const W = srcCanvas.width, H = srcCanvas.height;
    const ctx = srcCanvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;

    const getPixel = (x, y) => {
        const idx = (y * W + x) * 4;
        return { r: data[idx], g: data[idx+1], b: data[idx+2] };
    };

    const getLuminance = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

    // Sample inner points to detect dark vs light theme backgrounds, avoiding black borders/margins
    const corners = [
        getPixel(Math.floor(W * 0.2), Math.floor(H * 0.2)),
        getPixel(Math.floor(W * 0.8), Math.floor(H * 0.2)),
        getPixel(Math.floor(W * 0.2), Math.floor(H * 0.8)),
        getPixel(Math.floor(W * 0.8), Math.floor(H * 0.8))
    ];
    const avgBg = corners.map(p => getLuminance(p.r, p.g, p.b)).reduce((a, b) => a + b, 0) / 4;
    const isDarkBg = avgBg < 120;

    // Count axis line candidate pixels inside inner area (excluding outer 5% margins)
    const colDark = new Int32Array(W);
    const rowDark = new Int32Array(H);
    const scanMinX = Math.floor(W * 0.05);
    const scanMaxX = Math.floor(W * 0.95);
    const scanMinY = Math.floor(H * 0.05);
    const scanMaxY = Math.floor(H * 0.95);

    for (let y = scanMinY; y < scanMaxY; y++) {
        for (let x = scanMinX; x < scanMaxX; x++) {
            const { r, g, b } = getPixel(x, y);
            const lum = getLuminance(r, g, b);
            
            const isAxisPixel = isDarkBg 
                ? (lum > avgBg + 35) && (r > 100 || g > 100 || b > 100)
                : (lum < avgBg - 35) && (r < 150 && g < 150 && b < 150);
            
            if (isAxisPixel) {
                colDark[x]++;
                rowDark[y]++;
            }
        }
    }

    // Y-axis col: peak dark column in left 4–42% of image
    let xOrigin = Math.floor(W * 0.12);
    let best = 0;
    for (let x = Math.floor(W * 0.04); x < Math.floor(W * 0.42); x++) {
        if (colDark[x] > best) { best = colDark[x]; xOrigin = x; }
    }

    // X-axis row: peak dark row in bottom 55–97%
    // To avoid caption text, we only count dark pixels to the right of xOrigin
    let yOrigin = Math.floor(H * 0.82);
    best = 0;
    for (let y = Math.floor(H * 0.55); y < Math.floor(H * 0.97); y++) {
        let darkCount = 0;
        for (let x = xOrigin + 10; x < W - 10; x++) {
            const { r, g, b } = getPixel(x, y);
            const lum = getLuminance(r, g, b);
            const isAxis = isDarkBg ? (lum > avgBg + 30) : (lum < avgBg - 30);
            if (isAxis) {
                darkCount++;
            }
        }
        if (darkCount > best) {
            best = darkCount;
            yOrigin = y;
        }
    }

    // xEnd: trace X-axis horizontal line RIGHTWARDS from xOrigin
    let xEnd = xOrigin + 50;
    let gapCount = 0;
    const maxGapX = Math.max(60, Math.floor(W * 0.08));
    for (let x = xOrigin + 1; x < W - 5; x++) {
        let foundDark = false;
        for (let dy = -4; dy <= 4; dy++) {
            const { r, g, b } = getPixel(x, yOrigin + dy);
            const lum = getLuminance(r, g, b);
            const isAxis = isDarkBg ? (lum > avgBg + 25) : (lum < avgBg - 25);
            if (isAxis) {
                foundDark = true;
                break;
            }
        }
        if (foundDark) {
            xEnd = x;
            gapCount = 0;
        } else {
            gapCount++;
            if (gapCount > maxGapX) {
                break;
            }
        }
    }

    // yEnd: trace Y-axis vertical line UPWARDS from yOrigin
    let yEnd = yOrigin - 50;
    gapCount = 0;
    const maxGapY = Math.max(60, Math.floor(H * 0.08));
    for (let y = yOrigin - 1; y >= 5; y--) {
        let foundDark = false;
        for (let dx = -4; dx <= 4; dx++) {
            const { r, g, b } = getPixel(xOrigin + dx, y);
            const lum = getLuminance(r, g, b);
            const isAxis = isDarkBg ? (lum > avgBg + 25) : (lum < avgBg - 25);
            if (isAxis) {
                foundDark = true;
                break;
            }
        }
        if (foundDark) {
            yEnd = y;
            gapCount = 0;
        } else {
            gapCount++;
            if (gapCount > maxGapY) {
                break;
            }
        }
    }

    console.log(`[local-vertices] origin=(${xOrigin},${yOrigin}), xEnd=(${xEnd},${yOrigin}), yEnd=(${xOrigin},${yEnd})`);

    return [
        { x: xOrigin, y: yOrigin },
        { x: xEnd,    y: yOrigin },
        { x: xOrigin, y: yEnd }
    ];
}

async function cvReadAxisLimits(srcCanvas, vertices) {
    return { xRange: [300, 1000], yRange: [0.0, 1.0], xLabel: 'Wavelength (nm)', yLabel: 'Absorbance' };
}

// ─────────────────────────────────────────────────────────────────
//  LIVE MASK PREVIEW
// ─────────────────────────────────────────────────────────────────
async function cvRenderLiveMask(srcCanvas, maskCanvas, colorMode, whitenessThresh = 255) {
    const sctx = srcCanvas.getContext('2d');
    const mctx = maskCanvas.getContext('2d');
    const W = srcCanvas.width, H = srcCanvas.height;

    const srcImgData = sctx.getImageData(0, 0, W, H);
    const srcData = srcImgData.data;

    // Retrieve scribble masks to ignore erased spots
    const scribble = document.getElementById('scribble-canvas');
    let scribbleData = null;
    if (scribble) {
        const sctx2 = scribble.getContext('2d');
        scribbleData = sctx2.getImageData(0, 0, W, H).data;
    }

    const maskImgData = mctx.createImageData(W, H);
    const maskData = maskImgData.data;

    for (let i = 0; i < srcData.length; i += 4) {
        const r = srcData[i], g = srcData[i+1], b = srcData[i+2];
        if (scribbleData && scribbleData[i+3] > 0) {
            // Mask out scribble pixels
            maskData[i] = 0;
            maskData[i+1] = 0;
            maskData[i+2] = 0;
            maskData[i+3] = 255;
            continue;
        }

        if (isColorMatch(r, g, b, colorMode, whitenessThresh)) {
            maskData[i] = 255;
            maskData[i+1] = 255;
            maskData[i+2] = 255;
            maskData[i+3] = 255;
        } else {
            maskData[i] = 0;
            maskData[i+1] = 0;
            maskData[i+2] = 0;
            maskData[i+3] = 255;
        }
    }
    mctx.putImageData(maskImgData, 0, 0);
}

// ─────────────────────────────────────────────────────────────────
//  PITCH-TRACKING CURVE TRACER (Pure JS Connected-Lines Sweep)
// ─────────────────────────────────────────────────────────────────
async function cvTraceCurves(srcCanvas, colorMode, vertices, xRange, yRange, configs) {
    const origin = vertices[0];
    const xMaxV  = vertices[1];
    const yMaxV  = vertices[2];

    const xMinVal = xRange[0], xMaxVal = xRange[1];
    const yMinVal = yRange[0], yMaxVal = yRange[1];
    const smoothWin = configs.smoothingWindow || 5;
    const xScaleType = configs.xScaleType || 'linear';
    const yScaleType = configs.yScaleType || 'linear';

    function pixToReal(px, py) {
        const xPct = (px - origin.x) / (xMaxV.x - origin.x);
        const yPct = (origin.y - py)  / (origin.y - yMaxV.y);
        let rx, ry;
        if (xScaleType === 'log' && xMinVal > 0 && xMaxVal > 0) {
            const logMin = Math.log10(xMinVal), logMax = Math.log10(xMaxVal);
            rx = Math.pow(10, logMin + xPct * (logMax - logMin));
        } else {
            rx = xMinVal + xPct * (xMaxVal - xMinVal);
        }
        if (yScaleType === 'log' && yMinVal > 0 && yMaxVal > 0) {
            const logMin = Math.log10(yMinVal), logMax = Math.log10(yMaxVal);
            ry = Math.pow(10, logMin + yPct * (logMax - logMin));
        } else {
            ry = yMinVal + yPct * (yMaxVal - yMinVal);
        }
        return [rx, ry];
    }

    function isValidPt(rx, ry) {
        if (isNaN(rx) || isNaN(ry)) return false;
        const minX = Math.min(xMinVal, xMaxVal);
        const maxX = Math.max(xMinVal, xMaxVal);
        const minY = Math.min(yMinVal, yMaxVal);
        const maxY = Math.max(yMinVal, yMaxVal);
        
        const xMargin = (maxX - minX) * 0.02 || 2;
        const yMargin = (maxY - minY) * 0.05 || 0.05;
        
        return (rx >= minX - xMargin && rx <= maxX + xMargin &&
                ry >= minY - yMargin && ry <= maxY + yMargin);
    }

    let colorNames = colorMode === 'grayscale' 
        ? ['red','yellow','orange','blue','green','cyan','magenta','black']
        : [colorMode];

    const allCurves = [];

    const ctx = srcCanvas.getContext('2d');
    const W = srcCanvas.width, H = srcCanvas.height;
    const pixels = ctx.getImageData(0, 0, W, H).data;

    const scribble = document.getElementById('scribble-canvas');
    let scribbleData = null;
    if (scribble) {
        scribbleData = scribble.getContext('2d').getImageData(0, 0, W, H).data;
    }

    const startX = Math.max(0, Math.floor(origin.x));
    const endX = Math.min(W, Math.floor(xMaxV.x));
    const startY = Math.max(0, Math.floor(yMaxV.y));
    const endY = Math.min(H, Math.floor(origin.y));

    for (const colorName of colorNames) {
        const activeLines = [];
        const completedLines = [];

        for (let px = startX; px < endX; px++) {
            const matchYCoords = [];
            let inRun = false;
            let runStart = 0;

            for (let py = startY; py < endY; py++) {
                const idx = (py * W + px) * 4;
                const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
                
                if (scribbleData && scribbleData[idx+3] > 0) {
                    if (inRun) {
                        matchYCoords.push(Math.floor((runStart + py - 1) / 2));
                        inRun = false;
                    }
                    continue;
                }

                if (isColorMatch(r, g, b, colorName, configs.whitenessThresh)) {
                    if (!inRun) {
                        runStart = py;
                        inRun = true;
                    }
                } else {
                    if (inRun) {
                        matchYCoords.push(Math.floor((runStart + py - 1) / 2));
                        inRun = false;
                    }
                }
            }
            if (inRun) {
                matchYCoords.push(Math.floor((runStart + endY - 1) / 2));
            }

            const matchedYCoords = new Set();
            const matchedActiveIdxs = new Set();

            // 1. Match existing active lines to the closest coordinate
            for (let li = 0; li < activeLines.length; li++) {
                const line = activeLines[li];
                let bestY = -1;
                let minDistance = 250; // 250px proximity radius to support extremely steep curves

                for (const py of matchYCoords) {
                    if (matchedYCoords.has(py)) continue;
                    const dist = Math.abs(line.lastY - py);
                    if (dist < minDistance) {
                        minDistance = dist;
                        bestY = py;
                    }
                }

                if (bestY !== -1) {
                    line.points.push([px, bestY]);
                    line.lastY = bestY;
                    line.gap = 0;
                    matchedActiveIdxs.add(li);
                    matchedYCoords.add(bestY);
                }
            }

            // 2. Start new lines only for coordinates far from all active curves
            for (const py of matchYCoords) {
                if (matchedYCoords.has(py)) continue;

                let isDuplicate = false;
                for (const line of activeLines) {
                    if (Math.abs(line.lastY - py) < 15) {
                        isDuplicate = true;
                        break;
                    }
                }

                if (!isDuplicate) {
                    activeLines.push({
                        lastY: py,
                        points: [[px, py]],
                        gap: 0
                    });
                    // Mark as matched so gap count doesn't increment immediately
                    matchedActiveIdxs.add(activeLines.length - 1);
                }
            }

            for (let li = activeLines.length - 1; li >= 0; li--) {
                if (!matchedActiveIdxs.has(li)) {
                    activeLines[li].gap++;
                    if (activeLines[li].gap > 20) { // 20 columns gap limit (matching server)
                        const completed = activeLines.splice(li, 1)[0];
                        if (completed.points.length >= 15) {
                            completedLines.push(completed.points);
                        }
                    }
                }
            }
        }

        for (const line of activeLines) {
            if (line.points.length >= 15) {
                completedLines.push(line.points);
            }
        }

        // ── Path stitching (stitching broken curves of the same color) ──
        const paths = completedLines.map(pts => {
            let slope = 0;
            if (pts.length >= 2) {
                slope = pts[pts.length - 1][1] - pts[pts.length - 2][1];
            }
            return { points: pts, slope };
        });

        const sortedPaths = [...paths].sort((a, b) => a.points[0][0] - b.points[0][0]);
        const stitchedPaths = [];

        for (const p of sortedPaths) {
            if (p.points.length === 0) continue;

            let merged = false;
            for (const existing of stitchedPaths) {
                const firstPt = p.points[0];
                let lastPt = existing.points[existing.points.length - 1];
                if (!lastPt) continue;

                let gapX = firstPt[0] - lastPt[0];

                // Resolve slight overlap in X (up to 80px), truncate the existing path to resolve the overlap
                if (gapX <= 0 && gapX > -80) {
                    const overlapIdx = existing.points.findIndex(pt => pt[0] >= firstPt[0]);
                    if (overlapIdx !== -1) {
                        existing.points = existing.points.slice(0, overlapIdx);
                        const newLastPt = existing.points[existing.points.length - 1];
                        if (newLastPt) {
                            lastPt = newLastPt;
                            gapX = firstPt[0] - lastPt[0];
                        } else {
                            continue;
                        }
                    }
                }

                if (gapX > 0 && gapX < 125) {
                    const gapY = Math.abs(firstPt[1] - lastPt[1]);
                    if (gapY < 300) { // Support vertical gaps up to 300px on steep curves
                        const predictedY = lastPt[1] + existing.slope * gapX;
                        const diffY = Math.abs(firstPt[1] - predictedY);

                        if (diffY < 60) {
                            // Interpolate the gap with linear interpolation
                            for (let x = lastPt[0] + 1; x < firstPt[0]; x++) {
                                const pct = (x - lastPt[0]) / gapX;
                                const interpY = lastPt[1] + pct * (firstPt[1] - lastPt[1]);
                                existing.points.push([x, interpY]);
                            }
                            existing.points.push(...p.points);
                            existing.slope = p.slope;
                            merged = true;
                            break;
                        }
                    }
                }
            }

            if (!merged) {
                stitchedPaths.push(p);
            }
        }

        let curveIndex = 1;
        const plotW = endX - startX;
        for (const path of stitchedPaths) {
            // Filter out flat, short legend segments or grid line pieces
            const pixelYs = path.points.map(pt => pt[1]);
            const meanY = pixelYs.reduce((a, b) => a + b, 0) / pixelYs.length;
            const variance = pixelYs.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0) / pixelYs.length;
            const stdDev = Math.sqrt(variance);
            
            if (stdDev < 4.0 && path.points.length < plotW * 0.40) {
                console.log(`[tracer] ${colorName}: skipped flat short segment (stdDev=${stdDev.toFixed(2)}, len=${path.points.length})`);
                continue;
            }

            // Filter out top and bottom borders
            if (meanY < startY + 10 || meanY > endY - 10) {
                console.log(`[tracer] ${colorName}: skipped border segment (avgY=${meanY.toFixed(2)}, top=${startY}, bottom=${endY})`);
                continue;
            }

            const minY = Math.min(yMinVal, yMaxVal);
            const maxY = Math.max(yMinVal, yMaxVal);
            const rawX = [], rawY = [];
            for (const [px, py] of path.points) {
                const [rx, ry] = pixToReal(px, py);
                if (isValidPt(rx, ry)) {
                    rawX.push(rx);
                    rawY.push(Math.max(minY, Math.min(maxY, ry)));
                }
            }

            if (rawX.length >= 15) {
                const smoothY = smoothArray(rawY, smoothWin);
                allCurves.push({
                    color: colorName,
                    name: `${colorName}_curve_${curveIndex++}`,
                    rawPoints: path.points,
                    data: rawX.map((x, i) => [x, smoothY[i]])
                });
            }
        }
    }

    console.log(`[jsTrace] Total curves: ${allCurves.length} (${allCurves.map(c => c.name).join(', ')})`);
    return allCurves;
}

// Helper smoothArray function locally in case script.js doesn't expose it
function smoothArray(arr, win) {
    if (win <= 1) return [...arr];
    const half = Math.floor(win / 2);
    return arr.map((_, i) => {
        let sum = 0, cnt = 0;
        for (let w = -half; w <= half; w++) {
            const j = i + w;
            if (j >= 0 && j < arr.length) { sum += arr[j]; cnt++; }
        }
        return sum / cnt;
    });
}

// ─────────────────────────────────────────────────────────────────
//  MAJORITY-CLICK GUIDED CURVE EXTRACTION ENGINE
//  Extracts the specific graph curve on which the majority of
//  the 5 clicked points lie, spanning across the entire plot domain.
// ─────────────────────────────────────────────────────────────────

/**
 * Evaluates a monotone cubic spline through a set of sorted points (x, y).
 */
function createMonotoneCubicSpline(points) {
    // Ensure points are sorted by x with unique x values
    const unique = [];
    for (let i = 0; i < points.length; i++) {
        if (i === 0 || points[i].x > points[i - 1].x + 0.5) {
            unique.push(points[i]);
        }
    }
    if (unique.length === 0) {
        const fn = () => 0;
        fn.roughness = 0;
        return fn;
    }
    if (unique.length === 1) {
        const fn = () => unique[0].y;
        fn.roughness = 0;
        return fn;
    }
    if (unique.length === 2) {
        const p0 = unique[0], p1 = unique[1];
        const m = (p1.y - p0.y) / (p1.x - p0.x || 1);
        const fn = (x) => p0.y + m * (x - p0.x);
        fn.roughness = 0;
        return fn;
    }

    const n = unique.length;
    const x = unique.map(p => p.x);
    const y = unique.map(p => p.y);
    const dx = new Float64Array(n - 1);
    const dy = new Float64Array(n - 1);
    const m = new Float64Array(n - 1);

    for (let i = 0; i < n - 1; i++) {
        dx[i] = x[i + 1] - x[i];
        dy[i] = y[i + 1] - y[i];
        m[i] = dy[i] / (dx[i] || 1e-6);
    }

    // Tangents
    const c = new Float64Array(n);
    c[0] = m[0];
    for (let i = 1; i < n - 1; i++) {
        if (m[i - 1] * m[i] <= 0) {
            c[i] = 0;
        } else {
            const common = dx[i - 1] + dx[i];
            c[i] = (3 * common) / ((common + dx[i]) / m[i - 1] + (common + dx[i - 1]) / m[i]);
        }
    }
    c[n - 1] = m[n - 2];

    // Compute roughness penalty based on slope variance
    let roughness = 0;
    for (let i = 1; i < n; i++) {
        roughness += Math.abs(c[i] - c[i - 1]);
    }

    function evaluate(evalX) {
        if (evalX <= x[0]) {
            return y[0] + c[0] * (evalX - x[0]);
        }
        if (evalX >= x[n - 1]) {
            return y[n - 1] + c[n - 1] * (evalX - x[n - 1]);
        }

        // Binary search for interval
        let low = 0, high = n - 2;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (evalX >= x[mid] && evalX <= x[mid + 1]) {
                const h = dx[mid] || 1e-6;
                const t = (evalX - x[mid]) / h;
                const t2 = t * t;
                const t3 = t2 * t;
                const h00 = 2 * t3 - 3 * t2 + 1;
                const h10 = t3 - 2 * t2 + t;
                const h01 = -2 * t3 + 3 * t2;
                const h11 = t3 - t2;
                return h00 * y[mid] + h10 * h * c[mid] + h01 * y[mid + 1] + h11 * h * c[mid + 1];
            } else if (evalX < x[mid]) {
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }
        return y[n - 1];
    }

    evaluate.roughness = roughness;
    return evaluate;
}

/**
 * Extracts the single complete curve that contains the majority of the clicked dots
 * using true image-guided dynamic ridge tracking and color signature profiling.
 */
async function cvExtractCurveByMajorityClicks(srcCanvas, clickPoints, colorMode, vertices, xRange, yRange, configs = {}) {
    if (!clickPoints || clickPoints.length === 0) {
        throw new Error("No click points provided for majority curve extraction.");
    }

    const W = srcCanvas.width;
    const H = srcCanvas.height;

    // Standard calibrated bounds
    const origin = vertices && vertices[0] ? vertices[0] : { x: Math.floor(W * 0.12), y: Math.floor(H * 0.82) };
    const xMaxV  = vertices && vertices[1] ? vertices[1] : { x: Math.floor(W * 0.90), y: Math.floor(H * 0.82) };
    const yMaxV  = vertices && vertices[2] ? vertices[2] : { x: Math.floor(W * 0.12), y: Math.floor(H * 0.18) };

    const startX = Math.max(0, Math.floor(origin.x));
    const endX = Math.min(W - 1, Math.floor(xMaxV.x));
    const startY = Math.max(0, Math.floor(yMaxV.y));
    const endY = Math.min(H - 1, Math.floor(origin.y));

    const xMinVal = xRange[0], xMaxVal = xRange[1];
    const yMinVal = yRange[0], yMaxVal = yRange[1];
    const smoothWin = configs.smoothingWindow || 5;
    const xScaleType = configs.xScaleType || 'linear';
    const yScaleType = configs.yScaleType || 'linear';
    const whitenessThresh = configs.whitenessThresh !== undefined ? configs.whitenessThresh : 220;

    function pixToReal(px, py) {
        const xPct = (px - origin.x) / (xMaxV.x - origin.x || 1);
        const yPct = (origin.y - py) / (origin.y - yMaxV.y || 1);
        let rx, ry;
        if (xScaleType === 'log' && xMinVal > 0 && xMaxVal > 0) {
            const logMin = Math.log10(xMinVal), logMax = Math.log10(xMaxVal);
            rx = Math.pow(10, logMin + xPct * (logMax - logMin));
        } else {
            rx = xMinVal + xPct * (xMaxVal - xMinVal);
        }
        if (yScaleType === 'log' && yMinVal > 0 && yMaxVal > 0) {
            const logMin = Math.log10(yMinVal), logMax = Math.log10(yMaxVal);
            ry = Math.pow(10, logMin + yPct * (logMax - logMin));
        } else {
            ry = yMinVal + yPct * (yMaxVal - yMinVal);
        }
        return [rx, ry];
    }

    function isValidPt(rx, ry) {
        if (isNaN(rx) || isNaN(ry)) return false;
        const minX = Math.min(xMinVal, xMaxVal);
        const maxX = Math.max(xMinVal, xMaxVal);
        const minY = Math.min(yMinVal, yMaxVal);
        const maxY = Math.max(yMinVal, yMaxVal);
        const xMargin = (maxX - minX) * 0.05 || 2;
        const yMargin = (maxY - minY) * 0.08 || 0.05;
        return (rx >= minX - xMargin && rx <= maxX + xMargin &&
                ry >= minY - yMargin && ry <= maxY + yMargin);
    }

    // Get raw image pixels
    const ctx = srcCanvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, W, H);
    const pixels = imgData.data;

    const scribble = document.getElementById('scribble-canvas');
    let scribbleData = null;
    if (scribble) {
        scribbleData = scribble.getContext('2d').getImageData(0, 0, W, H).data;
    }

    // Convert input click points to canvas pixel coordinates
    const pixelClicks = clickPoints.map((pt, idx) => {
        const px = pt.x <= 1.0 ? Math.round(pt.x * W) : Math.round(pt.x);
        const py = pt.y <= 1.0 ? Math.round(pt.y * H) : Math.round(pt.y);
        return { x: Math.max(0, Math.min(W - 1, px)), y: Math.max(0, Math.min(H - 1, py)), originalIdx: idx };
    });

    // ── STEP 1: REFINE ANCHORS ONTO TRUE CURVE PIXELS & SAMPLE COLOR SIGNATURE ──
    const refinedAnchors = [];
    const colorSamples = [];

    for (const pt of pixelClicks) {
        let bestPx = pt.x, bestPy = pt.y;
        let bestR = 0, bestG = 0, bestB = 0;
        let minLum = Infinity;

        // Search 11x11 window around clicked point for purest line pixel
        for (let dy = -5; dy <= 5; dy++) {
            for (let dx = -5; dx <= 5; dx++) {
                const qx = pt.x + dx;
                const qy = pt.y + dy;
                if (qx < 0 || qx >= W || qy < 0 || qy >= H) continue;
                const idx = (qy * W + qx) * 4;
                if (scribbleData && scribbleData[idx + 3] > 0) continue;
                const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
                if (r >= whitenessThresh && g >= whitenessThresh && b >= whitenessThresh) continue;

                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                const spatialDist = dx * dx + dy * dy;
                const score = lum + spatialDist * 3;

                if (score < minLum) {
                    minLum = score;
                    bestPx = qx;
                    bestPy = qy;
                    bestR = r;
                    bestG = g;
                    bestB = b;
                }
            }
        }

        refinedAnchors.push({ x: bestPx, y: bestPy, originalIdx: pt.originalIdx });
        colorSamples.push({ r: bestR, g: bestG, b: bestB });
    }

    // Compute average curve color signature from click points
    const avgR = colorSamples.reduce((s, c) => s + c.r, 0) / colorSamples.length;
    const avgG = colorSamples.reduce((s, c) => s + c.g, 0) / colorSamples.length;
    const avgB = colorSamples.reduce((s, c) => s + c.b, 0) / colorSamples.length;

    // Detect if targeted curve is blue, red, etc.
    const isTargetBlue = (avgB > avgR + 15 && avgB > avgG);
    const isTargetRed = (avgR > avgB + 20 && avgR > avgG + 15);

    function getPixelColorPenalty(px, py) {
        if (px < 0 || px >= W || py < 0 || py >= H) return 999;
        const idx = (py * W + px) * 4;
        if (scribbleData && scribbleData[idx + 3] > 0) return 999;
        const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
        if (r >= whitenessThresh && g >= whitenessThresh && b >= whitenessThresh) return 999;

        // If user clicked blue curve, heavily penalize red pixels
        if (isTargetBlue && r > b + 20) return 400;
        if (isTargetRed && b > r + 20) return 400;

        const dCol = Math.sqrt((r - avgR) ** 2 + (g - avgG) ** 2 + (b - avgB) ** 2);
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        return dCol * 0.5 + lum * 0.2;
    }

    function isLinePixel(px, py) {
        if (px < 0 || px >= W || py < 0 || py >= H) return false;
        const idx = (py * W + px) * 4;
        if (scribbleData && scribbleData[idx + 3] > 0) return false;
        const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
        if (r >= whitenessThresh && g >= whitenessThresh && b >= whitenessThresh) return false;
        if (isTargetBlue && r > b + 20) return false;
        if (isTargetRed && b > r + 20) return false;
        return isColorMatch(r, g, b, colorMode, whitenessThresh);
    }

    // Sort refined anchors by X
    const anchors = [...refinedAnchors].sort((a, b) => a.x - b.x);

    // ── STEP 2: TRACE INNER SEGMENTS BETWEEN ANCHORS ──
    const columnMap = new Map(); // px -> py

    for (let i = 0; i < anchors.length - 1; i++) {
        const a1 = anchors[i];
        const a2 = anchors[i + 1];
        if (a2.x <= a1.x) continue;

        let curY = a1.y;
        columnMap.set(a1.x, a1.y);

        for (let px = a1.x + 1; px <= a2.x; px++) {
            const frac = (px - a1.x) / (a2.x - a1.x);
            const linearY = a1.y + frac * (a2.y - a1.y);

            // Vertical scan window
            const scanMin = Math.max(startY, Math.round(Math.min(curY, linearY) - 50));
            const scanMax = Math.min(endY, Math.round(Math.max(curY, linearY) + 50));

            // Find contiguous pixel runs in column px
            const runs = [];
            let inRun = false;
            let rStart = 0;

            for (let py = scanMin; py <= scanMax; py++) {
                if (isLinePixel(px, py)) {
                    if (!inRun) { rStart = py; inRun = true; }
                } else {
                    if (inRun) {
                        runs.push({ center: (rStart + py - 1) / 2, start: rStart, end: py - 1 });
                        inRun = false;
                    }
                }
            }
            if (inRun) {
                runs.push({ center: (rStart + scanMax) / 2, start: rStart, end: scanMax });
            }

            let bestY = null;
            let lowestCost = Infinity;

            for (const run of runs) {
                const cost = Math.abs(run.center - curY) * 1.2 +
                             Math.abs(run.center - linearY) * 0.4 +
                             getPixelColorPenalty(px, Math.round(run.center));

                if (cost < lowestCost) {
                    lowestCost = cost;
                    bestY = Math.round(run.center);
                }
            }

            if (bestY !== null) {
                curY = bestY;
            } else {
                curY = Math.round(linearY);
            }
            columnMap.set(px, curY);
        }
    }

    // ── STEP 3: EXTEND TO THE RIGHT (A_last -> endX) WITH MOMENTUM ──
    const lastA = anchors[anchors.length - 1];
    const prevA = anchors.length >= 2 ? anchors[anchors.length - 2] : { x: lastA.x - 10, y: lastA.y };
    let rightY = lastA.y;
    let rightSlope = (lastA.y - prevA.y) / (lastA.x - prevA.x || 1);
    rightSlope = Math.max(-3.0, Math.min(3.0, rightSlope));

    for (let px = lastA.x + 1; px <= endX; px++) {
        const predY = rightY + rightSlope;
        const scanMin = Math.max(startY, Math.round(predY - 45));
        const scanMax = Math.min(endY, Math.round(predY + 45));

        const runs = [];
        let inRun = false;
        let rStart = 0;

        for (let py = scanMin; py <= scanMax; py++) {
            if (isLinePixel(px, py)) {
                if (!inRun) { rStart = py; inRun = true; }
            } else {
                if (inRun) {
                    runs.push({ center: (rStart + py - 1) / 2 });
                    inRun = false;
                }
            }
        }
        if (inRun) runs.push({ center: (rStart + scanMax) / 2 });

        let bestY = null;
        let minDiff = Infinity;

        for (const run of runs) {
            const diff = Math.abs(run.center - predY) + (getPixelColorPenalty(px, Math.round(run.center)) * 0.1);
            if (diff < minDiff && Math.abs(run.center - predY) <= 45) {
                minDiff = diff;
                bestY = Math.round(run.center);
            }
        }

        if (bestY !== null) {
            rightSlope = 0.75 * rightSlope + 0.25 * (bestY - rightY);
            rightSlope = Math.max(-3.0, Math.min(3.0, rightSlope));
            rightY = bestY;
        } else {
            rightY = Math.max(startY, Math.min(endY, Math.round(rightY + rightSlope)));
            rightSlope *= 0.90; // Level off smoothly
        }
        columnMap.set(px, rightY);
    }

    // ── STEP 4: EXTEND TO THE LEFT (A_first -> startX) WITH MOMENTUM ──
    const firstA = anchors[0];
    const nextA = anchors.length >= 2 ? anchors[1] : { x: firstA.x + 10, y: firstA.y };
    let leftY = firstA.y;
    let leftSlope = (firstA.y - nextA.y) / (nextA.x - firstA.x || 1);
    leftSlope = Math.max(-3.0, Math.min(3.0, leftSlope));

    for (let px = firstA.x - 1; px >= startX; px--) {
        const predY = leftY + leftSlope;
        const scanMin = Math.max(startY, Math.round(predY - 45));
        const scanMax = Math.min(endY, Math.round(predY + 45));

        const runs = [];
        let inRun = false;
        let rStart = 0;

        for (let py = scanMin; py <= scanMax; py++) {
            if (isLinePixel(px, py)) {
                if (!inRun) { rStart = py; inRun = true; }
            } else {
                if (inRun) {
                    runs.push({ center: (rStart + py - 1) / 2 });
                    inRun = false;
                }
            }
        }
        if (inRun) runs.push({ center: (rStart + scanMax) / 2 });

        let bestY = null;
        let minDiff = Infinity;

        for (const run of runs) {
            const diff = Math.abs(run.center - predY) + (getPixelColorPenalty(px, Math.round(run.center)) * 0.1);
            if (diff < minDiff && Math.abs(run.center - predY) <= 45) {
                minDiff = diff;
                bestY = Math.round(run.center);
            }
        }

        if (bestY !== null) {
            leftSlope = 0.75 * leftSlope + 0.25 * (bestY - leftY);
            leftSlope = Math.max(-3.0, Math.min(3.0, leftSlope));
            leftY = bestY;
        } else {
            leftY = Math.max(startY, Math.min(endY, Math.round(leftY + leftSlope)));
            leftSlope *= 0.90;
        }
        columnMap.set(px, leftY);
    }

    // ── STEP 5: ASSEMBLE, SMOOTH & CONVERT TO CALIBRATED SPECTRAL COORDS ──
    const fullTracedPoints = [];
    for (let px = startX; px <= endX; px++) {
        const py = columnMap.has(px) ? columnMap.get(px) : Math.round((startY + endY) / 2);
        fullTracedPoints.push({ x: px, y: py });
    }

    const rawYList = fullTracedPoints.map(p => p.y);
    const smoothedYList = smoothArray(rawYList, smoothWin);
    const finalPixelPoints = fullTracedPoints.map((p, idx) => [p.x, Math.round(smoothedYList[idx])]);

    const realDataPoints = [];
    const minY = Math.min(yMinVal, yMaxVal);
    const maxY = Math.max(yMinVal, yMaxVal);

    for (let i = 0; i < finalPixelPoints.length; i++) {
        const [px, py] = finalPixelPoints[i];
        const [rx, ry] = pixToReal(px, py);
        if (isValidPt(rx, ry)) {
            realDataPoints.push([rx, Math.max(minY, Math.min(maxY, ry))]);
        }
    }

    // Inlier check against original click points (distance <= 22px)
    let inlierCount = 0;
    const inlierIndices = [];
    for (const pt of pixelClicks) {
        const matched = finalPixelPoints.find(p => Math.abs(p[0] - pt.x) <= 2);
        if (matched) {
            const dist = Math.abs(matched[1] - pt.y);
            if (dist <= 22) {
                inlierCount++;
                inlierIndices.push(pt.originalIdx);
            }
        }
    }

    const detectedColor = isTargetBlue ? 'blue' : (isTargetRed ? 'red' : (colorMode === 'grayscale' ? 'blue' : colorMode));

    return {
        name: 'majority_clicked_curve',
        color: detectedColor,
        rawPoints: finalPixelPoints,
        data: realDataPoints,
        inlierCount: inlierCount,
        totalClicks: pixelClicks.length,
        inlierIndices: inlierIndices,
        majorityPercentage: Math.round((inlierCount / pixelClicks.length) * 100)
    };
}
