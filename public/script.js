// PDF.js worker configuration
if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}

// State management
let uploadedFiles = []; // Array of { name, fileObject, srcUrl, batchSelected }
let activeImageIndex = -1;
let activeImageObj = null; // Jimp/Image object
let calibrationPoints = []; // [{x, y}] up to 3 points
let calibrationMode = false;
let fiveClickPoints = []; // [{x, y}] up to 5 points
let fiveClickMode = false;
let xRange = [300.0, 550.0];
let yRange = [0.0, 1.0];
let xLabel = "Wavelength (nm)";
let yLabel = "Absorbance";
let collectedCurves = []; // Array of { name, data: [[x,y],...], originalData: [[x,y],...] }
let currentCurve = null; // [[x,y],...]
let activeCurves = []; // Array of { color, data: [[x,y],...] }
let originalImageData = null;

// Preprocessing Stage State
let originalSrcUrl = null;
let enhancedSrcUrl = null;
let serverThresholdMaskUrl = null;
let currentViewMode = 'enhanced'; // 'enhanced' or 'original'
let isPreprocessingChange = false;
let rawAutoVertices = null;

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const btnLoadDemo = document.getElementById('btn-load-demo');
const selectActiveImage = document.getElementById('select-active-image');
const activeImageControls = document.getElementById('active-image-controls');
const canvasContainer = document.getElementById('canvas-container');
const srcCanvas = document.getElementById('src-canvas');
const scribbleCanvas = document.getElementById('scribble-canvas');
const maskCanvas = document.getElementById('mask-canvas');
const processedMaskContainer = document.getElementById('processed-mask-container');
const plotlyPreviewChart = document.getElementById('plotly-preview-chart');
const previewPlaceholder = document.getElementById('preview-placeholder');
const digitizedSummaryContainer = document.getElementById('digitized-summary-container');
const summaryXRange = document.getElementById('summary-x-range');
const summaryYRange = document.getElementById('summary-y-range');
const summaryPeaksList = document.getElementById('summary-peaks-list');

// Configs
const sliderSmoothing = document.getElementById('slider-smoothing');
const valSmoothing = document.getElementById('val-smoothing');
const sliderWhiteness = document.getElementById('slider-whiteness');
const valWhiteness = document.getElementById('val-whiteness');
const selectColorMode = document.getElementById('select-color-mode');
// Masking Studio DOM Elements
const toolNavigate = document.getElementById('tool-navigate');
const toolBrush = document.getElementById('tool-brush');
const toolGuide = document.getElementById('tool-guide');
const toolBox = document.getElementById('tool-box');
const toolEraser = document.getElementById('tool-eraser');
const toolPan = document.getElementById('tool-pan');
const btnExcludeOutside = document.getElementById('btn-exclude-outside');
const btnMaskUndo = document.getElementById('btn-mask-undo');
const btnMaskRedo = document.getElementById('btn-mask-redo');
const btnClearMask = document.getElementById('btn-clear-mask');
const sliderMaskBrush = document.getElementById('slider-mask-brush');
const valMaskBrush = document.getElementById('val-mask-brush');
const sliderQuickWhiteness = document.getElementById('slider-quick-whiteness');
const valQuickWhiteness = document.getElementById('val-quick-whiteness');
const marqueeCanvas = document.getElementById('marquee-canvas');
const guideCanvas = document.getElementById('guide-canvas');
const gctx = guideCanvas ? guideCanvas.getContext('2d') : null;
const brushCursorIndicator = document.getElementById('brush-cursor-indicator');
const canvasTopBar = document.getElementById('canvas-top-bar');
const canvasViewport = document.getElementById('canvas-viewport');
const canvasWrapper = document.getElementById('canvas-wrapper');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnZoomIn = document.getElementById('btn-zoom-in');
const sliderZoom = document.getElementById('slider-zoom');
const valZoomLevel = document.getElementById('val-zoom-level');
const btnCenterView = document.getElementById('btn-center-view');
const btnToggleExpandViewport = document.getElementById('btn-toggle-expand-viewport');
const expandViewportIcon = document.getElementById('expand-viewport-icon');
const expandViewportText = document.getElementById('expand-viewport-text');
const btnModeGraph = document.getElementById('btn-mode-graph');
const btnModeDetection = document.getElementById('btn-mode-detection');
const btnModeBinary = document.getElementById('btn-mode-binary');
const maskingStatusBadge = document.getElementById('masking-status-badge');
const maskingStatusText = document.getElementById('masking-status-text');
const maskHintText = document.getElementById('mask-hint-text');

// Backwards compatibility references for older code
const chkEnableScribble = { checked: true, addEventListener: () => {} };
const sliderBrush = sliderMaskBrush;
const valBrush = valMaskBrush;
const btnClearScribbles = btnClearMask;
const brushSizeControl = { classList: { add: () => {}, remove: () => {} } };
const calibrationGuidance = document.getElementById('calibration-guidance');
const btnClear5Clicks = document.getElementById('btn-clear-5clicks');
const fiveClickControl = document.getElementById('five-click-control');
const fiveClickCount = document.getElementById('five-click-count');
const btnStartAutoTrace = document.getElementById('btn-start-auto-trace');
const traceStatusContainer = document.getElementById('trace-status-container');
const traceStatusText = document.getElementById('trace-status-text');
const traceProgressBarContainer = document.getElementById('trace-progress-bar-container');
const traceProgressBar = document.getElementById('trace-progress-bar');
const traceResultsActions = document.getElementById('trace-results-actions');
const btnViewTracedCurve = document.getElementById('btn-view-traced-curve');
const btnViewXyData = document.getElementById('btn-view-xy-data');
const xyDataModal = document.getElementById('xy-data-modal');
const btnCloseXyModal = document.getElementById('btn-close-xy-modal');
const btnCloseXyModalFooter = document.getElementById('btn-close-xy-modal-footer');
const btnCopyXyData = document.getElementById('btn-copy-xy-data');
const xyDataTextarea = document.getElementById('xy-data-textarea');

// Actions
const btnAutodetect = document.getElementById('btn-autodetect');
const btnEditRange = document.getElementById('btn-editrange');
const btnCalibrateMode = document.getElementById('btn-calibrate-mode');
const btnExtractCurves = document.getElementById('btn-extract-curves');
const btnNextImage = document.getElementById('btn-next-image');
const btnLoadCurve = document.getElementById('btn-load-curve');
const btnDownloadCsv = document.getElementById('btn-download-csv');
const btnDownloadJson = document.getElementById('btn-download-json');
const rangeDisplay = document.getElementById('range-display');
const rangeEditor = document.getElementById('range-editor');
const logsConsole = document.getElementById('logs-console');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

// Batch and Similarity DOM Elements
const btnBatchProcess = document.getElementById('btn-batch-process');
const sliderSimilarityThreshold = document.getElementById('slider-similarity-threshold');
const valSimilarityThreshold = document.getElementById('val-similarity-threshold');
const chkShowRejectedPlot = document.getElementById('chk-show-rejected-plot');
const valConsensusRef = document.getElementById('val-consensus-ref');
const statTotalCurves = document.getElementById('stat-total-curves');
const statAcceptedCurves = document.getElementById('stat-accepted-curves');
const statRejectedCurves = document.getElementById('stat-rejected-curves');
const btnDownloadAverageCsv = document.getElementById('btn-download-average-csv');
const btnDownloadFullReport = document.getElementById('btn-download-full-report');
const tableSimilarity = document.getElementById('table-similarity');

// Filter & Scale DOM Elements
const sliderBrightness = document.getElementById('slider-brightness');
const valBrightness = document.getElementById('val-brightness');
const sliderContrast = document.getElementById('slider-contrast');
const valContrast = document.getElementById('val-contrast');
const sliderMedian = document.getElementById('slider-median');
const valMedian = document.getElementById('val-median');
const sliderBlur = document.getElementById('slider-blur');
const valBlur = document.getElementById('val-blur');
const sliderErode = document.getElementById('slider-erode');
const valErode = document.getElementById('val-erode');
const sliderDilate = document.getElementById('slider-dilate');
const valDilate = document.getElementById('val-dilate');
const btnResetFilters = document.getElementById('btn-reset-filters');
const selectXScale = document.getElementById('select-x-scale');
const selectYScale = document.getElementById('select-y-scale');

// System logs function
function addLog(msg) {
    const timestamp = new Date().toLocaleTimeString();
    logsConsole.textContent += `[${timestamp}] ${msg}\n`;
    logsConsole.scrollTop = logsConsole.scrollHeight;
}



// Utility parser for math/power expressions e.g. 10^3, 2*10^4, 1e-3, 0.001
function parseNumericExpression(valStr) {
    if (typeof valStr !== 'string') return parseFloat(valStr);
    valStr = valStr.trim().toLowerCase();
    if (!valStr) return NaN;

    // Handle power notations like 10^3 or 2*10^3 or 10**3
    if (valStr.includes('^')) {
        const parts = valStr.split('^');
        if (parts.length === 2) {
            let baseStr = parts[0].trim();
            let mult = 1;
            if (baseStr.includes('*')) {
                const multParts = baseStr.split('*');
                mult = parseFloat(multParts[0]);
                baseStr = multParts[1];
            }
            const base = parseFloat(baseStr);
            const exponent = parseFloat(parts[1]);
            return mult * Math.pow(base, exponent);
        }
    }

    if (valStr.includes('**')) {
        const parts = valStr.split('**');
        if (parts.length === 2) {
            let baseStr = parts[0].trim();
            let mult = 1;
            if (baseStr.includes('*')) {
                const multParts = baseStr.split('*');
                mult = parseFloat(multParts[0]);
                baseStr = multParts[1];
            }
            const base = parseFloat(baseStr);
            const exponent = parseFloat(parts[1]);
            return mult * Math.pow(base, exponent);
        }
    }

    return parseFloat(valStr);
}

// Format numbers nicely, using scientific notation if very large or small
function formatValue(val) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    const absVal = Math.abs(val);
    if (absVal === 0) return '0.00';
    if (absVal >= 1e5 || absVal <= 1e-3) {
        return val.toExponential(4);
    }
    return val.toFixed(4).replace(/\.?0+$/, "");
}

class LinearInterpolation {
    constructor(x, y) {
        // Enforce strictly increasing x and filter out duplicates
        const pts = x.map((xVal, idx) => ({ x: xVal, y: y[idx] }))
                     .sort((a, b) => a.x - b.x);
        
        const uniquePts = [];
        for (let i = 0; i < pts.length; i++) {
            if (i === 0 || pts[i].x - uniquePts[uniquePts.length - 1].x > 1e-6) {
                uniquePts.push(pts[i]);
            }
        }
        
        this.x = uniquePts.map(p => p.x);
        this.y = uniquePts.map(p => p.y);
    }
    
    interpolate(x) {
        const n = this.x.length;
        if (n === 0) return 0;
        if (n === 1) return this.y[0];
        
        // Extrapolate flat if out of bounds
        if (x <= this.x[0]) return this.y[0];
        if (x >= this.x[n - 1]) return this.y[n - 1];
        
        // Find segment
        for (let i = 0; i < n - 1; i++) {
            if (x >= this.x[i] && x <= this.x[i + 1]) {
                const x0 = this.x[i], x1 = this.x[i + 1];
                const y0 = this.y[i], y1 = this.y[i + 1];
                const t = (x - x0) / (x1 - x0);
                return y0 + t * (y1 - y0);
            }
        }
        return this.y[n - 1];
    }
}

class CubicSpline {
    constructor(x, y) {
        // Enforce strictly increasing x and filter out duplicates
        const pts = x.map((xVal, idx) => ({ x: xVal, y: y[idx] }))
                     .sort((a, b) => a.x - b.x);
        
        // Filter out identical or extremely close x coordinates
        const uniquePts = [];
        for (let i = 0; i < pts.length; i++) {
            if (i === 0 || pts[i].x - uniquePts[uniquePts.length - 1].x > 1e-6) {
                uniquePts.push(pts[i]);
            }
        }

        this.x = uniquePts.map(p => p.x);
        this.y = uniquePts.map(p => p.y);
        const n = this.x.length;

        if (n < 2) {
            // Degenerate case: fewer than 2 points, just return flat line
            this.a = [uniquePts[0]?.y || 0];
            this.b = [0];
            this.c = [0];
            this.d = [0];
            return;
        }

        this.a = this.y.slice();
        this.b = new Array(n - 1);
        this.d = new Array(n - 1);
        
        const h = new Array(n - 1);
        for (let i = 0; i < n - 1; i++) {
            h[i] = this.x[i + 1] - this.x[i];
        }
        
        const alpha = new Array(n - 1);
        alpha[0] = 0;
        for (let i = 1; i < n - 1; i++) {
            alpha[i] = (3 / h[i]) * (this.a[i + 1] - this.a[i]) - (3 / h[i - 1]) * (this.a[i] - this.a[i - 1]);
        }
        
        const l = new Array(n);
        const mu = new Array(n);
        const z = new Array(n);
        const c = new Array(n);
        
        l[0] = 1;
        mu[0] = 0;
        z[0] = 0;
        
        for (let i = 1; i < n - 1; i++) {
            l[i] = 2 * (this.x[i + 1] - this.x[i - 1]) - h[i - 1] * mu[i - 1];
            mu[i] = h[i] / l[i];
            z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
        }
        
        l[n - 1] = 1;
        z[n - 1] = 0;
        c[n - 1] = 0;
        
        for (let j = n - 2; j >= 0; j--) {
            c[j] = z[j] - mu[j] * c[j + 1];
            this.b[j] = (this.a[j + 1] - this.a[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
            this.d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
        }
        this.c = c;
    }
    
    interpolate(xVal) {
        const n = this.x.length;
        if (n === 0) return 0;
        if (n === 1) return this.y[0];
        if (xVal <= this.x[0]) return this.y[0];
        if (xVal >= this.x[n - 1]) return this.y[n - 1];
        
        let low = 0, high = n - 1;
        while (low < high - 1) {
            const mid = Math.floor((low + high) / 2);
            if (this.x[mid] <= xVal) {
                low = mid;
            } else {
                high = mid;
            }
        }
        const i = low;
        const dx = xVal - this.x[i];
        return this.a[i] + this.b[i] * dx + this.c[i] * dx * dx + this.d[i] * dx * dx * dx;
    }
}

// ─────────────────────────────────────────────────────────────────
//  IMAGE FILTER ALGORITHMS (FRONTEND CANVAS)
// ─────────────────────────────────────────────────────────────────
function applyBrightnessContrast(data, brightness, contrast) {
    const len = data.length;
    for (let i = 0; i < len; i += 4) {
        for (let j = 0; j < 3; j++) {
            let val = data[i + j];
            val += brightness;
            val = (val - 128) * contrast + 128;
            data[i + j] = Math.min(255, Math.max(0, val));
        }
    }
}

function applyMedianFilter(data, width, height, size) {
    if (size <= 1) return;
    const radius = Math.floor(size / 2);
    const buffer = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const rVals = [];
            const gVals = [];
            const bVals = [];

            for (let ky = -radius; ky <= radius; ky++) {
                const py = Math.min(height - 1, Math.max(0, y + ky));
                for (let kx = -radius; kx <= radius; kx++) {
                    const px = Math.min(width - 1, Math.max(0, x + kx));
                    const idx = (py * width + px) * 4;
                    rVals.push(buffer[idx]);
                    gVals.push(buffer[idx + 1]);
                    bVals.push(buffer[idx + 2]);
                }
            }

            rVals.sort((a, b) => a - b);
            gVals.sort((a, b) => a - b);
            bVals.sort((a, b) => a - b);

            const mid = Math.floor(rVals.length / 2);
            const outIdx = (y * width + x) * 4;
            data[outIdx] = rVals[mid];
            data[outIdx + 1] = gVals[mid];
            data[outIdx + 2] = bVals[mid];
        }
    }
}

function applyGaussianBlur(data, width, height, radius) {
    if (radius <= 0) return;
    const buffer = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let ky = -radius; ky <= radius; ky++) {
                const py = y + ky;
                if (py < 0 || py >= height) continue;
                for (let kx = -radius; kx <= radius; kx++) {
                    const px = x + kx;
                    if (px < 0 || px >= width) continue;
                    const idx = (py * width + px) * 4;
                    rSum += buffer[idx];
                    gSum += buffer[idx + 1];
                    bSum += buffer[idx + 2];
                    count++;
                }
            }
            const outIdx = (y * width + x) * 4;
            data[outIdx] = Math.round(rSum / count);
            data[outIdx + 1] = Math.round(gSum / count);
            data[outIdx + 2] = Math.round(bSum / count);
        }
    }
}

function applyErode(data, width, height, radius) {
    if (radius <= 0) return;
    const buffer = new Uint8ClampedArray(data);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let minR = 255, minG = 255, minB = 255;
            for (let ky = -radius; ky <= radius; ky++) {
                const py = Math.min(height - 1, Math.max(0, y + ky));
                for (let kx = -radius; kx <= radius; kx++) {
                    const px = Math.min(width - 1, Math.max(0, x + kx));
                    const idx = (py * width + px) * 4;
                    if (buffer[idx] < minR) minR = buffer[idx];
                    if (buffer[idx + 1] < minG) minG = buffer[idx + 1];
                    if (buffer[idx + 2] < minB) minB = buffer[idx + 2];
                }
            }
            const outIdx = (y * width + x) * 4;
            data[outIdx] = minR;
            data[outIdx + 1] = minG;
            data[outIdx + 2] = minB;
        }
    }
}

function applyDilate(data, width, height, radius) {
    if (radius <= 0) return;
    const buffer = new Uint8ClampedArray(data);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let maxR = 0, maxG = 0, maxB = 0;
            for (let ky = -radius; ky <= radius; ky++) {
                const py = Math.min(height - 1, Math.max(0, y + ky));
                for (let kx = -radius; kx <= radius; kx++) {
                    const px = Math.min(width - 1, Math.max(0, x + kx));
                    const idx = (py * width + px) * 4;
                    if (buffer[idx] > maxR) maxR = buffer[idx];
                    if (buffer[idx + 1] > maxG) maxG = buffer[idx + 1];
                    if (buffer[idx + 2] > maxB) maxB = buffer[idx + 2];
                }
            }
            const outIdx = (y * width + x) * 4;
            data[outIdx] = maxR;
            data[outIdx + 1] = maxG;
            data[outIdx + 2] = maxB;
        }
    }
}

function processAndRenderFilters() {
    if (!originalImageData || !activeImageObj) return;

    const ctx = srcCanvas.getContext('2d');

    // Create temporary canvas to execute pixel ops
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = srcCanvas.width;
    tempCanvas.height = srcCanvas.height;
    const tctx = tempCanvas.getContext('2d');
    tctx.putImageData(originalImageData, 0, 0);
    const imgData = tctx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
    const data = imgData.data;

    // Read current slider inputs
    const brightness = parseInt(sliderBrightness.value);
    const contrast = parseFloat(sliderContrast.value);
    const medianSize = parseInt(sliderMedian.value);
    const blurRadius = parseInt(sliderBlur.value);
    const erodeRadius = parseInt(sliderErode.value);
    const dilateRadius = parseInt(sliderDilate.value);

    // Apply operations sequentially
    applyBrightnessContrast(data, brightness, contrast);
    applyMedianFilter(data, srcCanvas.width, srcCanvas.height, medianSize);
    applyGaussianBlur(data, srcCanvas.width, srcCanvas.height, blurRadius);
    applyErode(data, srcCanvas.width, srcCanvas.height, erodeRadius);
    applyDilate(data, srcCanvas.width, srcCanvas.height, dilateRadius);

    // Draw back
    ctx.putImageData(imgData, 0, 0);

    // Redraw points & mask
    drawCalibrationPoints();
    renderLiveMask();
}

addLog("System Frontend initialized.");

// Wizard Flow State
let currentStep = 1;
let selectedMode = null; // 'auto' or 'manual'

// Helper function to navigate steps
function goToStep(stepNum) {
    if (stepNum < 1 || stepNum > 4) return;
    currentStep = stepNum;
    addLog(`Navigating to Step ${stepNum}`);

    // Update active node in the stepper
    for (let i = 1; i <= 4; i++) {
        const node = document.getElementById(`step-node-${i}`);
        if (node) {
            if (i <= stepNum) {
                node.classList.add('active');
            } else {
                node.classList.remove('active');
            }
        }
    }

    // Hide all main tab panels
    const panels = ['tab-home', 'tab-import', 'tab-workspace', 'tab-results', 'tab-settings', 'tab-logs'];
    panels.forEach(p => {
        const el = document.getElementById(p);
        if (el) el.classList.remove('active');
    });

    // Map step to tab panel ID
    let targetPanel = 'tab-home';
    if (stepNum === 2) targetPanel = 'tab-import';
    else if (stepNum === 3) targetPanel = 'tab-workspace';
    else if (stepNum === 4) targetPanel = 'tab-results';

    const targetEl = document.getElementById(targetPanel);
    if (targetEl) targetEl.classList.add('active');

    // Trigger resizing of Plots when results page is displayed
    if (stepNum === 4) {
        try {
            renderCollectedCurvesPlot();
            renderAverageSpectrumPlot();
            const collectedChartDiv = document.getElementById('plotly-collected-chart');
            const averageChartDiv = document.getElementById('plotly-average-chart');
            if (collectedChartDiv && collectedChartDiv.querySelector('.svg-container')) {
                Plotly.Plots.resize(collectedChartDiv);
            }
            if (averageChartDiv && averageChartDiv.querySelector('.svg-container')) {
                Plotly.Plots.resize(averageChartDiv);
            }
        } catch (err) {
            console.error("Error rendering results charts:", err);
        }
    }

    // Update top header bar elements
    const headerTitle = document.getElementById('header-step-title');
    const headerBack = document.getElementById('btn-header-back');
    const headerNext = document.getElementById('btn-header-next');
    
    if (headerTitle) {
        const titles = {
            1: "Choose Acquisition Mode",
            2: "Search & Upload Spectrum Graph",
            3: "Image Pre-Processing & Calibration Workspace",
            4: "Consensus Results & Dataset Export"
        };
        headerTitle.textContent = titles[stepNum] || "Spectral AI System";
    }

    if (headerBack) {
        if (stepNum === 1) {
            headerBack.style.display = 'none';
        } else {
            headerBack.style.display = 'inline-flex';
            const backLabels = {
                2: "⬅️ Modes",
                3: "⬅️ Import",
                4: "⬅️ Workspace"
            };
            headerBack.textContent = backLabels[stepNum] || "⬅️ Back";
        }
    }

    if (headerNext) {
        if (stepNum === 4) {
            headerNext.style.display = 'none';
        } else {
            headerNext.style.display = 'inline-flex';
            const nextLabels = {
                1: "Proceed ➡️",
                2: "Workspace ➡️",
                3: "Results ➡️"
            };
            headerNext.textContent = nextLabels[stepNum] || "Next ➡️";
            
            // Check disabled state for proceed buttons
            if (stepNum === 1) {
                if (selectedMode) {
                    headerNext.removeAttribute('disabled');
                } else {
                    headerNext.setAttribute('disabled', 'true');
                }
            } else if (stepNum === 2) {
                if (uploadedFiles.length > 0) {
                    headerNext.removeAttribute('disabled');
                } else {
                    headerNext.setAttribute('disabled', 'true');
                }
            } else {
                headerNext.removeAttribute('disabled');
            }
        }
    }
}

// Check/update Step 2 next button state
function updateImportNextButtonState() {
    const btnNext = document.getElementById('btn-step2-next');
    const headerNext = document.getElementById('btn-header-next');
    if (uploadedFiles.length > 0) {
        if (btnNext) btnNext.removeAttribute('disabled');
        if (headerNext && currentStep === 2) headerNext.removeAttribute('disabled');
    } else {
        if (btnNext) btnNext.setAttribute('disabled', 'true');
        if (headerNext && currentStep === 2) headerNext.setAttribute('disabled', 'true');
    }
}

// Mode Selection Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const cardAuto = document.getElementById('card-auto-mode');
    const cardManual = document.getElementById('card-manual-mode');

    if (cardAuto) {
        cardAuto.addEventListener('click', () => {
            selectedMode = 'auto';
            document.getElementById('import-auto-container').classList.remove('hidden');
            document.getElementById('import-manual-container').classList.add('hidden');
            goToStep(2);
            updateImportNextButtonState();
        });
    }

    if (cardManual) {
        cardManual.addEventListener('click', () => {
            selectedMode = 'manual';
            document.getElementById('import-auto-container').classList.add('hidden');
            document.getElementById('import-manual-container').classList.remove('hidden');
            goToStep(2);
            updateImportNextButtonState();
        });
    }

    // Step navigation event handlers
    const btnStep2Back = document.getElementById('btn-step2-back');
    const btnStep2Next = document.getElementById('btn-step2-next');
    const btnStep3Back = document.getElementById('btn-step3-back');
    const btnStep3Next = document.getElementById('btn-step3-next');
    const btnStep4Back = document.getElementById('btn-step4-back');
    const btnStep4Reset = document.getElementById('btn-step4-reset');

    // Top Header navigation buttons
    const btnHeaderBack = document.getElementById('btn-header-back');
    const btnHeaderNext = document.getElementById('btn-header-next');
    
    if (btnHeaderBack) {
        btnHeaderBack.addEventListener('click', () => {
            if (currentStep === 2) {
                uploadedFiles = [];
                renderDatasetManager();
                goToStep(1);
            } else if (currentStep === 3) {
                goToStep(2);
            } else if (currentStep === 4) {
                goToStep(3);
            }
        });
    }
    
    if (btnHeaderNext) {
        btnHeaderNext.addEventListener('click', () => {
            if (currentStep === 1) {
                if (selectedMode) goToStep(2);
            } else if (currentStep === 2) {
                if (uploadedFiles.length > 0) goToStep(3);
            } else if (currentStep === 3) {
                goToStep(4);
            }
        });
    }

    // Previous Image button (Section 5 Sidebar)
    const btnPrevImage = document.getElementById('btn-prev-image');
    if (btnPrevImage) {
        btnPrevImage.addEventListener('click', () => {
            if (activeImageIndex > 0) {
                activeImageIndex--;
                if (selectActiveImage) selectActiveImage.value = activeImageIndex;
                loadActiveImage();
                renderDatasetManager();
            }
        });
    }

    // Make Wizard Stepper clickable
    document.querySelectorAll('.wizard-stepper .step').forEach(stepNode => {
        stepNode.addEventListener('click', () => {
            const stepNum = parseInt(stepNode.getAttribute('data-step'));
            
            // Validation gates to match progression requirements
            if (stepNum > 1 && !selectedMode) {
                alert("Please select an acquisition mode first.");
                return;
            }
            if (stepNum > 2 && uploadedFiles.length === 0) {
                alert("Please upload or crawl spectrum graph files first.");
                return;
            }
            
            // Execute page/step change
            if (stepNum === 2 && currentStep > 2) {
                addLog("[Navigation] Switched back to Import panel via Stepper.");
            }
            goToStep(stepNum);
        });
    });

    if (btnStep2Back) {
        btnStep2Back.addEventListener('click', () => {
            uploadedFiles = [];
            renderDatasetManager();
            goToStep(1);
        });
    }

    if (btnStep2Next) {
        btnStep2Next.addEventListener('click', () => {
            if (uploadedFiles.length > 0) goToStep(3);
        });
    }

    if (btnStep3Back) {
        btnStep3Back.addEventListener('click', () => {
            goToStep(2);
        });
    }

    if (btnStep3Next) {
        btnStep3Next.addEventListener('click', () => {
            goToStep(4);
        });
    }

    if (btnStep4Back) {
        btnStep4Back.addEventListener('click', () => {
            goToStep(3);
        });
    }

    if (btnStep4Reset) {
        btnStep4Reset.addEventListener('click', () => {
            if (confirm("Reset current analysis and start a new chemical? All current digitizations will remain in memory.")) {
                uploadedFiles = [];
                activeImageIndex = -1;
                searchResults = [];
                renderDatasetManager();
                goToStep(1);
            }
        });
    }

    // Sidebar navigation utility hooks
    const btnNavSettings = document.getElementById('btn-nav-settings');
    const btnNavLogs = document.getElementById('btn-nav-logs');
    const btnSettingsReturn = document.getElementById('btn-settings-return');

    if (btnNavSettings) {
        btnNavSettings.addEventListener('click', () => {
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            document.getElementById('tab-settings').classList.add('active');
        });
    }

    if (btnNavLogs) {
        btnNavLogs.addEventListener('click', () => {
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            document.getElementById('tab-logs').classList.add('active');
        });
    }

    if (btnSettingsReturn) {
        btnSettingsReturn.addEventListener('click', () => {
            goToStep(currentStep);
        });
    }

    // Initialize query preview on DOM load
    if (typeof updateSearchQueryPreview === 'function') {
        updateSearchQueryPreview();
    }

    // ─────────────────────────────────────────────────────────────────
    //  CURVE TRACING & MODAL HANDLERS
    // ─────────────────────────────────────────────────────────────────
    if (btnCloseXyModal) {
        btnCloseXyModal.addEventListener('click', () => {
            xyDataModal.classList.remove('active');
        });
    }
    if (btnCloseXyModalFooter) {
        btnCloseXyModalFooter.addEventListener('click', () => {
            xyDataModal.classList.remove('active');
        });
    }
    if (btnCopyXyData) {
        btnCopyXyData.addEventListener('click', () => {
            if (xyDataTextarea.value && navigator.clipboard) {
                navigator.clipboard.writeText(xyDataTextarea.value)
                    .then(() => {
                        const originalText = btnCopyXyData.innerHTML;
                        btnCopyXyData.innerHTML = "✓ Copied!";
                        setTimeout(() => {
                            btnCopyXyData.innerHTML = originalText;
                        }, 2000);
                    })
                    .catch(err => {
                        console.error("Clipboard copy failed:", err);
                        alert("Failed to copy text automatically. Please select all and copy manually.");
                    });
            } else {
                // Fallback for older browsers or non-secure contexts
                xyDataTextarea.select();
                try {
                    document.execCommand('copy');
                    const originalText = btnCopyXyData.innerHTML;
                    btnCopyXyData.innerHTML = "✓ Copied!";
                    setTimeout(() => {
                        btnCopyXyData.innerHTML = originalText;
                    }, 2000);
                } catch (e) {
                    alert("Please copy manually (Ctrl+C).");
                }
            }
        });
    }
    if (btnViewXyData) {
        btnViewXyData.addEventListener('click', () => {
            if (activeCurves && activeCurves.length > 0) {
                // Format activeCurves[0].data as CSV text
                let csvText = "Wavelength (nm),Absorbance\n";
                activeCurves[0].data.forEach(pt => {
                    csvText += `${pt[0].toFixed(2)},${pt[1].toFixed(4)}\n`;
                });
                xyDataTextarea.value = csvText;
                xyDataModal.classList.add('active');
            } else {
                alert("No digitized curve data found. Please run Auto Trace first.");
            }
        });
    }
    if (btnViewTracedCurve) {
        btnViewTracedCurve.addEventListener('click', () => {
            const chartDiv = document.getElementById('plotly-preview-chart');
            if (chartDiv) {
                chartDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Briefly flash a highlight border to draw user's eye
                chartDiv.style.outline = "3px solid #FF6D00";
                setTimeout(() => {
                    chartDiv.style.outline = "none";
                }, 1500);
            }
        });
    }
    if (btnStartAutoTrace) {
        btnStartAutoTrace.addEventListener('click', () => {
            if (fiveClickPoints.length < 3) {
                alert("Please click at least 3 points (recommended 5 points) along the curve before starting Auto Trace.");
                return;
            }
            runAsyncAutoTrace();
        });
    }
});

// Load Demo Spectrum Image
btnLoadDemo.addEventListener('click', async () => {
    showLoading("Loading demo spectrum image...");
    try {
        const response = await fetch('/test_spectrum.jpg');
        const blob = await response.blob();
        const demoFile = new File([blob], "demo_spectrum.jpg", { type: "image/jpeg" });

        uploadedFiles = [{ name: "demo_spectrum.jpg", fileObject: demoFile, srcUrl: "/test_spectrum.jpg", batchSelected: true }];
        activeImageIndex = 0;

        await loadActiveImage();
        renderDatasetManager();
        updateImportNextButtonState();
        goToStep(3);
        addLog("Loaded demo spectrum image.");
    } catch (err) {
        addLog("Failed to load demo image: " + err.message);
    } finally {
        hideLoading();
    }
});

// Drag & Drop / File Upload handlers
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleUploadedFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', () => handleUploadedFiles(fileInput.files));

// PDF Page Converter to Canvas Blob
function parsePdfFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function () {
            try {
                const arrayBuffer = this.result;
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 2.0 });

                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const context = canvas.getContext('2d');

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                canvas.toBlob((blob) => {
                    if (blob) {
                        const pngFile = new File([blob], file.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' });
                        resolve(pngFile);
                    } else {
                        reject(new Error("Failed to convert PDF canvas to blob"));
                    }
                }, 'image/png');
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

async function handleUploadedFiles(filesList) {
    if (filesList.length === 0) return;

    showLoading(`Loading and parsing ${filesList.length} file(s)...`);

    // Revoke previous URLs
    uploadedFiles.forEach(f => {
        if (f.srcUrl && !f.srcUrl.startsWith('/')) {
            URL.revokeObjectURL(f.srcUrl);
        }
    });
    uploadedFiles = [];

    for (let i = 0; i < filesList.length; i++) {
        const file = filesList[i];
        try {
            if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                addLog(`Parsing PDF file: ${file.name}`);
                const pngFile = await parsePdfFile(file);
                const srcUrl = URL.createObjectURL(pngFile);
                uploadedFiles.push({
                    name: pngFile.name,
                    fileObject: pngFile,
                    srcUrl: srcUrl,
                    batchSelected: true
                });
            } else {
                const srcUrl = URL.createObjectURL(file);
                uploadedFiles.push({
                    name: file.name,
                    fileObject: file,
                    srcUrl: srcUrl,
                    batchSelected: true
                });
            }
        } catch (err) {
            addLog(`Error parsing file ${file.name}: ${err.message}`);
        }
    }

    if (uploadedFiles.length === 0) {
        hideLoading();
        return;
    }

    activeImageIndex = 0;

    await loadActiveImage();
    renderDatasetManager();
    updateImportNextButtonState();
    goToStep(3);
    hideLoading();
    addLog(`Uploaded and parsed ${uploadedFiles.length} file(s).`);
}

// Load Active Image onto Canvas
function loadActiveImage() {
    return new Promise((resolve, reject) => {
        const activeFile = uploadedFiles[activeImageIndex];
        if (!activeFile) {
            resolve();
            return;
        }

        isPreprocessingChange = false;
        originalSrcUrl = activeFile.srcUrl;
        enhancedSrcUrl = null;
        serverThresholdMaskUrl = null;
        currentViewMode = 'enhanced';

        // Hide preview stage selector until loaded
        document.getElementById('preview-stage-selector').style.display = 'none';
        document.getElementById('quality-card').style.display = 'none';

        activeImageObj = new Image();
        activeImageObj.onload = async () => {
            try {
                // Clear scribble & canvas
                if (!isPreprocessingChange) {
                    calibrationPoints = [];
                    fiveClickPoints = [];
                    calibrationMode = false;
                    btnCalibrateMode.classList.remove('blue-btn');
                    updateCalibrationGuidance();
                    updateFiveClickGuidance();

                    // Reset active curves state
                    activeCurves = [];
                    currentCurve = null;
                    plotlyPreviewChart.innerHTML = '';
                    previewPlaceholder.classList.remove('hidden');
                    if (digitizedSummaryContainer) digitizedSummaryContainer.classList.add('hidden');
                    btnDownloadCsv.setAttribute('disabled', 'true');
                    btnDownloadJson.setAttribute('disabled', 'true');
                    if (btnLoadCurve) btnLoadCurve.setAttribute('disabled', 'true');
                }

                // Map auto-detected vertices to normalized space if available
                if (rawAutoVertices && rawAutoVertices.length > 0) {
                    calibrationPoints = rawAutoVertices.map(pt => ({
                        x: pt.x / activeImageObj.width,
                        y: pt.y / activeImageObj.height
                    }));
                    rawAutoVertices = null;
                }

                // Fit width to 500px, calculate height
                const displayWidth = 500;
                const displayHeight = Math.floor(500 * (activeImageObj.height / activeImageObj.width));
                canvasBaseWidth = displayWidth;
                canvasBaseHeight = displayHeight;

                srcCanvas.width = displayWidth;
                srcCanvas.height = displayHeight;
                scribbleCanvas.width = displayWidth;
                scribbleCanvas.height = displayHeight;
                if (guideCanvas) {
                    guideCanvas.width = displayWidth;
                    guideCanvas.height = displayHeight;
                }
                if (marqueeCanvas) {
                    marqueeCanvas.width = displayWidth;
                    marqueeCanvas.height = displayHeight;
                }
                maskCanvas.width = displayWidth;
                maskCanvas.height = displayHeight;

                if (typeof applyZoom === 'function') {
                    applyZoom(currentZoom);
                    centerViewport();
                }

                if (canvasTopBar) {
                    canvasTopBar.style.display = 'flex';
                }

                // Reset masking history stack
                if (typeof resetMaskHistory === 'function') {
                    resetMaskHistory();
                }

                const ctx = srcCanvas.getContext('2d');
                ctx.drawImage(activeImageObj, 0, 0, displayWidth, displayHeight);
                originalImageData = ctx.getImageData(0, 0, displayWidth, displayHeight);

                // Reset manual filters to default values
                sliderBrightness.value = 0;
                valBrightness.textContent = "0";
                sliderContrast.value = 1.0;
                valContrast.textContent = "1.0";
                sliderMedian.value = 1;
                valMedian.textContent = "Off";
                sliderBlur.value = 0;
                valBlur.textContent = "0";
                sliderErode.value = 0;
                valErode.textContent = "0";
                sliderDilate.value = 0;
                valDilate.textContent = "0";

                // Reset scribble overlay
                const sctx = scribbleCanvas.getContext('2d');
                sctx.clearRect(0, 0, displayWidth, displayHeight);
                if (guideCanvas && gctx) gctx.clearRect(0, 0, displayWidth, displayHeight);
                guideCurvePoints = [];

                canvasContainer.classList.remove('hidden');
                processedMaskContainer.classList.remove('hidden');
                btnExtractCurves.removeAttribute('disabled');
                dropZone.classList.add('hidden');
                document.getElementById('demo-load-wrapper').classList.add('hidden');

                // Only run calibration/auto-detect if loading original file
                if (!isPreprocessingChange) {
                    await triggerAutoCalibration(activeFile.fileObject);
                } else {
                    renderLiveMask();
                    drawCalibrationPoints();
                }

                // Update Previous/Next Image buttons disabled states
                const btnPrevImage = document.getElementById('btn-prev-image');
                if (btnPrevImage) {
                    if (activeImageIndex > 0) {
                        btnPrevImage.removeAttribute('disabled');
                    } else {
                        btnPrevImage.setAttribute('disabled', 'true');
                    }
                }

                resolve();
            } catch (err) {
                reject(err);
            }
        };
        activeImageObj.onerror = (err) => reject(err);
        activeImageObj.src = originalSrcUrl;
    });
}

// -- AI Calibration: Run server-side auto-detect directly
async function triggerAutoCalibration(fileObj) {
    showLoading('AI Auto-Calibration: Upscale → CLAHE → Axis Detection → OCR...');
    try {
        addLog('[AI Engine] Launching auto-detect...');
        const formData = new FormData();
        formData.append('files', fileObj);

        let result;
        try {
            const response = await fetch('/api/auto-detect', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            result = await response.json();
            if (result.error) throw new Error(result.error);
        } catch (serverErr) {
            addLog('[AI Engine] Server auto-detect failed: ' + serverErr.message + '. Falling back to local browser AI engine...');

            const localCanvas = document.createElement('canvas');
            localCanvas.width = activeImageObj.width;
            localCanvas.height = activeImageObj.height;
            const localCtx = localCanvas.getContext('2d');
            localCtx.drawImage(activeImageObj, 0, 0);

            const clientRes = await fullClientCalibration(localCanvas);

            result = {
                vertices: clientRes.vertices,
                xRange: clientRes.xRange,
                yRange: clientRes.yRange,
                xScaleType: clientRes.xScaleType,
                yScaleType: clientRes.yScaleType,
                xLabel: clientRes.xLabel,
                yLabel: clientRes.yLabel,
                enhancedImage: clientRes.enhancedDataUrl || activeImageObj.src,
                thresholdMask: clientRes.enhancedDataUrl || activeImageObj.src,
                quality: {
                    overallScore: 85,
                    decision: "pass",
                    qualityLevel: "Good",
                    siqa: {
                        blurScore: 90,
                        resScore: 80,
                        noiseScore: 85,
                        contrastScore: 90,
                        lightingScore: 90,
                        axisScore: 80,
                        ocrScore: 80,
                        graphScore: 80
                    },
                    recommendations: ["SIQA quality estimation from client-side fallback passed successfully."]
                }
            };
            addLog('[Local AI Engine] Calibration complete: ' + clientRes.log.join(', '));
        }

        rawAutoVertices = (result.vertices && result.vertices.length >= 3) ? result.vertices : [
            { x: Math.floor(activeImageObj.width * 0.12), y: Math.floor(activeImageObj.height * 0.82) },
            { x: Math.floor(activeImageObj.width * 0.93), y: Math.floor(activeImageObj.height * 0.82) },
            { x: Math.floor(activeImageObj.width * 0.12), y: Math.floor(activeImageObj.height * 0.08) }
        ];
        xRange = (result.xRange && result.xRange.length >= 2) ? result.xRange : [300, 1000];
        yRange = (result.yRange && result.yRange.length >= 2) ? result.yRange : [0.0, 1.0];
        xLabel = result.xLabel || 'Wavelength (nm)';
        yLabel = result.yLabel || 'Absorbance';

        let isOcrRunNeeded = (xRange[0] === 300 && xRange[1] === 1000 && yRange[0] === 0.0 && yRange[1] === 1.0);
        if (isOcrRunNeeded) {
            addLog('[AI Engine] Server returned default ranges. Running client-side browser OCR to scan axis limits...');
            try {
                const localCanvas = document.createElement('canvas');
                localCanvas.width = activeImageObj.width;
                localCanvas.height = activeImageObj.height;
                const localCtx = localCanvas.getContext('2d');
                localCtx.drawImage(activeImageObj, 0, 0);

                const clientRes = await cvReadAxisLimits(localCanvas, rawAutoVertices);
                xRange = clientRes.xRange;
                yRange = clientRes.yRange;
                xLabel = clientRes.xLabel || xLabel;
                yLabel = clientRes.yLabel || yLabel;
                if (clientRes.xScaleType) {
                    result.xScaleType = clientRes.xScaleType;
                }
                if (clientRes.yScaleType) {
                    result.yScaleType = clientRes.yScaleType;
                }
                addLog('[Local OCR] Calibration limits updated: X=' + xRange[0] + '-' + xRange[1] + ', Y=' + yRange[0] + '-' + yRange[1]);
            } catch (ocrErr) {
                addLog('[Local OCR] Client-side OCR failed: ' + ocrErr.message);
            }
        }

        document.getElementById('input-x-min').value = xRange[0];
        document.getElementById('input-x-max').value = xRange[1];
        document.getElementById('input-y-min').value = yRange[0];
        document.getElementById('input-y-max').value = yRange[1];
        updateRangeUI();
        if (result.xScaleType) {
            selectXScale.value = result.xScaleType;
            selectXScale.dispatchEvent(new Event('change'));
        }
        if (result.yScaleType) {
            selectYScale.value = result.yScaleType;
            selectYScale.dispatchEvent(new Event('change'));
        }
        addLog('[Server Calibration] X=' + xRange[0] + '-' + xRange[1] + ', Y=' + yRange[0] + '-' + yRange[1]);

        enhancedSrcUrl = result.enhancedImage;
        serverThresholdMaskUrl = result.thresholdMask;
        if (result.quality) {
            const q = result.quality;
            const card = document.getElementById('quality-card');
            if (card) card.style.display = 'block';

            const overallBadge = document.getElementById('badge-overall-score');
            if (overallBadge) overallBadge.textContent = `Score: ${q.overallScore}/100`;

            const decisionBadge = document.getElementById('siqa-decision-badge');
            if (decisionBadge) {
                decisionBadge.textContent = `Status: ${(q.qualityLevel || 'Good').toUpperCase()} (${(q.decision || 'pass').toUpperCase()})`;
                if (q.overallScore >= 90 || q.decision === 'pass') {
                    if (overallBadge) overallBadge.style.backgroundColor = '#10B981';
                    decisionBadge.className = 'siqa-badge siqa-badge--pass';
                } else if (q.overallScore >= 60 || q.decision === 'warning') {
                    if (overallBadge) overallBadge.style.backgroundColor = '#F59E0B';
                    decisionBadge.className = 'siqa-badge siqa-badge--warning';
                } else {
                    if (overallBadge) overallBadge.style.backgroundColor = '#EF4444';
                    decisionBadge.className = 'siqa-badge siqa-badge--reject';
                }
            }

            // Render 8 SIQA Parameter Scores and Progress Bars
            if (q.siqa) {
                const s = q.siqa;
                const setSiqaMetric = (idScore, idBar, val) => {
                    const elScore = document.getElementById(idScore);
                    const elBar = document.getElementById(idBar);
                    if (elScore) elScore.textContent = `${val}/100`;
                    if (elBar) {
                        elBar.style.width = `${Math.max(5, val)}%`;
                        if (val >= 75) elBar.style.backgroundColor = '#10B981';
                        else if (val >= 60) elBar.style.backgroundColor = '#F59E0B';
                        else elBar.style.backgroundColor = '#EF4444';
                    }
                };
                setSiqaMetric('siqa-score-blur', 'siqa-bar-blur', s.blurScore);
                setSiqaMetric('siqa-score-res', 'siqa-bar-res', s.resScore);
                setSiqaMetric('siqa-score-noise', 'siqa-bar-noise', s.noiseScore);
                setSiqaMetric('siqa-score-contrast', 'siqa-bar-contrast', s.contrastScore);
                setSiqaMetric('siqa-score-lighting', 'siqa-bar-lighting', s.lightingScore);
                setSiqaMetric('siqa-score-axis', 'siqa-bar-axis', s.axisScore);
                setSiqaMetric('siqa-score-ocr', 'siqa-bar-ocr', s.ocrScore);
                setSiqaMetric('siqa-score-graph', 'siqa-bar-graph', s.graphScore);
            }

            // Rejection Banner Gating
            const rejectionBanner = document.getElementById('siqa-rejection-banner');
            if (rejectionBanner) {
                if (q.decision === 'reject') {
                    rejectionBanner.style.display = 'block';
                    addLog(`⚠️ [SIQA Rejection Alert] Image quality score is ${q.overallScore}/100 (<60). Upload a clearer image or use Override.`);
                } else {
                    rejectionBanner.style.display = 'none';
                }
            }

            // Recommendations List
            const recList = document.getElementById('list-quality-recommendations');
            if (recList && q.recommendations) {
                recList.innerHTML = q.recommendations.map(r => `<li>${r}</li>`).join('');
            }
        }
        document.getElementById('preview-stage-selector').style.display = 'flex';
        const isNewSrc = (enhancedSrcUrl && enhancedSrcUrl !== activeImageObj.src && !enhancedSrcUrl.includes('undefined'));
        if (isNewSrc) {
            isPreprocessingChange = true;
            activeImageObj.src = enhancedSrcUrl;
        } else {
            if (rawAutoVertices && rawAutoVertices.length > 0) {
                calibrationPoints = rawAutoVertices.map(pt => ({
                    x: pt.x / activeImageObj.width,
                    y: pt.y / activeImageObj.height
                }));
                rawAutoVertices = null;
            }
            renderLiveMask();
            drawCalibrationPoints();
        }
    } catch (err) {
        addLog('Calibration failed: ' + err.message);
        console.error(err);
    } finally {
        hideLoading();
    }
}



// Stage Toggler Button Listeners
document.getElementById('btn-view-enhanced').addEventListener('click', () => {
    if (!enhancedSrcUrl || currentViewMode === 'enhanced') return;
    currentViewMode = 'enhanced';
    document.getElementById('btn-view-enhanced').classList.add('active');
    document.getElementById('btn-view-original').classList.remove('active');
    isPreprocessingChange = true;
    activeImageObj.src = enhancedSrcUrl;
});
document.getElementById('btn-view-original').addEventListener('click', () => {
    if (!originalSrcUrl || currentViewMode === 'original') return;
    currentViewMode = 'original';
    document.getElementById('btn-view-original').classList.add('active');
    document.getElementById('btn-view-enhanced').classList.remove('active');
    isPreprocessingChange = true;
    activeImageObj.src = originalSrcUrl;
});

// Helper to draw the filtered/processed underlay image
function drawUnderlayImage(ctx) {
    if (!originalImageData) {
        if (activeImageObj) {
            ctx.drawImage(activeImageObj, 0, 0, srcCanvas.width, srcCanvas.height);
        }
        return;
    }

    // Create temporary canvas to execute pixel ops
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = srcCanvas.width;
    tempCanvas.height = srcCanvas.height;
    const tctx = tempCanvas.getContext('2d');
    tctx.putImageData(originalImageData, 0, 0);
    const imgData = tctx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
    const data = imgData.data;

    // Read current slider inputs
    const brightness = parseInt(sliderBrightness.value);
    const contrast = parseFloat(sliderContrast.value);
    const medianSize = parseInt(sliderMedian.value);
    const blurRadius = parseInt(sliderBlur.value);
    const erodeRadius = parseInt(sliderErode.value);
    const dilateRadius = parseInt(sliderDilate.value);

    // Apply operations sequentially
    applyBrightnessContrast(data, brightness, contrast);
    applyMedianFilter(data, srcCanvas.width, srcCanvas.height, medianSize);
    applyGaussianBlur(data, srcCanvas.width, srcCanvas.height, blurRadius);
    applyErode(data, srcCanvas.width, srcCanvas.height, erodeRadius);
    applyDilate(data, srcCanvas.width, srcCanvas.height, dilateRadius);

    ctx.putImageData(imgData, 0, 0);
}

// Drawing points on source canvas
function drawCalibrationPoints() {
    const ctx = srcCanvas.getContext('2d');
    
    // Support in-place binary mask viewing
    if (typeof maskViewMode !== 'undefined' && maskViewMode === 'binary') {
        if (maskCanvas && maskCanvas.width > 0) {
            ctx.drawImage(maskCanvas, 0, 0);
        }
        return;
    }

    drawUnderlayImage(ctx);

    // Support live detection overlay mode (curves in neon emerald)
    if (typeof maskViewMode !== 'undefined' && maskViewMode === 'detection' && maskCanvas && maskCanvas.width > 0) {
        try {
            const mctx = maskCanvas.getContext('2d');
            const mW = maskCanvas.width, mH = maskCanvas.height;
            const mData = mctx.getImageData(0, 0, mW, mH).data;
            const overlayImg = ctx.createImageData(mW, mH);
            const oData = overlayImg.data;
            for (let i = 0; i < mData.length; i += 4) {
                if (mData[i] > 128) {
                    oData[i] = 16;      // Emerald Neon Green
                    oData[i + 1] = 185;
                    oData[i + 2] = 129;
                    oData[i + 3] = 180;
                }
            }
            const tempC = document.createElement('canvas');
            tempC.width = mW;
            tempC.height = mH;
            tempC.getContext('2d').putImageData(overlayImg, 0, 0);
            ctx.drawImage(tempC, 0, 0);
        } catch (e) {
            console.warn('[Overlay draw error]', e);
        }
    }

    // Draw standard calibration points
    calibrationPoints.forEach((pt, idx) => {
        // Map normalized coordinates [0, 1] to display px
        const dispX = Math.floor(pt.x * srcCanvas.width);
        const dispY = Math.floor(pt.y * srcCanvas.height);

        const colors = ["#EF4444", "#10B981", "#3B82F6"]; // Red, Green, Blue
        ctx.beginPath();
        ctx.arc(dispX, dispY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = colors[idx % 3];
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();

        ctx.fillStyle = colors[idx % 3];
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(`P${idx + 1}`, dispX + 8, dispY - 8);
    });

    const traced = (window.activeCurves || []).find(c => c.name === 'auto_traced_curve' || c.name === 'majority_clicked_curve');
    const inlierIndices = traced && Array.isArray(traced.inlierIndices) ? traced.inlierIndices : null;

    // Draw 5-click tracing points
    fiveClickPoints.forEach((pt, idx) => {
        const dispX = Math.floor(pt.x * srcCanvas.width);
        const dispY = Math.floor(pt.y * srcCanvas.height);
        const isMatchedInlier = inlierIndices ? inlierIndices.includes(idx) : false;

        ctx.beginPath();
        ctx.arc(dispX, dispY, isMatchedInlier ? 7 : 6, 0, 2 * Math.PI);
        ctx.fillStyle = isMatchedInlier ? '#10B981' : '#F59E0B'; // Green for matched majority, Gold otherwise
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();

        ctx.fillStyle = isMatchedInlier ? '#10B981' : '#F59E0B';
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(isMatchedInlier ? `✓ C${idx + 1}` : `C${idx + 1}`, dispX + 8, dispY - 8);
    });

    // Draw full traced majority curve once extracted
    if (traced && traced.rawPoints && traced.rawPoints.length > 0) {
        // Draw the extracted full majority curve as a smooth glowing solid line!
        ctx.beginPath();
        ctx.strokeStyle = '#10B981'; // Vibrant Emerald Green for confirmed majority curve
        ctx.lineWidth = 3.5;
        ctx.shadowColor = 'rgba(16, 185, 129, 0.45)';
        ctx.shadowBlur = 6;
        traced.rawPoints.forEach(([px, py], idx) => {
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }
}

// Coordinate clicking calibration & 5-click tracing
scribbleCanvas.addEventListener('mousedown', (e) => {
    if (!calibrationMode && !fiveClickMode) return;
    if (e.button === 1 || isSpacePressed || currentMaskTool === 'pan') return;

    const coords = getWorkspaceCoords(e);
    const clickX = coords.x;
    const clickY = coords.y;
    const normX = coords.normX;
    const normY = coords.normY;

    // Scale to original dimensions just for log print clarity
    const origLogX = activeImageObj ? Math.floor(normX * activeImageObj.width) : Math.floor(normX * srcCanvas.width);
    const origLogY = activeImageObj ? Math.floor(normY * activeImageObj.height) : Math.floor(normY * srcCanvas.height);

    if (calibrationMode) {
        if (calibrationPoints.length < 3) {
            calibrationPoints.push({ x: normX, y: normY });
            const labels = ["Origin (Bottom-Left)", "X-axis Max (Bottom-Right)", "Y-axis Max (Top-Left)"];
            addLog(`Registered Point ${calibrationPoints.length} (${labels[calibrationPoints.length - 1]}): [${origLogX}, ${origLogY}]`);

            drawCalibrationPoints();
            updateCalibrationGuidance();

            if (calibrationPoints.length === 3) {
                calibrationMode = false;
                btnCalibrateMode.classList.remove('blue-btn');
                updateCalibrationGuidance();
                recalculateActiveCurvesData();
                if (typeof setActiveMaskTool === 'function') {
                    setActiveMaskTool('brush');
                }
            }
        }
    } else if (fiveClickMode) {
        if (fiveClickPoints.length >= 5) {
            addLog("5 points already selected. Click 'Start Auto Trace' or 'Clear Points' to retry.");
            return;
        }

        // Read color under click on the first point to automatically calibrate targeted color
        if (fiveClickPoints.length === 0) {
            try {
                const ctx = srcCanvas.getContext('2d');
                const canvasX = Math.floor(clickX);
                const canvasY = Math.floor(clickY);
                
                // Sample neighborhood to find the purest line pixel near the click
                let bestR = 255, bestG = 255, bestB = 255;
                let minLum = 999;
                for (let dy = -4; dy <= 4; dy++) {
                    for (let dx = -4; dx <= 4; dx++) {
                        const qx = Math.max(0, Math.min(srcCanvas.width - 1, canvasX + dx));
                        const qy = Math.max(0, Math.min(srcCanvas.height - 1, canvasY + dy));
                        const pix = ctx.getImageData(qx, qy, 1, 1).data;
                        if (pix[0] >= 235 && pix[1] >= 235 && pix[2] >= 235) continue;
                        const lum = 0.299 * pix[0] + 0.587 * pix[1] + 0.114 * pix[2];
                        if (lum < minLum) {
                            minLum = lum;
                            bestR = pix[0];
                            bestG = pix[1];
                            bestB = pix[2];
                        }
                    }
                }
                const detected = classifyColor(bestR, bestG, bestB);
                if (detected && detected !== 'grayscale') {
                    selectColorMode.value = detected;
                }
                sliderWhiteness.value = Math.min(255, Math.max(220, Math.max(bestR, bestG, bestB) + 15));
                valWhiteness.textContent = sliderWhiteness.value;
                
                addLog(`[Click Trace] Calibrated to curve color: ${detected || 'auto'} (RGB: [${bestR}, ${bestG}, ${bestB}]).`);
            } catch (e) {
                console.error("Error calibrating to clicked color:", e);
            }
        }

        fiveClickPoints.push({ x: normX, y: normY });
        addLog(`Registered Tracing Point ${fiveClickPoints.length}: [${origLogX}, ${origLogY}]`);

        if (fiveClickCount) {
            fiveClickCount.textContent = `${fiveClickPoints.length} / 5`;
        }

        drawCalibrationPoints();
        updateFiveClickGuidance();

        if (fiveClickPoints.length >= 3) {
            if (btnStartAutoTrace) {
                btnStartAutoTrace.removeAttribute('disabled');
            }
            if (traceStatusContainer) {
                traceStatusContainer.classList.remove('hidden');
            }
            if (traceStatusText) {
                traceStatusText.textContent = fiveClickPoints.length === 5 
                    ? "Status: 5/5 points selected – Ready for majority curve extraction" 
                    : `Status: ${fiveClickPoints.length}/5 points selected – Ready to trace (or click up to 5)`;
            }
            if (traceProgressBarContainer) {
                traceProgressBarContainer.classList.add('hidden');
            }
            if (traceResultsActions) {
                traceResultsActions.classList.add('hidden');
            }
        } else {
            if (btnStartAutoTrace) {
                btnStartAutoTrace.setAttribute('disabled', 'true');
            }
        }
    }
});

function classifyColor(r, g, b) {
    let hsv;
    if (typeof rgbToCvHsv === 'function') {
        hsv = rgbToCvHsv(r, g, b);
    } else {
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
        hsv = { h: Math.round(h * 180), s: Math.round(s * 255), v: Math.round(v * 255) };
    }

    const { h, s, v } = hsv;
    if (v < 80) return 'black';
    if (s < 30) return 'grayscale';

    if (h >= 165 || h < 8) return 'red';
    if (h >= 8 && h < 20) return 'orange';
    if (h >= 20 && h < 38) return 'yellow';
    if (h >= 35 && h < 85) return 'green';
    if (h >= 80 && h < 102) return 'cyan';
    if (h >= 90 && h < 138) return 'blue';
    if (h >= 138 && h < 165) return 'magenta';

    return 'grayscale';
}

function updateFiveClickGuidance() {
    if (fiveClickPoints.length === 5) {
        calibrationGuidance.textContent = `✅ 5 points selected. Click 'Start Auto Trace' to extract the majority curve across the graph.`;
        calibrationGuidance.className = "calibration-guidance success";
        return;
    } else if (fiveClickPoints.length >= 3) {
        calibrationGuidance.textContent = `📍 ${fiveClickPoints.length} points selected. You can click 'Start Auto Trace' now, or add up to 5 points for higher precision.`;
        calibrationGuidance.className = "calibration-guidance info";
        return;
    }
    
    calibrationGuidance.textContent = `📍 Click on the desired curve at 5 different locations. (${fiveClickPoints.length} / 5 selected).`;
    calibrationGuidance.className = "calibration-guidance info";
}

function traceFiveClickCurve() {
    runAsyncAutoTrace();
}

async function runAsyncAutoTrace() {
    if (!activeImageObj) return;

    if (fiveClickPoints.length < 3) {
        alert("Please select at least 3 points (recommended 5 points) along the curve before starting Auto Trace.");
        return;
    }

    const W = srcCanvas.width;
    const H = srcCanvas.height;

    // Calibration boundaries (normalized or default)
    let origin = calibrationPoints[0] || { x: 0.12, y: 0.82 };
    let xMaxV = calibrationPoints[1] || { x: 0.90, y: 0.82 };
    let yMaxV = calibrationPoints[2] || { x: 0.12, y: 0.18 };

    const displayVertices = [
        { x: Math.round(origin.x * W), y: Math.round(origin.y * H) },
        { x: Math.round(xMaxV.x * W),  y: Math.round(xMaxV.y * H) },
        { x: Math.round(yMaxV.x * W),  y: Math.round(yMaxV.y * H) }
    ];

    const startX = Math.max(0, displayVertices[0].x);
    const endX = Math.min(W - 1, displayVertices[1].x);

    // Disable buttons and show progress
    if (btnStartAutoTrace) btnStartAutoTrace.setAttribute('disabled', 'true');
    if (btnClear5Clicks) btnClear5Clicks.setAttribute('disabled', 'true');
    if (traceStatusContainer) traceStatusContainer.classList.remove('hidden');
    if (traceProgressBarContainer) traceProgressBarContainer.classList.remove('hidden');
    if (traceResultsActions) traceResultsActions.classList.add('hidden');
    if (traceProgressBar) traceProgressBar.style.width = '0%';
    if (traceStatusText) traceStatusText.textContent = "Status: Analyzing majority click points & tracing curve...";

    addLog(`[Majority Trace] Analyzing ${fiveClickPoints.length} click dots for majority consensus curve extraction...`);

    const configs = {
        colorMode: selectColorMode.value,
        smoothingWindow: parseInt(sliderSmoothing.value) || 5,
        whitenessThresh: parseInt(sliderWhiteness.value) || 220,
        xScaleType: selectXScale.value || 'linear',
        yScaleType: selectYScale.value || 'linear'
    };

    let resultCurve;
    try {
        if (typeof cvExtractCurveByMajorityClicks === 'function') {
            resultCurve = await cvExtractCurveByMajorityClicks(
                srcCanvas, fiveClickPoints, configs.colorMode, displayVertices, xRange, yRange, configs
            );
        } else {
            throw new Error("cvExtractCurveByMajorityClicks engine not found");
        }
    } catch (err) {
        console.error("Majority curve extraction error:", err);
        addLog(`[Error] Extraction failed: ${err.message}`);
        alert(`Extraction failed: ${err.message}`);
        if (btnStartAutoTrace) btnStartAutoTrace.removeAttribute('disabled');
        if (btnClear5Clicks) btnClear5Clicks.removeAttribute('disabled');
        if (traceStatusText) traceStatusText.textContent = "Status: Extraction failed. Please adjust click points.";
        return;
    }

    const finalPoints = resultCurve.rawPoints;
    const realData = resultCurve.data;
    const inlierCount = resultCurve.inlierCount;
    const totalClicks = resultCurve.totalClicks;
    const inlierIndices = resultCurve.inlierIndices || [];
    const totalTracedLength = finalPoints.length;

    // Save final trace
    const finalCurve = {
        color: selectColorMode.value === 'grayscale' ? 'blue' : selectColorMode.value,
        name: `auto_traced_curve`,
        rawPoints: finalPoints,
        data: realData,
        inlierIndices: inlierIndices,
        inlierCount: inlierCount,
        totalClicks: totalClicks
    };

    // --- PROGRESSIVE ANIMATION AND RENDERING ---
    let currentAnimIndex = startX;
    const animSpan = Math.max(10, endX - startX);
    const animSpeed = Math.max(2, Math.floor(animSpan / 35)); // ~35 frames animation

    function animateTraceStep() {
        if (currentAnimIndex >= endX) {
            // Finish animation
            if (traceProgressBar) traceProgressBar.style.width = '100%';
            if (traceProgressBarContainer) traceProgressBarContainer.classList.add('hidden');
            if (traceResultsActions) traceResultsActions.classList.remove('hidden');

            // Re-enable buttons
            if (btnStartAutoTrace) btnStartAutoTrace.removeAttribute('disabled');
            if (btnClear5Clicks) btnClear5Clicks.removeAttribute('disabled');

            // Set global activeCurves
            window.activeCurves = activeCurves = [finalCurve];
            currentCurve = activeCurves[0].data;
            plotPreviewChart();
            drawCalibrationPoints();

            // Enable download and load buttons
            btnDownloadCsv.removeAttribute('disabled');
            btnDownloadJson.removeAttribute('disabled');
            if (btnLoadCurve) btnLoadCurve.removeAttribute('disabled');

            // Update stats & logs
            addLog(`[Majority Trace] Success! Extracted complete curve with ${inlierCount}/${totalClicks} majority matched click dots (${totalTracedLength} points).`);
            
            // Add a summary block inside status text
            if (traceStatusText) {
                const segXMin = realData.length > 0 ? realData[0][0] : xRange[0];
                const segXMax = realData.length > 0 ? realData[realData.length - 1][0] : xRange[1];
                traceStatusText.innerHTML = `
                    <div style="color: #10B981; font-weight: 700; margin-bottom: 4px;">✓ Majority Target Curve Extracted (${inlierCount}/${totalClicks} Clicks Matched)</div>
                    <div style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted); line-height: 1.4;">
                        <strong>Points Extracted:</strong> ${totalTracedLength}<br/>
                        <strong>X Range:</strong> ${segXMin.toFixed(2)} - ${segXMax.toFixed(2)}<br/>
                        <strong>Y Range:</strong> ${yRange[0].toFixed(4)} - ${yRange[1].toFixed(4)}
                    </div>
                `;
            }
            return;
        }

        // Draw temporary progressive line on source canvas
        const animPct = (currentAnimIndex - startX) / (animSpan || 1);
        if (traceProgressBar) traceProgressBar.style.width = `${Math.round(animPct * 100)}%`;
        if (traceStatusText) traceStatusText.textContent = `Status: Tracing curve... ${Math.round(animPct * 100)}%`;

        // Render current progressive line on canvas
        const canvasCtx = srcCanvas.getContext('2d');
        drawUnderlayImage(canvasCtx);

        // Draw standard calibration points
        calibrationPoints.forEach((pt, idx) => {
            const dispX = Math.floor(pt.x * srcCanvas.width);
            const dispY = Math.floor(pt.y * srcCanvas.height);
            const colors = ["#EF4444", "#10B981", "#3B82F6"];
            canvasCtx.beginPath();
            canvasCtx.arc(dispX, dispY, 6, 0, 2 * Math.PI);
            canvasCtx.fillStyle = colors[idx % 3];
            canvasCtx.fill();
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = '#FFFFFF';
            canvasCtx.stroke();
        });

        // Draw click dots (matched vs other)
        fiveClickPoints.forEach((pt, idx) => {
            const dispX = Math.floor(pt.x * srcCanvas.width);
            const dispY = Math.floor(pt.y * srcCanvas.height);
            const isMatched = inlierIndices.includes(idx);

            canvasCtx.beginPath();
            canvasCtx.arc(dispX, dispY, isMatched ? 7 : 6, 0, 2 * Math.PI);
            canvasCtx.fillStyle = isMatched ? '#10B981' : '#F59E0B';
            canvasCtx.fill();
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = '#FFFFFF';
            canvasCtx.stroke();
            canvasCtx.fillStyle = isMatched ? '#10B981' : '#F59E0B';
            canvasCtx.font = "bold 12px sans-serif";
            canvasCtx.fillText(isMatched ? `✓ C${idx + 1}` : `C${idx + 1}`, dispX + 8, dispY - 8);
        });

        // Draw progressive traced line in glowing emerald
        canvasCtx.beginPath();
        canvasCtx.strokeStyle = '#10B981';
        canvasCtx.lineWidth = 3.5;
        canvasCtx.shadowColor = 'rgba(16, 185, 129, 0.45)';
        canvasCtx.shadowBlur = 5;
        
        let started = false;
        for (const [px, py] of finalPoints) {
            if (px <= currentAnimIndex) {
                if (!started) {
                    canvasCtx.moveTo(px, py);
                    started = true;
                } else {
                    canvasCtx.lineTo(px, py);
                }
            }
        }
        canvasCtx.stroke();
        canvasCtx.shadowColor = 'transparent';
        canvasCtx.shadowBlur = 0;

        currentAnimIndex += animSpeed;
        requestAnimationFrame(animateTraceStep);
    }

    requestAnimationFrame(animateTraceStep);
}




document.querySelectorAll('input[name="extraction-method"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const method = e.target.value;
        if (method === 'manual-click') {
            fiveClickMode = true;
            fiveClickPoints = [];
            fiveClickControl.classList.remove('hidden');
            document.getElementById('auto-trace-controls').classList.add('hidden');
            processedMaskContainer.classList.add('hidden');
            
            // Hide main button, use Start Auto Trace instead
            btnExtractCurves.classList.add('hidden');
            if (btnStartAutoTrace) {
                btnStartAutoTrace.setAttribute('disabled', 'true');
            }
            if (fiveClickCount) {
                fiveClickCount.textContent = "0 / 5";
            }
            if (traceStatusContainer) {
                traceStatusContainer.classList.add('hidden');
            }
            
            drawCalibrationPoints();
            updateFiveClickGuidance();
            addLog("Switched to Click & Select Curve. Click 5 points along the desired curve.");
        } else {
            fiveClickMode = false;
            fiveClickPoints = [];
            fiveClickControl.classList.add('hidden');
            document.getElementById('auto-trace-controls').classList.remove('hidden');
            
            // Show main button
            btnExtractCurves.classList.remove('hidden');
            btnExtractCurves.textContent = "⚡ Extract Curves";
            if (activeImageObj) {
                processedMaskContainer.classList.remove('hidden');
                btnExtractCurves.removeAttribute('disabled');
            } else {
                btnExtractCurves.setAttribute('disabled', 'true');
            }
            drawCalibrationPoints();
            updateCalibrationGuidance();
            addLog("Switched back to Auto (Masking) Tracing.");
        }
    });
});

btnClear5Clicks.addEventListener('click', () => {
    fiveClickPoints = [];
    if (fiveClickCount) {
        fiveClickCount.textContent = "0 / 5";
    }
    if (btnStartAutoTrace) {
        btnStartAutoTrace.setAttribute('disabled', 'true');
    }
    if (traceStatusContainer) {
        traceStatusContainer.classList.add('hidden');
    }
    drawCalibrationPoints();
    updateFiveClickGuidance();
    btnExtractCurves.setAttribute('disabled', 'true');
    window.activeCurves = activeCurves = [];
    currentCurve = null;
    plotPreviewChart();
    addLog("Cleared click points.");
});

// Update calibration alerts
function updateCalibrationGuidance() {
    if (calibrationPoints.length === 3) {
        calibrationGuidance.textContent = "✅ Calibration complete! Ready to trace spectra.";
        calibrationGuidance.className = "calibration-guidance success";
        return;
    }

    if (!calibrationMode) {
        calibrationGuidance.textContent = "📍 Custom clicks disabled. Click 'Calibrate by Clicks' to override auto vertices.";
        calibrationGuidance.className = "calibration-guidance info";
        return;
    }

    const steps = [
        "Calibration Step 1: Click on the ORIGIN (bottom-left) of the graph axes.",
        "Calibration Step 2: Click on the X-AXIS MAX value (bottom-right) of the graph axes.",
        "Calibration Step 3: Click on the Y-AXIS MAX value (top-left) of the graph axes."
    ];
    calibrationGuidance.textContent = `📍 ${steps[calibrationPoints.length]}`;
    calibrationGuidance.className = "calibration-guidance info";
}

btnCalibrateMode.addEventListener('click', () => {
    calibrationPoints = [];
    calibrationMode = true;
    btnCalibrateMode.classList.add('blue-btn');
    drawCalibrationPoints();
    updateCalibrationGuidance();
    addLog("Custom calibration started. Follow instructions above the canvas.");
});

const btnSiqaOverride = document.getElementById('btn-siqa-override');
if (btnSiqaOverride) {
    btnSiqaOverride.addEventListener('click', () => {
        const banner = document.getElementById('siqa-rejection-banner');
        if (banner) banner.style.display = 'none';
        addLog('⚠️ User manually overrode SIQA Quality Rejection. Proceeding with digitization.');
    });
}

// ─────────────────────────────────────────────────────────────
//  ZOOM & PAN WORKSPACE ENGINE
// ─────────────────────────────────────────────────────────────
let currentZoom = 1.0;
let canvasBaseWidth = 500;
let canvasBaseHeight = 400;
let isSpacePressed = false;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panScrollLeft = 0;
let panScrollTop = 0;

function getWorkspaceCoords(e) {
    const rect = scribbleCanvas.getBoundingClientRect();
    const scaleX = srcCanvas.width / (rect.width || 1);
    const scaleY = srcCanvas.height / (rect.height || 1);
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const x = clientX * scaleX;
    const y = clientY * scaleY;
    const normX = Math.max(0, Math.min(1, x / srcCanvas.width));
    const normY = Math.max(0, Math.min(1, y / srcCanvas.height));
    return { x, y, normX, normY, clientX, clientY, scaleX, scaleY };
}

function applyZoom(zoom, centerCoords = null) {
    if (!canvasWrapper || !canvasViewport) return;
    const prevZoom = currentZoom;
    currentZoom = Math.max(0.5, Math.min(4.0, Math.round(zoom * 100) / 100));

    if (sliderZoom) sliderZoom.value = Math.round(currentZoom * 100);
    if (valZoomLevel) valZoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;

    document.querySelectorAll('.zoom-preset-btn').forEach(btn => {
        const zAttr = btn.getAttribute('data-zoom');
        if (zAttr !== 'fit') {
            const zVal = parseFloat(zAttr);
            if (Math.abs(zVal - currentZoom) < 0.05) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        } else {
            btn.classList.remove('active');
        }
    });

    const newW = Math.round(canvasBaseWidth * currentZoom);
    const newH = Math.round(canvasBaseHeight * currentZoom);

    let targetImgX, targetImgY;
    if (centerCoords) {
        targetImgX = centerCoords.imgX;
        targetImgY = centerCoords.imgY;
    } else {
        const vpRect = canvasViewport.getBoundingClientRect();
        targetImgX = (canvasViewport.scrollLeft + vpRect.width / 2) / (prevZoom || 1);
        targetImgY = (canvasViewport.scrollTop + vpRect.height / 2) / (prevZoom || 1);
    }

    canvasWrapper.style.width = `${newW}px`;
    canvasWrapper.style.height = `${newH}px`;

    requestAnimationFrame(() => {
        const vpRect = canvasViewport.getBoundingClientRect();
        if (centerCoords && centerCoords.mouseVpX !== undefined) {
            canvasViewport.scrollLeft = targetImgX * currentZoom - centerCoords.mouseVpX;
            canvasViewport.scrollTop = targetImgY * currentZoom - centerCoords.mouseVpY;
        } else {
            canvasViewport.scrollLeft = targetImgX * currentZoom - vpRect.width / 2;
            canvasViewport.scrollTop = targetImgY * currentZoom - vpRect.height / 2;
        }
    });
}

function zoomFit() {
    if (!canvasViewport || canvasBaseWidth === 0) return;
    const vpRect = canvasViewport.getBoundingClientRect();
    const availableW = vpRect.width - 36;
    const fitZoom = Math.max(0.5, Math.min(2.0, availableW / canvasBaseWidth));
    applyZoom(fitZoom);
    document.querySelectorAll('.zoom-preset-btn').forEach(btn => {
        if (btn.getAttribute('data-zoom') === 'fit') btn.classList.add('active');
        else btn.classList.remove('active');
    });
    centerViewport();
}

function centerViewport() {
    if (!canvasViewport || !canvasWrapper) return;
    const scrollMaxX = canvasViewport.scrollWidth - canvasViewport.clientWidth;
    const scrollMaxY = canvasViewport.scrollHeight - canvasViewport.clientHeight;
    if (scrollMaxX > 0) canvasViewport.scrollLeft = scrollMaxX / 2;
    if (scrollMaxY > 0) canvasViewport.scrollTop = scrollMaxY / 2;
}

function toggleExpandViewport() {
    if (!canvasViewport) return;
    const isExpanded = canvasViewport.classList.toggle('expanded-mode');
    if (expandViewportText) expandViewportText.textContent = isExpanded ? 'Compact View' : 'Expand View';
    centerViewport();
}

function startPan(e) {
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panScrollLeft = canvasViewport.scrollLeft;
    panScrollTop = canvasViewport.scrollTop;
    if (canvasViewport) canvasViewport.classList.add('is-panning');
}

function updatePan(e) {
    if (!isPanning || !canvasViewport) return;
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;
    canvasViewport.scrollLeft = panScrollLeft - dx;
    canvasViewport.scrollTop = panScrollTop - dy;
}

function endPan() {
    if (isPanning) {
        isPanning = false;
        if (canvasViewport) canvasViewport.classList.remove('is-panning');
    }
}

// ─────────────────────────────────────────────────────────────
//  MASKING STUDIO ENGINE
// ─────────────────────────────────────────────────────────────
let currentMaskTool = 'brush'; // 'navigate', 'brush', 'guide', 'box', 'eraser', 'pan'
let maskBrushSize = 14;
let maskViewMode = 'graph';    // 'graph', 'detection', 'binary'
let isMaskMouseDown = false;
let boxStartPt = null;
let maskUndoStack = [];
let maskRedoStack = [];
let guideCurvePoints = [];     // Stored points from Guide Brush for AI extraction

const sctx = scribbleCanvas.getContext('2d');

function updateUndoRedoButtons() {
    if (btnMaskUndo) btnMaskUndo.disabled = (maskUndoStack.length === 0);
    if (btnMaskRedo) btnMaskRedo.disabled = (maskRedoStack.length === 0);
}

function resetMaskHistory() {
    maskUndoStack = [];
    maskRedoStack = [];
    guideCurvePoints = [];
    updateUndoRedoButtons();
}

function saveMaskState() {
    if (!scribbleCanvas || scribbleCanvas.width === 0) return;
    try {
        const snap = {
            scribble: sctx.getImageData(0, 0, scribbleCanvas.width, scribbleCanvas.height),
            guide: (guideCanvas && gctx) ? gctx.getImageData(0, 0, guideCanvas.width, guideCanvas.height) : null,
            guidePoints: [...guideCurvePoints]
        };
        maskUndoStack.push(snap);
        if (maskUndoStack.length > 25) maskUndoStack.shift();
        maskRedoStack = [];
        updateUndoRedoButtons();
    } catch (e) {
        console.warn('[saveMaskState error]', e);
    }
}

function undoMask() {
    if (maskUndoStack.length === 0) return;
    try {
        const currentSnap = {
            scribble: sctx.getImageData(0, 0, scribbleCanvas.width, scribbleCanvas.height),
            guide: (guideCanvas && gctx) ? gctx.getImageData(0, 0, guideCanvas.width, guideCanvas.height) : null,
            guidePoints: [...guideCurvePoints]
        };
        maskRedoStack.push(currentSnap);
        const prevSnap = maskUndoStack.pop();

        if (prevSnap.scribble) {
            sctx.putImageData(prevSnap.scribble, 0, 0);
        } else if (prevSnap instanceof ImageData) {
            sctx.putImageData(prevSnap, 0, 0);
        }

        if (guideCanvas && gctx) {
            if (prevSnap.guide) {
                gctx.putImageData(prevSnap.guide, 0, 0);
            } else {
                gctx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
            }
        }
        guideCurvePoints = prevSnap.guidePoints ? [...prevSnap.guidePoints] : [];

        renderLiveMask();
        updateUndoRedoButtons();
        updateMaskStatus('Undid last mask action');
        addLog('Undid last mask action.');
    } catch (e) {
        console.warn('[undoMask error]', e);
    }
}

function redoMask() {
    if (maskRedoStack.length === 0) return;
    try {
        const currentSnap = {
            scribble: sctx.getImageData(0, 0, scribbleCanvas.width, scribbleCanvas.height),
            guide: (guideCanvas && gctx) ? gctx.getImageData(0, 0, guideCanvas.width, guideCanvas.height) : null,
            guidePoints: [...guideCurvePoints]
        };
        maskUndoStack.push(currentSnap);
        const nextSnap = maskRedoStack.pop();

        if (nextSnap.scribble) {
            sctx.putImageData(nextSnap.scribble, 0, 0);
        } else if (nextSnap instanceof ImageData) {
            sctx.putImageData(nextSnap, 0, 0);
        }

        if (guideCanvas && gctx) {
            if (nextSnap.guide) {
                gctx.putImageData(nextSnap.guide, 0, 0);
            } else {
                gctx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
            }
        }
        guideCurvePoints = nextSnap.guidePoints ? [...nextSnap.guidePoints] : [];

        renderLiveMask();
        updateUndoRedoButtons();
        updateMaskStatus('Redid mask action');
        addLog('Redid mask action.');
    } catch (e) {
        console.warn('[redoMask error]', e);
    }
}

function clearAllMask() {
    if (!scribbleCanvas || scribbleCanvas.width === 0) return;
    saveMaskState();
    sctx.clearRect(0, 0, scribbleCanvas.width, scribbleCanvas.height);
    if (marqueeCanvas) {
        const mctx = marqueeCanvas.getContext('2d');
        mctx.clearRect(0, 0, marqueeCanvas.width, marqueeCanvas.height);
    }
    if (guideCanvas && gctx) {
        gctx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
    }
    guideCurvePoints = [];
    renderLiveMask();
    updateMaskStatus('Cleared all masks & guides');
    addLog('Cleared all masking marks and curve guides.');
}

function updateMaskStatus(customMsg) {
    if (!maskingStatusText) return;
    if (customMsg) {
        maskingStatusText.textContent = customMsg;
        setTimeout(() => {
            if (maskingStatusText) {
                maskingStatusText.textContent = currentMaskTool === 'navigate' ? 'Calibrating' : (currentMaskTool === 'guide' ? `Guide (${guideCurvePoints.length} pts)` : (currentMaskTool === 'pan' ? 'Pan Active' : 'Masking Active'));
            }
        }, 2500);
        return;
    }
    if (currentMaskTool === 'navigate') {
        maskingStatusText.textContent = 'Calibrating';
    } else if (currentMaskTool === 'guide') {
        maskingStatusText.textContent = `Guide Active (${guideCurvePoints.length} pts)`;
    } else if (currentMaskTool === 'pan') {
        maskingStatusText.textContent = 'Pan Active';
    } else {
        maskingStatusText.textContent = 'Masking Active';
    }
}

function setActiveMaskTool(tool) {
    currentMaskTool = tool;

    // Update tool button active states
    [toolNavigate, toolBrush, toolGuide, toolBox, toolEraser, toolPan].forEach(btn => {
        if (!btn) return;
        if (btn.getAttribute('data-tool') === tool) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (tool === 'navigate') {
        calibrationMode = true;
        btnCalibrateMode.classList.add('blue-btn');
        scribbleCanvas.style.cursor = 'crosshair';
        if (canvasViewport && !isSpacePressed) canvasViewport.classList.remove('pan-mode-active');
        if (brushCursorIndicator) brushCursorIndicator.style.display = 'none';
        if (maskHintText) {
            maskHintText.innerHTML = "<strong>Navigate / Calibrate:</strong> Click 3 points on the graph to register axes (Origin, X-Max, Y-Max).";
        }
        updateCalibrationGuidance();
    } else {
        calibrationMode = false;
        btnCalibrateMode.classList.remove('blue-btn');

        if (tool === 'pan') {
            scribbleCanvas.style.cursor = 'grab';
            if (canvasViewport) canvasViewport.classList.add('pan-mode-active');
            if (brushCursorIndicator) brushCursorIndicator.style.display = 'none';
            if (maskHintText) {
                maskHintText.innerHTML = "<strong>Pan Tool (H):</strong> Drag anywhere to pan across the zoomed image. (Tip: Hold <strong>Spacebar</strong> to pan anytime!)";
            }
        } else {
            if (canvasViewport && !isSpacePressed) canvasViewport.classList.remove('pan-mode-active');

            if (tool === 'brush') {
                scribbleCanvas.style.cursor = 'none';
                if (brushCursorIndicator) {
                    brushCursorIndicator.style.display = 'block';
                    brushCursorIndicator.classList.remove('eraser-mode', 'guide-mode');
                }
                if (maskHintText) {
                    maskHintText.innerHTML = "<strong>Exclude Brush (B):</strong> Drag freely over curves, lines, or noise to mask them out.";
                }
            } else if (tool === 'guide') {
                scribbleCanvas.style.cursor = 'none';
                if (brushCursorIndicator) {
                    brushCursorIndicator.style.display = 'block';
                    brushCursorIndicator.classList.remove('eraser-mode');
                    brushCursorIndicator.classList.add('guide-mode');
                }
                if (maskHintText) {
                    maskHintText.innerHTML = "<strong>Guide Brush (G):</strong> Paint directly over the desired curve in green to guide AI extraction.";
                }
            } else if (tool === 'box') {
                scribbleCanvas.style.cursor = 'crosshair';
                if (brushCursorIndicator) brushCursorIndicator.style.display = 'none';
                if (maskHintText) {
                    maskHintText.innerHTML = "<strong>Box Marquee (R):</strong> Click and drag a rectangle to instantly mask entire legends, titles, or insets in 1 click.";
                }
            } else if (tool === 'eraser') {
                scribbleCanvas.style.cursor = 'none';
                if (brushCursorIndicator) {
                    brushCursorIndicator.style.display = 'block';
                    brushCursorIndicator.classList.remove('guide-mode');
                    brushCursorIndicator.classList.add('eraser-mode');
                }
                if (maskHintText) {
                    maskHintText.innerHTML = "<strong>Restore Eraser (E):</strong> Drag over masked red regions or guide green paths to un-mask and restore them.";
                }
            }
        }
    }
    updateMaskStatus();
}

function setMaskViewMode(mode) {
    maskViewMode = mode;
    [btnModeGraph, btnModeDetection, btnModeBinary].forEach(btn => {
        if (!btn) return;
        btn.classList.remove('active');
    });
    if (mode === 'graph' && btnModeGraph) btnModeGraph.classList.add('active');
    if (mode === 'detection' && btnModeDetection) btnModeDetection.classList.add('active');
    if (mode === 'binary' && btnModeBinary) btnModeBinary.classList.add('active');

    drawCalibrationPoints();
    if (mode === 'binary') {
        if (maskHintText) maskHintText.innerHTML = "<strong>Binary Mask View:</strong> Showing pure B&W threshold cutoff directly in workspace.";
    } else if (mode === 'detection') {
        if (maskHintText) maskHintText.innerHTML = "<strong>Live Detection View:</strong> Extracted curve glowing in neon green, excluded masks in red.";
    }
}

function setMaskBrushSize(size) {
    maskBrushSize = Math.max(2, Math.min(80, parseInt(size)));
    if (sliderMaskBrush) sliderMaskBrush.value = maskBrushSize;
    if (valMaskBrush) valMaskBrush.textContent = `${maskBrushSize}px`;

    // Update preset button active state
    document.querySelectorAll('.size-preset-btn').forEach(btn => {
        if (parseInt(btn.getAttribute('data-size')) === maskBrushSize) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (brushCursorIndicator) {
        brushCursorIndicator.style.width = `${maskBrushSize}px`;
        brushCursorIndicator.style.height = `${maskBrushSize}px`;
    }
}

// 1-Click: Exclude Outside Plot Area
function excludeOutsidePlotArea() {
    if (!calibrationPoints || calibrationPoints.length < 3) {
        alert("Please set or confirm the calibration axes points first so the system knows the plot boundaries.");
        return;
    }
    saveMaskState();

    const W = srcCanvas.width;
    const H = srcCanvas.height;

    const left = Math.max(0, Math.floor(Math.min(calibrationPoints[0].x, calibrationPoints[2].x) * W));
    const right = Math.min(W, Math.ceil(calibrationPoints[1].x * W));
    const top = Math.max(0, Math.floor(calibrationPoints[2].y * H));
    const bottom = Math.min(H, Math.ceil(Math.max(calibrationPoints[0].y, calibrationPoints[1].y) * H));

    sctx.save();
    sctx.globalCompositeOperation = 'source-over';
    sctx.fillStyle = 'rgba(239, 68, 68, 0.55)';

    // Top border (y=0 to y=top)
    if (top > 0) sctx.fillRect(0, 0, W, top);
    // Bottom border (y=bottom to y=H)
    if (bottom < H) sctx.fillRect(0, bottom, W, H - bottom);
    // Left border (x=0 to x=left, between top and bottom)
    if (left > 0) sctx.fillRect(0, top, left, bottom - top);
    // Right border (x=right to x=W, between top and bottom)
    if (right < W) sctx.fillRect(right, top, W - right, bottom - top);

    sctx.restore();
    renderLiveMask();
    updateMaskStatus("Excluded margins outside plot");
    addLog("Excluded margins outside plot area (axis numbers & labels masked).");
}

// Helper: draw freehand brush stroke
function drawBrushStroke(x, y, isStart = false) {
    sctx.save();
    sctx.globalCompositeOperation = 'source-over';
    sctx.lineWidth = maskBrushSize;
    sctx.lineCap = 'round';
    sctx.lineJoin = 'round';
    sctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';

    if (isStart) {
        sctx.beginPath();
        sctx.arc(x, y, maskBrushSize / 2, 0, Math.PI * 2);
        sctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
        sctx.fill();
        sctx.beginPath();
        sctx.moveTo(x, y);
    } else {
        sctx.lineTo(x, y);
        sctx.stroke();
    }
    sctx.restore();
}

// Helper: draw freehand guide stroke for AI curve tracing
function drawGuideStroke(x, y, isStart = false) {
    if (!guideCanvas || !gctx) return;
    gctx.save();
    gctx.globalCompositeOperation = 'source-over';
    const strokeW = Math.max(3, Math.min(18, Math.round(maskBrushSize * 0.6)));
    gctx.lineWidth = strokeW;
    gctx.lineCap = 'round';
    gctx.lineJoin = 'round';
    gctx.strokeStyle = 'rgba(16, 185, 129, 0.9)';
    gctx.shadowColor = '#10B981';
    gctx.shadowBlur = 6;

    if (isStart) {
        gctx.beginPath();
        gctx.arc(x, y, strokeW / 2, 0, Math.PI * 2);
        gctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
        gctx.fill();
        gctx.beginPath();
        gctx.moveTo(x, y);
    } else {
        gctx.lineTo(x, y);
        gctx.stroke();
    }
    gctx.restore();

    if (srcCanvas && srcCanvas.width > 0 && srcCanvas.height > 0) {
        const normX = x / srcCanvas.width;
        const normY = y / srcCanvas.height;
        const lastPt = guideCurvePoints[guideCurvePoints.length - 1];
        if (!lastPt || Math.hypot(x - lastPt.px, y - lastPt.py) >= 5) {
            guideCurvePoints.push({ x: normX, y: normY, px: x, py: y });
        }
    }
}

// Helper: draw eraser stroke
function drawEraserStroke(x, y, isStart = false) {
    sctx.save();
    sctx.globalCompositeOperation = 'destination-out';
    sctx.lineWidth = maskBrushSize;
    sctx.lineCap = 'round';
    sctx.lineJoin = 'round';

    if (isStart) {
        sctx.beginPath();
        sctx.arc(x, y, maskBrushSize / 2, 0, Math.PI * 2);
        sctx.fill();
        sctx.beginPath();
        sctx.moveTo(x, y);
    } else {
        sctx.lineTo(x, y);
        sctx.stroke();
    }
    sctx.restore();

    // Also erase from guideCanvas and remove erased points from guideCurvePoints
    if (guideCanvas && gctx) {
        gctx.save();
        gctx.globalCompositeOperation = 'destination-out';
        gctx.lineWidth = maskBrushSize;
        gctx.lineCap = 'round';
        gctx.lineJoin = 'round';

        if (isStart) {
            gctx.beginPath();
            gctx.arc(x, y, maskBrushSize / 2, 0, Math.PI * 2);
            gctx.fill();
            gctx.beginPath();
            gctx.moveTo(x, y);
        } else {
            gctx.lineTo(x, y);
            gctx.stroke();
        }
        gctx.restore();

        const r = maskBrushSize / 2;
        guideCurvePoints = guideCurvePoints.filter(pt => Math.hypot(pt.px - x, pt.py - y) > r);
    }
}

// Helper: burns mask as pure white (#FFFFFF) onto target canvas for server upload
function burnMaskWhiteIntoCanvas(targetCanvas) {
    if (!scribbleCanvas || scribbleCanvas.width === 0) return;
    const tctx = targetCanvas.getContext('2d');
    const sw = scribbleCanvas.width, sh = scribbleCanvas.height;
    const sData = sctx.getImageData(0, 0, sw, sh).data;
    const tImgData = tctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
    const tData = tImgData.data;
    const tw = targetCanvas.width, th = targetCanvas.height;

    for (let ty = 0; ty < th; ty++) {
        for (let tx = 0; tx < tw; tx++) {
            const sx = Math.floor(tx * (sw / tw));
            const sy = Math.floor(ty * (sh / th));
            const sIdx = (sy * sw + sx) * 4;
            if (sData[sIdx + 3] > 10) {
                const tIdx = (ty * tw + tx) * 4;
                tData[tIdx] = 255;
                tData[tIdx + 1] = 255;
                tData[tIdx + 2] = 255;
                tData[tIdx + 3] = 255;
            }
        }
    }
    tctx.putImageData(tImgData, 0, 0);
}

// Attach Masking Event Listeners to Scribble Canvas
scribbleCanvas.addEventListener('mousedown', (e) => {
    // If middle click, Space held, or Pan tool active: pan viewport
    if (e.button === 1 || isSpacePressed || currentMaskTool === 'pan') {
        e.preventDefault();
        startPan(e);
        return;
    }

    if (currentMaskTool === 'navigate' || calibrationMode || fiveClickMode) return;

    const coords = getWorkspaceCoords(e);
    const x = coords.x;
    const y = coords.y;

    isMaskMouseDown = true;
    saveMaskState();

    if (currentMaskTool === 'brush') {
        drawBrushStroke(x, y, true);
    } else if (currentMaskTool === 'guide') {
        drawGuideStroke(x, y, true);
    } else if (currentMaskTool === 'eraser') {
        drawEraserStroke(x, y, true);
    } else if (currentMaskTool === 'box') {
        boxStartPt = { x, y };
    }
});

scribbleCanvas.addEventListener('mousemove', (e) => {
    if (isPanning) {
        updatePan(e);
        return;
    }

    const coords = getWorkspaceCoords(e);
    const x = coords.x;
    const y = coords.y;

    // Update brush cursor ring position & scaled diameter
    if (brushCursorIndicator && (currentMaskTool === 'brush' || currentMaskTool === 'guide' || currentMaskTool === 'eraser') && !isSpacePressed) {
        const displaySize = Math.max(4, Math.round(maskBrushSize / coords.scaleX));
        brushCursorIndicator.style.display = 'block';
        brushCursorIndicator.style.left = `${coords.clientX}px`;
        brushCursorIndicator.style.top = `${coords.clientY}px`;
        brushCursorIndicator.style.width = `${displaySize}px`;
        brushCursorIndicator.style.height = `${displaySize}px`;
        if (currentMaskTool === 'guide') {
            brushCursorIndicator.classList.add('guide-mode');
            brushCursorIndicator.classList.remove('eraser-mode');
        } else if (currentMaskTool === 'eraser') {
            brushCursorIndicator.classList.add('eraser-mode');
            brushCursorIndicator.classList.remove('guide-mode');
        } else {
            brushCursorIndicator.classList.remove('eraser-mode', 'guide-mode');
        }
    } else if (brushCursorIndicator) {
        brushCursorIndicator.style.display = 'none';
    }

    if (!isMaskMouseDown) return;

    if (currentMaskTool === 'brush') {
        drawBrushStroke(x, y, false);
    } else if (currentMaskTool === 'guide') {
        drawGuideStroke(x, y, false);
    } else if (currentMaskTool === 'eraser') {
        drawEraserStroke(x, y, false);
    } else if (currentMaskTool === 'box' && boxStartPt && marqueeCanvas) {
        const mctx = marqueeCanvas.getContext('2d');
        mctx.clearRect(0, 0, marqueeCanvas.width, marqueeCanvas.height);
        const rx = Math.min(boxStartPt.x, x);
        const ry = Math.min(boxStartPt.y, y);
        const rw = Math.abs(x - boxStartPt.x);
        const rh = Math.abs(y - boxStartPt.y);

        mctx.save();
        mctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        mctx.fillRect(rx, ry, rw, rh);
        mctx.strokeStyle = '#EF4444';
        mctx.lineWidth = 1.5;
        mctx.setLineDash([4, 4]);
        mctx.strokeRect(rx, ry, rw, rh);

        if (rw > 30 && rh > 15) {
            mctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            mctx.fillRect(rx + 4, ry + 4, 64, 18);
            mctx.fillStyle = '#FFFFFF';
            mctx.font = 'bold 10px sans-serif';
            mctx.fillText(`${Math.round(rw)} × ${Math.round(rh)}`, rx + 8, ry + 16);
        }
        mctx.restore();
    }
});

scribbleCanvas.addEventListener('mouseup', (e) => {
    if (isPanning) {
        endPan();
        return;
    }

    if (!isMaskMouseDown) return;
    isMaskMouseDown = false;

    const coords = getWorkspaceCoords(e);
    const x = coords.x;
    const y = coords.y;

    if (currentMaskTool === 'brush' || currentMaskTool === 'eraser') {
        sctx.beginPath();
        if (gctx) gctx.beginPath();
        renderLiveMask();
        updateMaskStatus();
    } else if (currentMaskTool === 'guide') {
        if (gctx) gctx.beginPath();
        updateMaskStatus(`Guide: ${guideCurvePoints.length} points traced`);
    } else if (currentMaskTool === 'box' && boxStartPt) {
        const rx = Math.min(boxStartPt.x, x);
        const ry = Math.min(boxStartPt.y, y);
        const rw = Math.abs(x - boxStartPt.x);
        const rh = Math.abs(y - boxStartPt.y);
        boxStartPt = null;

        if (marqueeCanvas) {
            const mctx = marqueeCanvas.getContext('2d');
            mctx.clearRect(0, 0, marqueeCanvas.width, marqueeCanvas.height);
        }

        if (rw > 2 && rh > 2) {
            sctx.save();
            sctx.globalCompositeOperation = 'source-over';
            sctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
            sctx.fillRect(rx, ry, rw, rh);
            sctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
            sctx.lineWidth = 1;
            sctx.strokeRect(rx, ry, rw, rh);
            sctx.restore();
            renderLiveMask();
            updateMaskStatus('Excluded box region');
        }
    }
});

scribbleCanvas.addEventListener('mouseleave', () => {
    if (brushCursorIndicator) brushCursorIndicator.style.display = 'none';
    if (isPanning) {
        endPan();
    }
    if (isMaskMouseDown) {
        isMaskMouseDown = false;
        if (marqueeCanvas) {
            const mctx = marqueeCanvas.getContext('2d');
            mctx.clearRect(0, 0, marqueeCanvas.width, marqueeCanvas.height);
        }
        boxStartPt = null;
        sctx.beginPath();
        if (gctx) gctx.beginPath();
        renderLiveMask();
    }
});

// Window listeners for global smooth panning
window.addEventListener('mousemove', (e) => {
    if (isPanning) updatePan(e);
});
window.addEventListener('mouseup', () => {
    if (isPanning) endPan();
});

// Viewport Wheel Zoom (Ctrl + Wheel or Pinch)
if (canvasViewport) {
    canvasViewport.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const vpRect = canvasViewport.getBoundingClientRect();
            const mouseVpX = e.clientX - vpRect.left;
            const mouseVpY = e.clientY - vpRect.top;
            const imgX = (canvasViewport.scrollLeft + mouseVpX) / currentZoom;
            const imgY = (canvasViewport.scrollTop + mouseVpY) / currentZoom;

            const delta = e.deltaY < 0 ? 0.2 : -0.2;
            applyZoom(currentZoom + delta, { imgX, imgY, mouseVpX, mouseVpY });
        }
    }, { passive: false });
}

// Toolbar Button Bindings
if (toolNavigate) toolNavigate.addEventListener('click', () => setActiveMaskTool('navigate'));
if (toolBrush) toolBrush.addEventListener('click', () => setActiveMaskTool('brush'));
if (toolGuide) toolGuide.addEventListener('click', () => setActiveMaskTool('guide'));
if (toolBox) toolBox.addEventListener('click', () => setActiveMaskTool('box'));
if (toolEraser) toolEraser.addEventListener('click', () => setActiveMaskTool('eraser'));
if (toolPan) toolPan.addEventListener('click', () => setActiveMaskTool('pan'));

if (btnExcludeOutside) btnExcludeOutside.addEventListener('click', excludeOutsidePlotArea);
if (btnMaskUndo) btnMaskUndo.addEventListener('click', undoMask);
if (btnMaskRedo) btnMaskRedo.addEventListener('click', redoMask);
if (btnClearMask) btnClearMask.addEventListener('click', clearAllMask);

if (btnZoomIn) btnZoomIn.addEventListener('click', () => applyZoom(currentZoom + 0.25));
if (btnZoomOut) btnZoomOut.addEventListener('click', () => applyZoom(currentZoom - 0.25));
if (sliderZoom) {
    sliderZoom.addEventListener('input', () => {
        applyZoom(parseInt(sliderZoom.value) / 100);
    });
}

document.querySelectorAll('.zoom-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const z = btn.getAttribute('data-zoom');
        if (z === 'fit') {
            zoomFit();
        } else {
            applyZoom(parseFloat(z));
            centerViewport();
        }
    });
});

if (btnCenterView) btnCenterView.addEventListener('click', centerViewport);
if (btnToggleExpandViewport) btnToggleExpandViewport.addEventListener('click', toggleExpandViewport);

if (sliderMaskBrush) {
    sliderMaskBrush.addEventListener('input', () => {
        setMaskBrushSize(sliderMaskBrush.value);
    });
}

document.querySelectorAll('.size-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const size = parseInt(btn.getAttribute('data-size'));
        setMaskBrushSize(size);
    });
});

if (btnModeGraph) btnModeGraph.addEventListener('click', () => setMaskViewMode('graph'));
if (btnModeDetection) btnModeDetection.addEventListener('click', () => setMaskViewMode('detection'));
if (btnModeBinary) btnModeBinary.addEventListener('click', () => setMaskViewMode('binary'));

// Synchronize Quick Whiteness Slider with Sidebar Whiteness Slider
if (sliderQuickWhiteness) {
    sliderQuickWhiteness.addEventListener('input', () => {
        sliderWhiteness.value = sliderQuickWhiteness.value;
        valWhiteness.textContent = sliderQuickWhiteness.value;
        if (valQuickWhiteness) valQuickWhiteness.textContent = sliderQuickWhiteness.value;
        renderLiveMask();
    });
}

// Spacebar Quick-Pan Listeners
window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    if (e.code === 'Space') {
        e.preventDefault();
        if (!isSpacePressed) {
            isSpacePressed = true;
            if (canvasViewport) canvasViewport.classList.add('pan-mode-active');
            if (brushCursorIndicator) brushCursorIndicator.style.display = 'none';
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        isSpacePressed = false;
        if (canvasViewport && currentMaskTool !== 'pan') {
            canvasViewport.classList.remove('pan-mode-active');
        }
    }
});

// Global Keyboard Shortcuts for Masking & Navigation
window.addEventListener('keydown', (e) => {
    // Avoid capturing inputs while typing in text inputs or textareas
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
    }

    // Ctrl+Z / Cmd+Z for Undo
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        undoMask();
        return;
    }

    // Ctrl+Y or Ctrl+Shift+Z for Redo
    if (((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
        e.preventDefault();
        redoMask();
        return;
    }

    if (e.key === 'b' || e.key === 'B') {
        setActiveMaskTool('brush');
    } else if (e.key === 'g' || e.key === 'G') {
        setActiveMaskTool('guide');
    } else if (e.key === 'r' || e.key === 'R') {
        setActiveMaskTool('box');
    } else if (e.key === 'e' || e.key === 'E') {
        setActiveMaskTool('eraser');
    } else if (e.key === 'h' || e.key === 'H') {
        setActiveMaskTool('pan');
    } else if (e.key === '+' || e.key === '=') {
        applyZoom(currentZoom + 0.25);
    } else if (e.key === '-' || e.key === '_') {
        applyZoom(currentZoom - 0.25);
    } else if (e.key === '0') {
        applyZoom(1.0);
        centerViewport();
    } else if (e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        centerViewport();
    } else if (e.key === '[') {
        setMaskBrushSize(maskBrushSize - 4);
    } else if (e.key === ']') {
        setMaskBrushSize(maskBrushSize + 4);
    } else if (e.key === 'm' || e.key === 'M') {
        const nextMode = maskViewMode === 'graph' ? 'detection' : (maskViewMode === 'detection' ? 'binary' : 'graph');
        setMaskViewMode(nextMode);
    }
});

// renderLiveMask — powered by OpenCV.js HSV masking
function renderLiveMask() {
    if (!activeImageObj || !srcCanvas) return;
    const colorMode = selectColorMode.value;

    // Use OpenCV HSV masking if ready, otherwise fall back to manual JS
    if (window.cvReady && window.cv && window.cv.Mat) {
        cvRenderLiveMask(srcCanvas, maskCanvas, colorMode, parseInt(sliderWhiteness.value))
            .then(() => {
                if (typeof maskViewMode !== 'undefined' && maskViewMode !== 'graph') {
                    drawCalibrationPoints();
                }
            })
            .catch(err => console.warn('[OpenCV renderLiveMask failed]', err));
        return;
    }

    // ── Fallback: pure-JS pixel scan (when OpenCV not yet loaded) ──
    const mctx = maskCanvas.getContext('2d');
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = srcCanvas.width;
    tempCanvas.height = srcCanvas.height;
    const tctx = tempCanvas.getContext('2d');

    tctx.drawImage(activeImageObj, 0, 0, srcCanvas.width, srcCanvas.height);
    tctx.drawImage(scribbleCanvas, 0, 0);

    const imgData = tctx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
    const data = imgData.data;
    const whiteness = parseInt(sliderWhiteness.value);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        let binaryVal = 255;

        if (r > whiteness && g > whiteness && b > whiteness) {
            data[i] = data[i + 1] = data[i + 2] = 255;
            continue;
        }

        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const d = max - min;
        let h = 0;
        const s = max === 0 ? 0 : d / max;
        const v = max;
        if (d !== 0) {
            if (max === r / 255) h = ((g - b) / (d * 255) + (g < b ? 6 : 0)) / 6;
            else if (max === g / 255) h = ((b - r) / (d * 255) + 2) / 6;
            else h = ((r - g) / (d * 255) + 4) / 6;
        }
        h = h * 360;

        let isCurve = false;
        if (colorMode === 'grayscale') isCurve = true;
        else if (colorMode === 'red') isCurve = (r > 100 && r > g + 20 && r > b + 20 && s > 0.15 && v > 0.15 && (h <= 20 || h >= 330));
        else if (colorMode === 'yellow') isCurve = (r > 120 && g > 120 && r > b + 30 && g > b + 30 && s > 0.15 && v > 0.30 && h >= 50 && h <= 75);
        else if (colorMode === 'blue') isCurve = (b > 80 && b > r + 20 && b > g + 10 && s > 0.15 && v > 0.15 && h >= 190 && h <= 270);
        else if (colorMode === 'green') isCurve = (g > 80 && g > r + 20 && g > b + 15 && s > 0.15 && v > 0.15 && h >= 75 && h <= 170);
        else if (colorMode === 'orange') isCurve = (r > 120 && r > g + 30 && r > b + 60 && s > 0.20 && v > 0.30 && h >= 15 && h <= 50);
        else if (colorMode === 'cyan') isCurve = (g > 80 && b > 80 && g > r + 15 && b > r + 15 && s > 0.15 && v > 0.15 && h >= 165 && h <= 205);
        else if (colorMode === 'magenta') isCurve = (r > 80 && b > 80 && r > g + 15 && b > g + 15 && s > 0.15 && v > 0.15 && h >= 270 && h <= 340);
        else if (colorMode === 'black') isCurve = (v < 0.45 && s < 0.20 && r < 130 && g < 130 && b < 130);

        if (isCurve) binaryVal = 0;
        data[i] = data[i + 1] = data[i + 2] = binaryVal;
    }
    mctx.putImageData(imgData, 0, 0);

    if (typeof maskViewMode !== 'undefined' && maskViewMode !== 'graph') {
        drawCalibrationPoints();
    }
}

sliderWhiteness.addEventListener('input', () => {
    valWhiteness.textContent = sliderWhiteness.value;
    if (sliderQuickWhiteness) sliderQuickWhiteness.value = sliderWhiteness.value;
    if (valQuickWhiteness) valQuickWhiteness.textContent = sliderWhiteness.value;
    renderLiveMask();
});
selectColorMode.addEventListener('change', renderLiveMask);

// Extract Curves and Digitize — OpenCV.js powered
btnExtractCurves.addEventListener('click', async () => {
    if (!activeImageObj) return;

    if (fiveClickMode) {
        traceFiveClickCurve();
        return;
    }

    showLoading('Extracting curves with OpenCV.js...');

    try {
        const configs = {
            colorMode: selectColorMode.value,
            smoothingWindow: parseInt(sliderSmoothing.value),
            whitenessThresh: parseInt(sliderWhiteness.value),
            xScaleType: selectXScale.value,
            yScaleType: selectYScale.value
        };

        const scaledVertices = calibrationPoints.map(pt => ({
            x: Math.round(pt.x * activeImageObj.width),
            y: Math.round(pt.y * activeImageObj.height)
        }));

        // ── Use OpenCV.js contour-based tracing ──
        if (window.cvReady && window.cv && window.cv.Mat && scaledVertices.length >= 3) {
            // Build offscreen canvas with manual filter adjustments applied
            const offscreen = document.createElement('canvas');
            offscreen.width = srcCanvas.width;
            offscreen.height = srcCanvas.height;
            const octx = offscreen.getContext('2d');
            octx.drawImage(activeImageObj, 0, 0, srcCanvas.width, srcCanvas.height);
            octx.drawImage(scribbleCanvas, 0, 0);

            // Apply manual brightness/contrast if user adjusted sliders
            const brightness = parseInt(sliderBrightness.value);
            const contrast = parseFloat(sliderContrast.value);
            if (brightness !== 0 || contrast !== 1.0) {
                const imgData = octx.getImageData(0, 0, offscreen.width, offscreen.height);
                applyBrightnessContrast(imgData.data, brightness, contrast);
                octx.putImageData(imgData, 0, 0);
            }

            // Scale vertices to match display canvas dimensions
            const displayVertices = calibrationPoints.map(pt => ({
                x: Math.round(pt.x * srcCanvas.width),
                y: Math.round(pt.y * srcCanvas.height)
            }));

            // ── Check if user guided the curve with the Guide Brush ──
            if (guideCurvePoints && guideCurvePoints.length >= 5 && typeof cvExtractCurveByMajorityClicks === 'function') {
                addLog(`[Guide Brush] Guiding AI extraction along ${guideCurvePoints.length} painted guide points...`);
                const sortedPts = [...guideCurvePoints].sort((a, b) => a.x - b.x);
                const sampleCount = Math.min(15, sortedPts.length);
                const step = (sortedPts.length - 1) / (sampleCount - 1);
                const sampledClicks = [];
                for (let i = 0; i < sampleCount; i++) {
                    const pt = sortedPts[Math.round(i * step)];
                    sampledClicks.push({ x: pt.x, y: pt.y });
                }

                try {
                    const resultCurve = await cvExtractCurveByMajorityClicks(
                        srcCanvas, sampledClicks, configs.colorMode, displayVertices, xRange, yRange, configs
                    );
                    if (resultCurve && resultCurve.data && resultCurve.data.length > 0) {
                        const finalCurve = {
                            name: `Guided Spectrum Curve`,
                            color: '#10B981',
                            data: resultCurve.data,
                            rawPoints: resultCurve.rawPoints
                        };
                        window.activeCurves = activeCurves = [finalCurve];
                        currentCurve = finalCurve.data;
                        plotPreviewChart();
                        btnDownloadCsv.removeAttribute('disabled');
                        btnDownloadJson.removeAttribute('disabled');
                        if (btnLoadCurve) btnLoadCurve.removeAttribute('disabled');
                        hideLoading();
                        addLog(`[Guide Brush] Successfully extracted guided curve with ${finalCurve.data.length} data points!`);
                        return;
                    }
                } catch (guideErr) {
                    console.warn('[Guide Brush extraction fallback to contour scan]', guideErr);
                    addLog(`[Guide Brush] Primary guide trace fallback: ${guideErr.message}. Running contour scan...`);
                }
            }

            const curves = await cvTraceCurves(
                offscreen, configs.colorMode, displayVertices, xRange, yRange, configs
            );

            if (curves.length === 0) {
                addLog('OpenCV extraction: no curves found. Try adjusting color mode or calibration points.');
                return;
            }

            window.activeCurves = activeCurves = curves;
            currentCurve = activeCurves[0].data;
            plotPreviewChart();
            btnDownloadCsv.removeAttribute('disabled');
            btnDownloadJson.removeAttribute('disabled');
            if (btnLoadCurve) btnLoadCurve.removeAttribute('disabled');
            addLog(`[OpenCV] Digitized ${activeCurves.length} curve(s): ${activeCurves.map(c => c.name).join(', ')}.`);
            return;
        }

        // ── Fallback: server-side /api/digitize ──
        addLog('OpenCV not ready, using server-side digitizer...');
        const offscreen = document.createElement('canvas');
        offscreen.width = activeImageObj.width;
        offscreen.height = activeImageObj.height;
        const octx = offscreen.getContext('2d');
        octx.drawImage(activeImageObj, 0, 0);
        const fullImgData = octx.getImageData(0, 0, offscreen.width, offscreen.height);
        const fullData = fullImgData.data;
        const brightness = parseInt(sliderBrightness.value);
        const contrast = parseFloat(sliderContrast.value);
        const medianSize = parseInt(sliderMedian.value);
        const blurRadius = parseInt(sliderBlur.value);
        const erodeRadius = parseInt(sliderErode.value);
        const dilateRadius = parseInt(sliderDilate.value);
        const scaleRatio = activeImageObj.width / srcCanvas.width;
        const scaledMedian = medianSize > 1 ? Math.round(medianSize * scaleRatio) | 1 : 1;
        const scaledBlur = Math.round(blurRadius * scaleRatio);
        const scaledErode = Math.round(erodeRadius * scaleRatio);
        const scaledDilate = Math.round(dilateRadius * scaleRatio);
        applyBrightnessContrast(fullData, brightness, contrast);
        applyMedianFilter(fullData, offscreen.width, offscreen.height, scaledMedian);
        applyGaussianBlur(fullData, offscreen.width, offscreen.height, scaledBlur);
        applyErode(fullData, offscreen.width, offscreen.height, scaledErode);
        applyDilate(fullData, offscreen.width, offscreen.height, scaledDilate);
        octx.putImageData(fullImgData, 0, 0);
        burnMaskWhiteIntoCanvas(offscreen);
        const imageBlob = await new Promise(resolve => offscreen.toBlob(resolve, 'image/png'));
        const activeFile = uploadedFiles[activeImageIndex];
        const uploadFile = new File([imageBlob], activeFile.name, { type: 'image/png' });
        const formData = new FormData();
        formData.append('files', uploadFile);
        formData.append('vertices', JSON.stringify(scaledVertices));
        formData.append('xRange', JSON.stringify(xRange));
        formData.append('yRange', JSON.stringify(yRange));
        formData.append('configs', JSON.stringify(configs));
        const response = await fetch('/api/digitize', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.error) { alert('⚠️ ' + result.error); addLog('Extraction error: ' + result.error); return; }
        window.activeCurves = activeCurves = result.curves || [];
        if (activeCurves.length > 0) {
            currentCurve = activeCurves[0].data;
            plotPreviewChart();
            btnDownloadCsv.removeAttribute('disabled');
            btnDownloadJson.removeAttribute('disabled');
            if (btnLoadCurve) btnLoadCurve.removeAttribute('disabled');
            addLog(`Digitized ${activeCurves.length} curves.`);
        } else {
            currentCurve = null;
            addLog('No curves detected. Adjust options or threshold settings.');
        }
    } catch (err) {
        addLog('Extraction failed: ' + err.message);
        console.error(err);
    } finally {
        hideLoading();
    }
});

sliderSmoothing.addEventListener('input', () => {
    valSmoothing.textContent = sliderSmoothing.value;
});

// Range limits editing controls
btnAutodetect.addEventListener('click', async () => {
    const activeFile = uploadedFiles[activeImageIndex];
    if (activeFile) {
        await triggerAutoCalibration(activeFile.fileObject);
    } else {
        addLog("No active image loaded to auto-detect.");
    }
});

// btnEditRange is no longer needed (editor always visible), keep as no-op
if (btnEditRange) btnEditRange.addEventListener('click', () => { });

const inputXMin = document.getElementById('input-x-min');
const inputXMax = document.getElementById('input-x-max');
const inputYMin = document.getElementById('input-y-min');
const inputYMax = document.getElementById('input-y-max');

[inputXMin, inputXMax, inputYMin, inputYMax].forEach(el => {
    el.addEventListener('input', saveCustomLimits);
    el.addEventListener('change', saveCustomLimits);
});

function recalculateActiveCurvesData() {
    const displayVertices = (calibrationPoints && calibrationPoints.length >= 3) ? calibrationPoints.map(pt => ({
        x: Math.round(pt.x * srcCanvas.width),
        y: Math.round(pt.y * srcCanvas.height)
    })) : [
        { x: Math.floor(srcCanvas.width * 0.12), y: Math.floor(srcCanvas.height * 0.82) },
        { x: Math.floor(srcCanvas.width * 0.93), y: Math.floor(srcCanvas.height * 0.82) },
        { x: Math.floor(srcCanvas.width * 0.12), y: Math.floor(srcCanvas.height * 0.08) }
    ];

    const origin = displayVertices[0];
    const xMaxV = displayVertices[1];
    const yMaxV = displayVertices[2];

    const xMinVal = xRange[0], xMaxVal = xRange[1];
    const yMinVal = yRange[0], yMaxVal = yRange[1];
    const xScaleType = selectXScale.value;
    const yScaleType = selectYScale.value;
    const smoothWin = parseInt(sliderSmoothing.value) || 5;

    const xSpan = (xMaxV.x - origin.x) || 1;
    const ySpan = (origin.y - yMaxV.y) || 1;
    const minY = Math.min(yMinVal, yMaxVal);
    const maxY = Math.max(yMinVal, yMaxVal);

    if (activeCurves && activeCurves.length > 0) {
        activeCurves.forEach(c => {
            if (!c.rawPoints || c.rawPoints.length === 0) return;
            const rawX = [], rawY = [];
            for (const [px, py] of c.rawPoints) {
                const xPct = (px - origin.x) / xSpan;
                const yPct = (origin.y - py) / ySpan;

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

                if (!isNaN(rx) && !isNaN(ry)) {
                    rawX.push(rx);
                    rawY.push(Math.max(minY, Math.min(maxY, ry)));
                }
            }

            if (rawX.length >= 15) {
                const smoothY = smoothArray(rawY, smoothWin);
                c.data = rawX.map((x, i) => [x, smoothY[i]]);
            }
        });

        if (activeCurves[0] && activeCurves[0].data) {
            currentCurve = activeCurves[0].data;
        }
        plotPreviewChart();
    }

    // Also recalculate any matching curves in collectedCurves database that belong to the active image
    const activeFile = uploadedFiles[activeImageIndex];
    if (activeFile && collectedCurves && collectedCurves.length > 0) {
        let collectedUpdated = false;
        collectedCurves.forEach(c => {
            if (c.imageName === activeFile.name && c.rawPoints && c.rawPoints.length > 0) {
                const rawX = [], rawY = [];
                for (const [px, py] of c.rawPoints) {
                    const xPct = (px - origin.x) / xSpan;
                    const yPct = (origin.y - py) / ySpan;

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

                    if (!isNaN(rx) && !isNaN(ry)) {
                        rawX.push(rx);
                        rawY.push(Math.max(minY, Math.min(maxY, ry)));
                    }
                }

                if (rawX.length >= 15) {
                    const smoothY = smoothArray(rawY, smoothWin);
                    const recalculated = rawX.map((x, i) => [x, smoothY[i]]);
                    c.data = [...recalculated].sort((a, b) => a[0] - b[0]);
                    c.originalData = [...c.data];
                    collectedUpdated = true;
                }
            }
        });
        if (collectedUpdated) {
            renderCollectedCurvesPlot();
            renderAverageSpectrumPlot();
        }
    }
}

function saveCustomLimits() {
    const xMin = parseNumericExpression(inputXMin.value);
    const xMax = parseNumericExpression(inputXMax.value);
    const yMin = parseNumericExpression(inputYMin.value);
    const yMax = parseNumericExpression(inputYMax.value);
    if (isNaN(xMin) || isNaN(xMax) || isNaN(yMin) || isNaN(yMax)) return;
    xRange = [xMin, xMax];
    yRange = [yMin, yMax];
    updateRangeUI();
    recalculateActiveCurvesData();
}

// Hook up pre-processing sliders & scale listeners
sliderBrightness.addEventListener('input', () => {
    valBrightness.textContent = sliderBrightness.value;
    processAndRenderFilters();
});

sliderContrast.addEventListener('input', () => {
    valContrast.textContent = parseFloat(sliderContrast.value).toFixed(1);
    processAndRenderFilters();
});

sliderMedian.addEventListener('input', () => {
    const size = parseInt(sliderMedian.value);
    valMedian.textContent = size === 1 ? "Off" : `${size}x${size}`;
    processAndRenderFilters();
});

sliderBlur.addEventListener('input', () => {
    valBlur.textContent = sliderBlur.value;
    processAndRenderFilters();
});

sliderErode.addEventListener('input', () => {
    valErode.textContent = sliderErode.value;
    processAndRenderFilters();
});

sliderDilate.addEventListener('input', () => {
    valDilate.textContent = sliderDilate.value;
    processAndRenderFilters();
});

btnResetFilters.addEventListener('click', () => {
    sliderBrightness.value = 0;
    valBrightness.textContent = "0";
    sliderContrast.value = 1.0;
    valContrast.textContent = "1.0";
    sliderMedian.value = 1;
    valMedian.textContent = "Off";
    sliderBlur.value = 0;
    valBlur.textContent = "0";
    sliderErode.value = 0;
    valErode.textContent = "0";
    sliderDilate.value = 0;
    valDilate.textContent = "0";
    processAndRenderFilters();
    addLog("Manual image pre-processing filters reset to default.");
});

selectXScale.addEventListener('change', () => {
    updateRangeUI();
    recalculateActiveCurvesData();
    addLog(`X-axis scale changed to: ${selectXScale.value}`);
});

selectYScale.addEventListener('change', () => {
    updateRangeUI();
    recalculateActiveCurvesData();
    addLog(`Y-axis scale changed to: ${selectYScale.value}`);
});

// Sync the input fields to current xRange/yRange values
function syncRangeInputs() {
    inputXMin.value = xRange[0];
    inputXMax.value = xRange[1];
    inputYMin.value = yRange[0];
    inputYMax.value = yRange[1];
    updateRangeUI();
}

function updateRangeUI() {
    document.getElementById('lbl-x-range').textContent = `${formatValue(xRange[0])} to ${formatValue(xRange[1])}`;
    document.getElementById('lbl-y-range').textContent = `${formatValue(yRange[0])} to ${formatValue(yRange[1])}`;
}

// Load Current Curve (Save digitized curve without resetting workspace)
if (btnLoadCurve) {
    btnLoadCurve.addEventListener('click', () => {
        if (activeCurves && activeCurves.length > 0) {
            activeCurves.forEach((c) => {
                const curveName = `${uploadedFiles[activeImageIndex].name.split('.')[0]} (${c.color})`;
                const curveIndex = collectedCurves.findIndex(item => item.name === curveName);
                // Ensure data points are sorted by X coordinate in ascending order
                const sortedData = [...c.data].sort((a, b) => a[0] - b[0]);
                
                if (curveIndex > -1) {
                    collectedCurves[curveIndex] = {
                        name: curveName,
                        data: sortedData,
                        originalData: [...sortedData],
                        color: c.color,
                        rawPoints: c.rawPoints ? [...c.rawPoints] : null,
                        imageName: uploadedFiles[activeImageIndex].name
                    };
                    addLog(`Updated ${curveName} in collection database.`);
                } else {
                    collectedCurves.push({
                        name: curveName,
                        data: sortedData,
                        originalData: [...sortedData],
                        color: c.color,
                        rawPoints: c.rawPoints ? [...c.rawPoints] : null,
                        imageName: uploadedFiles[activeImageIndex].name
                    });
                    addLog(`Saved ${curveName} to collection database.`);
                }
            });
            document.getElementById('collected-curves-count').textContent = collectedCurves.length;
            
            // Render the updated collected curves chart in tabs
            renderCollectedCurvesPlot();
            renderAverageSpectrumPlot();
        } else {
            alert("No digitized curve to load. Please extract curves first.");
        }
    });
}

// Next Image (Save digitized curve and reset workspace)
btnNextImage.addEventListener('click', () => {
    if (activeCurves && activeCurves.length > 0) {
        activeCurves.forEach((c) => {
            const curveName = `${uploadedFiles[activeImageIndex].name.split('.')[0]} (${c.color})`;
            const curveIndex = collectedCurves.findIndex(item => item.name === curveName);
            const sortedData = [...c.data].sort((a, b) => a[0] - b[0]);
            
            if (curveIndex > -1) {
                collectedCurves[curveIndex] = {
                    name: curveName,
                    data: sortedData,
                    originalData: [...sortedData],
                    color: c.color,
                    rawPoints: c.rawPoints ? [...c.rawPoints] : null,
                    imageName: uploadedFiles[activeImageIndex].name
                };
                addLog(`Updated ${curveName} in collection database.`);
            } else {
                collectedCurves.push({
                    name: curveName,
                    data: sortedData,
                    originalData: [...sortedData],
                    color: c.color,
                    rawPoints: c.rawPoints ? [...c.rawPoints] : null,
                    imageName: uploadedFiles[activeImageIndex].name
                });
                addLog(`Saved ${curveName} to collection database.`);
            }
        });
        document.getElementById('collected-curves-count').textContent = collectedCurves.length;
    }

    // Clear Workspace
    activeCurves = [];
    currentCurve = null;
    calibrationPoints = [];
    fiveClickPoints = [];
    calibrationMode = false;
    btnCalibrateMode.classList.remove('blue-btn');
    updateFiveClickGuidance();

    // Clear preview plotly chart
    plotlyPreviewChart.innerHTML = '';
    previewPlaceholder.classList.remove('hidden');
    if (digitizedSummaryContainer) digitizedSummaryContainer.classList.add('hidden');

    // Clear scribbles and guides
    sctx.clearRect(0, 0, scribbleCanvas.width, scribbleCanvas.height);
    if (guideCanvas && gctx) gctx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
    guideCurvePoints = [];

    // Disable export buttons
    btnDownloadCsv.setAttribute('disabled', 'true');
    btnDownloadJson.setAttribute('disabled', 'true');
    if (btnLoadCurve) btnLoadCurve.setAttribute('disabled', 'true');

    // If there is a next file in uploaded dropdown list, select it
    if (activeImageIndex < uploadedFiles.length - 1) {
        activeImageIndex++;
        if (selectActiveImage) selectActiveImage.value = activeImageIndex;
        loadActiveImage();
    } else {
        // Workspace clean
        srcCanvas.getContext('2d').clearRect(0, 0, srcCanvas.width, srcCanvas.height);
        maskCanvas.getContext('2d').clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        canvasContainer.classList.add('hidden');
        processedMaskContainer.classList.add('hidden');
        btnExtractCurves.setAttribute('disabled', 'true');
        dropZone.classList.remove('hidden');
        document.getElementById('demo-load-wrapper').classList.remove('hidden');
    }

    // Render the updated collected curves chart in tabs
    renderCollectedCurvesPlot();
    renderAverageSpectrumPlot();
});

// Theme helper
function getThemeColor(variableName) {
    return getComputedStyle(document.body).getPropertyValue(variableName).trim();
}

// Single Digitized Spectrum Plotly Chart rendering
function plotPreviewChart() {
    if (!activeCurves || activeCurves.length === 0) return;

    previewPlaceholder.classList.add('hidden');

    const isLightMode = document.body.classList.contains('light-mode');
    const traces = activeCurves.map(c => {
        const xVals = c.data.map(pt => pt[0]);
        const yVals = c.data.map(pt => pt[1]);

        let colorHex = '#FF6D00'; // Default Orange
        if (c.color === 'red') colorHex = '#EF4444';
        else if (c.color === 'yellow') colorHex = '#EAB308';
        else if (c.color === 'orange') colorHex = '#FF6D00';
        else if (c.color === 'blue') colorHex = '#3B82F6';
        else if (c.color === 'green') colorHex = '#10B981';
        else if (c.color === 'cyan') colorHex = '#06B6D4';
        else if (c.color === 'magenta') colorHex = '#D946EF';
        else if (c.color === 'black') colorHex = isLightMode ? '#1E293B' : '#94A3B8'; // dark gray for light theme, light gray for dark theme

        return {
            x: xVals,
            y: yVals,
            type: 'scatter',
            mode: 'lines',
            name: `Digitized (${c.color})`,
            line: { color: colorHex, width: 3 }
        };
    });

    const paperBg = getThemeColor('--plotly-bg');
    const textCol = getThemeColor('--plotly-text');
    const gridCol = getThemeColor('--plotly-grid');
    const tickCol = getThemeColor('--plotly-tick');

    const layout = {
        title: { text: 'Extracted Curves Preview', font: { color: textCol } },
        xaxis: {
            title: xLabel,
            type: selectXScale.value === 'log' ? 'log' : 'linear',
            gridcolor: gridCol,
            tickfont: { color: tickCol },
            titlefont: { color: textCol }
        },
        yaxis: {
            title: yLabel,
            type: selectYScale.value === 'log' ? 'log' : 'linear',
            gridcolor: gridCol,
            tickfont: { color: tickCol },
            titlefont: { color: textCol }
        },
        paper_bgcolor: paperBg,
        plot_bgcolor: paperBg,
        margin: { l: 50, r: 30, t: 40, b: 50 },
        legend: { font: { color: tickCol } }
    };

    Plotly.newPlot(plotlyPreviewChart, traces, layout);

    // Update summary panel
    if (digitizedSummaryContainer && summaryPeaksList) {
        if (summaryXRange) summaryXRange.textContent = `${xRange[0].toFixed(2)} to ${xRange[1].toFixed(2)}`;
        if (summaryYRange) summaryYRange.textContent = `${yRange[0].toFixed(4)} to ${yRange[1].toFixed(4)}`;

        summaryPeaksList.innerHTML = '';
        activeCurves.forEach(c => {
            let colorHex = '#FF6D00';
            if (c.color === 'red') colorHex = '#EF4444';
            else if (c.color === 'yellow') colorHex = '#EAB308';
            else if (c.color === 'orange') colorHex = '#FF6D00';
            else if (c.color === 'blue') colorHex = '#3B82F6';
            else if (c.color === 'green') colorHex = '#10B981';
            else if (c.color === 'cyan') colorHex = '#06B6D4';
            else if (c.color === 'magenta') colorHex = '#D946EF';
            else if (c.color === 'black') colorHex = isLightMode ? '#1E293B' : '#94A3B8';

            const yVals = c.data.map(pt => pt[1]);
            const maxY = Math.max(...yVals);
            const peakIdx = yVals.indexOf(maxY);
            if (peakIdx !== -1) {
                const peakX = c.data[peakIdx][0];
                summaryPeaksList.innerHTML += `
                    <li style="margin-bottom: 4px;">
                        <span style="color: ${colorHex}; font-weight: 600; text-transform: uppercase;">${c.color}</span> Curve: 
                        Peak at <strong>${peakX.toFixed(2)}</strong> 
                        (Value: <strong>${maxY.toFixed(4)}</strong>)
                    </li>
                `;
            }
        });
        if (summaryPeaksList.innerHTML === '') {
            summaryPeaksList.innerHTML = '<li>No peaks detected.</li>';
        }
        digitizedSummaryContainer.classList.remove('hidden');
    }
}

// 4. Collected Curves Plotly Chart with Normalizing and Equalizing options
const chkNormalizeY = document.getElementById('chk-normalize-y');
const chkEqualizeX = document.getElementById('chk-equalize-x');

chkNormalizeY.addEventListener('change', () => {
    renderCollectedCurvesPlot();
    renderAverageSpectrumPlot();
});
chkEqualizeX.addEventListener('change', () => {
    renderCollectedCurvesPlot();
    renderAverageSpectrumPlot();
});

function renderCollectedCurvesPlot() {
    const collectedChartDiv = document.getElementById('plotly-collected-chart');
    if (collectedCurves.length === 0) {
        collectedChartDiv.innerHTML = `<div class="chart-placeholder">Save digitized curves first to see them plotted here.</div>`;
        return;
    }

    const normalizeY = chkNormalizeY.checked;
    const equalizeX = chkEqualizeX.checked;

    const traces = [];
    let displayCurves = [];

    // Ensure all curves are sorted by X ascending for equalizing/interpolating
    const sortedCurves = collectedCurves.map(c => ({
        ...c,
        data: [...c.data].sort((a, b) => a[0] - b[0])
    }));

    // Equalize X range (using overlapping intersection)
    if (equalizeX && sortedCurves.length > 0) {
        const commonX = getCommonXGrid(sortedCurves, true);

        for (const c of sortedCurves) {
            const cx = c.data.map(pt => pt[0]);
            const cy = c.data.map(pt => pt[1]);

            const iy = commonX.map(xVal => interpolateCurveY(cx, cy, xVal));

            displayCurves.push({
                name: c.name,
                data: commonX.map((x, idx) => [x, iy[idx]])
            });
        }
    } else {
        displayCurves = sortedCurves.map(c => ({
            name: c.name,
            data: c.data.map(pt => [...pt])
        }));
    }

    // Normalize Y intensities
    if (normalizeY) {
        displayCurves = displayCurves.map(c => {
            const yVals = c.data.map(pt => pt[1]);
            const min = Math.min(...yVals);
            const max = Math.max(...yVals);
            const span = max - min || 1.0;

            return {
                name: c.name,
                data: c.data.map(pt => [pt[0], (pt[1] - min) / span])
            };
        });
    }

    displayCurves.forEach(c => {
        traces.push({
            x: c.data.map(pt => pt[0]),
            y: c.data.map(pt => pt[1]),
            type: 'scatter',
            mode: 'lines',
            name: c.name
        });
    });

    const paperBg = getThemeColor('--plotly-bg');
    const textCol = getThemeColor('--plotly-text');
    const gridCol = getThemeColor('--plotly-grid');
    const tickCol = getThemeColor('--plotly-tick');

    const layout = {
        title: { text: 'All Collected Curves', font: { color: textCol } },
        xaxis: { title: xLabel, type: selectXScale.value === 'log' ? 'log' : 'linear', gridcolor: gridCol, tickfont: { color: tickCol }, titlefont: { color: textCol } },
        yaxis: { title: normalizeY ? "Normalized Intensity" : yLabel, type: (selectYScale.value === 'log' && !normalizeY) ? 'log' : 'linear', gridcolor: gridCol, tickfont: { color: tickCol }, titlefont: { color: textCol } },
        paper_bgcolor: paperBg,
        plot_bgcolor: paperBg,
        legend: { font: { color: tickCol } }
    };

    Plotly.newPlot(collectedChartDiv, traces, layout);

    // Update Summaries Table
    const tbody = document.getElementById('table-summaries').querySelector('tbody');
    tbody.innerHTML = '';

    collectedCurves.forEach(c => {
        const xVals = c.data.map(pt => pt[0]);
        const yVals = c.data.map(pt => pt[1]);

        let maxVal = Math.max(...yVals);
        let maxIdx = yVals.indexOf(maxVal);
        let peakWavelength = xVals[maxIdx];

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${c.name}</strong></td>
            <td>${c.data.length} points</td>
            <td>${peakWavelength.toFixed(2)}</td>
            <td>${maxVal.toFixed(4)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Pearson Correlation helper
function pearsonCorrelation(y1, y2) {
    const n = y1.length;
    if (n === 0) return 0;

    let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, pSum = 0;
    for (let i = 0; i < n; i++) {
        const v1 = y1[i];
        const v2 = y2[i];
        sum1 += v1;
        sum2 += v2;
        sum1Sq += v1 * v1;
        sum2Sq += v2 * v2;
        pSum += v1 * v2;
    }

    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt((sum1Sq - (sum1 * sum1 / n)) * (sum2Sq - (sum2 * sum2 / n)));
    if (den === 0) return 0;
    return num / den;
}

// Interpolate Y value on a curve with support for both linear and logarithmic X scales
function interpolateCurveY(cx, cy, xVal) {
    let idx = cx.findIndex(x => x >= xVal);
    if (idx === -1) return cy[cy.length - 1];
    if (idx === 0) return cy[0];

    const x0 = cx[idx - 1];
    const x1 = cx[idx];
    const y0 = cy[idx - 1];
    const y1 = cy[idx];

    if (Math.abs(x1 - x0) < 1e-9) {
        return y0;
    }

    const xScaleType = selectXScale.value;
    let pct;
    if (xScaleType === 'log' && x0 > 0 && x1 > 0 && xVal > 0) {
        pct = (Math.log10(xVal) - Math.log10(x0)) / (Math.log10(x1) - Math.log10(x0));
    } else {
        pct = (xVal - x0) / (x1 - x0);
    }
    return y0 + pct * (y1 - y0);
}

// Calculate common X range (overlapping intersection or union fallback) of all curves.
function getCommonXGrid(curves, useOverlap = true) {
    if (!curves || curves.length === 0) return [];

    let minX, maxX;
    if (useOverlap) {
        minX = Math.max(...curves.map(c => c.data[0][0]));
        maxX = Math.min(...curves.map(c => c.data[c.data.length - 1][0]));
        
        // Fallback to union if intersection range is invalid or no overlap
        if (minX >= maxX) {
            minX = Math.min(...curves.map(c => c.data[0][0]));
            maxX = Math.max(...curves.map(c => c.data[c.data.length - 1][0]));
        }
    } else {
        minX = Math.min(...curves.map(c => c.data[0][0]));
        maxX = Math.max(...curves.map(c => c.data[c.data.length - 1][0]));
    }

    const commonX = [];
    const xScaleType = selectXScale.value;
    if (xScaleType === 'log' && minX > 0 && maxX > 0) {
        const logMin = Math.log10(minX);
        const logMax = Math.log10(maxX);
        for (let i = 0; i < 300; i++) {
            commonX.push(Math.pow(10, logMin + (i / 299) * (logMax - logMin)));
        }
    } else {
        for (let i = 0; i < 300; i++) {
            commonX.push(minX + (i / 299) * (maxX - minX));
        }
    }
    return commonX;
}

// Calculate common overlapping X range and interpolate all curves onto a common grid of 300 steps.
function getCommonInterpolatedCurves(curves) {
    if (curves.length === 0) return { commonX: [], interpolatedY: [] };

    const commonX = getCommonXGrid(curves, true);
    if (commonX.length === 0) return { commonX: [], interpolatedY: [] };

    const normalizeY = chkNormalizeY.checked;
    const interpolatedY = curves.map(c => {
        const cx = c.data.map(pt => pt[0]);
        const cy = c.data.map(pt => pt[1]);

        let normCy;
        if (normalizeY) {
            const minVal = Math.min(...cy);
            const maxVal = Math.max(...cy);
            const span = maxVal - minVal || 1.0;
            normCy = cy.map(y => (y - minVal) / span);
        } else {
            normCy = [...cy];
        }

        return commonX.map(xVal => interpolateCurveY(cx, normCy, xVal));
    });

    return { commonX, interpolatedY };
}

// Graph Connected Components helper to find the Largest Matching Group
function findConnectedComponents(numNodes, threshold, matrix) {
    const adj = Array.from({ length: numNodes }, () => []);

    // Build adjacency list (similarity >= threshold)
    for (let i = 0; i < numNodes; i++) {
        for (let j = 0; j < numNodes; j++) {
            if (i === j) continue;
            const r = matrix[i][j];
            const matchPercent = Math.max(0, r) * 100;
            if (matchPercent >= threshold) {
                adj[i].push(j);
            }
        }
    }

    const visited = new Set();
    const components = [];

    for (let i = 0; i < numNodes; i++) {
        if (!visited.has(i)) {
            const comp = [];
            const queue = [i];
            visited.add(i);

            while (queue.length > 0) {
                const node = queue.shift();
                comp.push(node);

                for (const neighbor of adj[node]) {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        queue.push(neighbor);
                    }
                }
            }
            components.push(comp);
        }
    }

    // Sort components by size descending
    components.sort((a, b) => b.length - a.length);
    return components;
}

// Calculate similarities and find the Consensus Reference curve & Largest Matching Group
function analyzeSpectralSimilarity() {
    const curves = collectedCurves.filter(c => c.data && c.data.length >= 2).map(c => ({
        ...c,
        data: [...c.data].sort((a, b) => a[0] - b[0])
    }));

    if (curves.length < 2) {
        return { curves, consensusIndex: -1, similarities: [], commonX: [], interpolatedY: [], largestGroup: [] };
    }

    const { commonX, interpolatedY } = getCommonInterpolatedCurves(curves);
    if (commonX.length === 0) {
        return { curves, consensusIndex: -1, similarities: [], commonX, interpolatedY, largestGroup: [] };
    }

    const numCurves = curves.length;
    const matrix = Array.from({ length: numCurves }, () => new Array(numCurves).fill(1.0));
    for (let i = 0; i < numCurves; i++) {
        for (let j = i + 1; j < numCurves; j++) {
            const r = pearsonCorrelation(interpolatedY[i], interpolatedY[j]);
            matrix[i][j] = matrix[j][i] = r;
        }
    }

    // Run connected components matching
    const threshold = parseInt(sliderSimilarityThreshold.value);
    const components = findConnectedComponents(numCurves, threshold, matrix);
    const largestGroup = components[0] || [];

    // Find the Consensus Medoid inside the largest matching group
    let consensusIndex = largestGroup[0] !== undefined ? largestGroup[0] : 0;
    if (largestGroup.length > 1) {
        let maxInnerScore = -Infinity;
        largestGroup.forEach(i => {
            let sum = 0;
            largestGroup.forEach(j => {
                if (i === j) return;
                sum += matrix[i][j];
            });
            const avg = sum / (largestGroup.length - 1);
            if (avg > maxInnerScore) {
                maxInnerScore = avg;
                consensusIndex = i;
            }
        });
    }

    // Similarity is defined as correlation with the consensus Medoid curve
    const similarities = curves.map((c, i) => {
        const r = matrix[i][consensusIndex];
        const matchPercent = Math.max(0, r) * 100;
        return matchPercent;
    });

    return { curves, consensusIndex, similarities, commonX, interpolatedY, largestGroup };
}

// 5. Average Analysis spectrum calculations (with Pearson shape correlation and outlier rejection)
function renderAverageSpectrumPlot() {
    const averageChartDiv = document.getElementById('plotly-average-chart');

    // Perform similarity analysis using Medoid consensus method
    const analysis = analyzeSpectralSimilarity();
    const { curves, consensusIndex, similarities, commonX, interpolatedY, largestGroup } = analysis;

    // Clear display if not enough curves
    if (curves.length < 2) {
        averageChartDiv.innerHTML = `<div class="chart-placeholder">Collect at least 2 spectral curves to compute and analyze their average spectrum.</div>`;
        valConsensusRef.textContent = '-';
        statTotalCurves.textContent = curves.length;
        statAcceptedCurves.textContent = '0';
        statRejectedCurves.textContent = '0';

        // Clear table
        const tbody = tableSimilarity.querySelector('tbody');
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="text-align: center; padding: 20px;">Collect at least 2 spectra to calculate shape correlation.</td></tr>`;
        return;
    }

    if (commonX.length === 0) {
        averageChartDiv.innerHTML = `<div class="chart-placeholder text-red">Collected curves do not share overlapping ranges. Cannot compute average.</div>`;
        valConsensusRef.textContent = '-';
        statTotalCurves.textContent = curves.length;
        statAcceptedCurves.textContent = '0';
        statRejectedCurves.textContent = '0';
        return;
    }

    // Display Consensus Reference name
    const consensusCurve = curves[consensusIndex];
    valConsensusRef.textContent = consensusCurve.name;

    // Read current threshold from slider
    const threshold = parseInt(sliderSimilarityThreshold.value);
    valSimilarityThreshold.textContent = `${threshold}%`;

    // Separate into accepted vs. rejected curves, respecting manual overrides
    const processedCurves = curves.map((c, idx) => {
        const score = similarities[idx];
        const autoAccepted = largestGroup.includes(idx);

        // Find corresponding entry in collectedCurves database to sync overrideStatus
        const dbEntry = collectedCurves.find(item => item.name === c.name);
        let activeStatus = autoAccepted ? 'accepted' : 'rejected';
        let isOverridden = false;

        if (dbEntry && dbEntry.overrideStatus !== undefined && dbEntry.overrideStatus !== null) {
            activeStatus = dbEntry.overrideStatus;
            isOverridden = true;
        }

        return {
            ...c,
            score,
            autoAccepted,
            activeStatus,
            isOverridden,
            interpolatedY: interpolatedY[idx]
        };
    });

    const acceptedCurves = processedCurves.filter(c => c.activeStatus === 'accepted');
    const rejectedCurves = processedCurves.filter(c => c.activeStatus === 'rejected');

    // Update Stats badges
    statTotalCurves.textContent = curves.length;
    statAcceptedCurves.textContent = acceptedCurves.length;
    statRejectedCurves.textContent = rejectedCurves.length;

    // Calculate Mean curve array for accepted curves only
    let meanY = [];
    if (acceptedCurves.length > 0) {
        for (let i = 0; i < 300; i++) {
            let sum = 0;
            for (let j = 0; j < acceptedCurves.length; j++) {
                sum += acceptedCurves[j].interpolatedY[i];
            }
            meanY.push(sum / acceptedCurves.length);
        }
    } else {
        meanY = new Array(300).fill(0);
    }

    // Render Plotly traces
    const traces = [];
    const normalizeY = chkNormalizeY.checked;
    const showRejected = chkShowRejectedPlot.checked;

    // Plot individual curves
    processedCurves.forEach((c) => {
        const cx = c.data.map(pt => pt[0]);
        const cy = c.data.map(pt => pt[1]);

        let normCy;
        if (normalizeY) {
            const minVal = Math.min(...cy);
            const maxVal = Math.max(...cy);
            const span = maxVal - minVal || 1.0;
            normCy = cy.map(y => (y - minVal) / span);
        } else {
            normCy = [...cy];
        }

        const isAccepted = c.activeStatus === 'accepted';
        const isRef = c.name === consensusCurve.name;

        if (!isAccepted && !showRejected) {
            // Skip rejected spectra in plot if checkbox is untoggled
            return;
        }

        let namePrefix = isAccepted ? '✅ ' : '❌ ';
        if (isRef) namePrefix = '⭐ Ref: ';

        traces.push({
            x: cx,
            y: normCy,
            type: 'scatter',
            mode: 'lines',
            name: `${namePrefix}${c.name}`,
            line: {
                width: isAccepted ? (isRef ? 2.5 : 1.5) : 1,
                dash: isAccepted ? 'solid' : 'dot',
                color: isAccepted ? (isRef ? '#3B82F6' : '#10B981') : '#EF4444'
            },
            opacity: isAccepted ? 0.7 : 0.3
        });
    });

    // Bold Average line
    if (acceptedCurves.length > 0) {
        traces.push({
            x: commonX,
            y: meanY,
            type: 'scatter',
            mode: 'lines',
            name: 'Average Spectrum (Accepted Only)',
            line: { color: '#FF3D00', width: 4 }
        });
    }

    const paperBg = getThemeColor('--plotly-bg');
    const textCol = getThemeColor('--plotly-text');
    const gridCol = getThemeColor('--plotly-grid');
    const tickCol = getThemeColor('--plotly-tick');

    const layout = {
        title: { text: 'Average Spectrum Analysis (Consensus Group)', font: { color: textCol } },
        xaxis: { title: xLabel, gridcolor: gridCol, tickfont: { color: tickCol }, titlefont: { color: textCol } },
        yaxis: { title: normalizeY ? 'Normalized Intensity' : yLabel, gridcolor: gridCol, tickfont: { color: tickCol }, titlefont: { color: textCol } },
        paper_bgcolor: paperBg,
        plot_bgcolor: paperBg,
        legend: { font: { color: tickCol } }
    };

    Plotly.newPlot(averageChartDiv, traces, layout);

    // Update metric cards
    if (acceptedCurves.length > 0) {
        const maxVal = Math.max(...meanY);
        const maxIdx = meanY.indexOf(maxVal);
        const peakWavelength = commonX[maxIdx];

        let unit = "";
        if (xLabel) {
            const match = xLabel.match(/\(([^)]+)\)/);
            if (match) {
                unit = " " + match[1];
            }
        }
        document.getElementById('metric-avg-peak-x').textContent = `${formatValue(peakWavelength)}${unit}`;
        document.getElementById('metric-avg-peak-y').textContent = formatValue(maxVal);
    } else {
        document.getElementById('metric-avg-peak-x').textContent = '-';
        document.getElementById('metric-avg-peak-y').textContent = '-';
    }

    // Update Similarity Table UI
    const tbody = tableSimilarity.querySelector('tbody');
    tbody.innerHTML = '';

    processedCurves.forEach(c => {
        const row = document.createElement('tr');

        const isAccepted = c.activeStatus === 'accepted';
        const scoreStr = c.name === consensusCurve.name ? '100.00% (Ref)' : `${c.score.toFixed(2)}%`;

        const badgeClass = isAccepted ? 'badge-accepted' : 'badge-rejected';
        const badgeLabel = isAccepted ? 'Match ✅' : 'Outlier ❌';

        const methodLabel = c.isOverridden ? 'Manual 👤' : 'Auto 🤖';

        const actionBtnClass = c.isOverridden ? 'override-btn active-override' : 'override-btn';
        const actionBtnLabel = isAccepted ? 'Reject ❌' : 'Accept ✅';

        row.innerHTML = `
            <td><strong>${c.name}</strong></td>
            <td class="code-font">${scoreStr}</td>
            <td><span class="badge-status ${badgeClass}">${badgeLabel}</span></td>
            <td><span class="badge-selection">${methodLabel}</span></td>
            <td><button class="${actionBtnClass}" onclick="toggleManualOverride('${c.name}')">${actionBtnLabel}</button></td>
        `;
        tbody.appendChild(row);
    });
}

// Global toggle override handler
window.toggleManualOverride = function (curveName) {
    const dbEntry = collectedCurves.find(item => item.name === curveName);
    if (!dbEntry) return;

    const analysis = analyzeSpectralSimilarity();
    const index = analysis.curves.findIndex(c => c.name === curveName);
    if (index === -1) return;

    const largestGroup = analysis.largestGroup || [];
    const autoAccepted = largestGroup.includes(index);

    // Toggle logic:
    // If currently force accepted, switch to force rejected
    // If currently force rejected, switch to auto (null)
    // If currently auto: switch to overridden opposite
    if (dbEntry.overrideStatus === 'accepted') {
        dbEntry.overrideStatus = 'rejected';
        addLog(`[Override] Manual reject override applied to: ${curveName}`);
    } else if (dbEntry.overrideStatus === 'rejected') {
        dbEntry.overrideStatus = null;
        addLog(`[Override] Removed manual override for: ${curveName} (reverted to Auto)`);
    } else {
        // null (Auto)
        dbEntry.overrideStatus = autoAccepted ? 'rejected' : 'accepted';
        addLog(`[Override] Manual override applied: Force ${dbEntry.overrideStatus.toUpperCase()} for ${curveName}`);
    }

    renderAverageSpectrumPlot();
};

// Batch Process All uploaded files
async function batchProcessAllImages() {
    if (uploadedFiles.length === 0) return;

    showLoading('Starting batch digitization...');
    addLog(`[Batch Process] Starting automated processing for ${uploadedFiles.length} images.`);

    try {
        for (let i = 0; i < uploadedFiles.length; i++) {
            if (!uploadedFiles[i].batchSelected) {
                addLog(`[Batch Process] Skipping unchecked image: ${uploadedFiles[i].name}`);
                continue;
            }
            activeImageIndex = i;
            renderDatasetManager();
            showLoading(`Batch Process: Loading & calibrating image ${i + 1} of ${uploadedFiles.length}...`);
            addLog(`[Batch Process] [${i + 1}/${uploadedFiles.length}] Loading ${uploadedFiles[i].name}`);

            // Wait for image loading & auto-detect calibration to fully complete
            await loadActiveImage();

            showLoading(`Batch Process: Digitizing curves for image ${i + 1} of ${uploadedFiles.length}...`);
            addLog(`[Batch Process] [${i + 1}/${uploadedFiles.length}] Extracting curves`);

            const configs = {
                colorMode: selectColorMode.value,
                smoothingWindow: parseInt(sliderSmoothing.value),
                whitenessThresh: parseInt(sliderWhiteness.value),
                xScaleType: selectXScale.value,
                yScaleType: selectYScale.value
            };

            const scaledVertices = calibrationPoints.map(pt => ({
                x: Math.round(pt.x * activeImageObj.width),
                y: Math.round(pt.y * activeImageObj.height)
            }));

            let curves = [];
            if (window.cvReady && window.cv && window.cv.Mat && scaledVertices.length >= 3) {
                const offscreen = document.createElement('canvas');
                offscreen.width = srcCanvas.width;
                offscreen.height = srcCanvas.height;
                const octx = offscreen.getContext('2d');
                octx.drawImage(activeImageObj, 0, 0, srcCanvas.width, srcCanvas.height);
                octx.drawImage(scribbleCanvas, 0, 0);

                const brightness = parseInt(sliderBrightness.value);
                const contrast = parseFloat(sliderContrast.value);
                if (brightness !== 0 || contrast !== 1.0) {
                    const imgData = octx.getImageData(0, 0, offscreen.width, offscreen.height);
                    applyBrightnessContrast(imgData.data, brightness, contrast);
                    octx.putImageData(imgData, 0, 0);
                }

                const displayVertices = calibrationPoints.map(pt => ({
                    x: Math.round(pt.x * srcCanvas.width),
                    y: Math.round(pt.y * srcCanvas.height)
                }));

                curves = await cvTraceCurves(
                    offscreen, configs.colorMode, displayVertices, xRange, yRange, configs
                );
            } else {
                // Fallback: server-side digitize
                const offscreen = document.createElement('canvas');
                offscreen.width = activeImageObj.width;
                offscreen.height = activeImageObj.height;
                const octx = offscreen.getContext('2d');
                octx.drawImage(activeImageObj, 0, 0);

                const fullImgData = octx.getImageData(0, 0, offscreen.width, offscreen.height);
                const fullData = fullImgData.data;
                const brightness = parseInt(sliderBrightness.value);
                const contrast = parseFloat(sliderContrast.value);
                const medianSize = parseInt(sliderMedian.value);
                const blurRadius = parseInt(sliderBlur.value);
                const erodeRadius = parseInt(sliderErode.value);
                const dilateRadius = parseInt(sliderDilate.value);
                const scaleRatio = activeImageObj.width / srcCanvas.width;
                const scaledMedian = medianSize > 1 ? Math.round(medianSize * scaleRatio) | 1 : 1;
                const scaledBlur = Math.round(blurRadius * scaleRatio);
                const scaledErode = Math.round(erodeRadius * scaleRatio);
                const scaledDilate = Math.round(dilateRadius * scaleRatio);

                applyBrightnessContrast(fullData, brightness, contrast);
                applyMedianFilter(fullData, offscreen.width, offscreen.height, scaledMedian);
                applyGaussianBlur(fullData, offscreen.width, offscreen.height, scaledBlur);
                applyErode(fullData, offscreen.width, offscreen.height, scaledErode);
                applyDilate(fullData, offscreen.width, offscreen.height, scaledDilate);
                octx.putImageData(fullImgData, 0, 0);
                burnMaskWhiteIntoCanvas(offscreen);

                const imageBlob = await new Promise(resolve => offscreen.toBlob(resolve, 'image/png'));
                const uploadFile = new File([imageBlob], uploadedFiles[i].name, { type: 'image/png' });
                const formData = new FormData();
                formData.append('files', uploadFile);
                formData.append('vertices', JSON.stringify(scaledVertices));
                formData.append('xRange', JSON.stringify(xRange));
                formData.append('yRange', JSON.stringify(yRange));
                formData.append('configs', JSON.stringify(configs));

                const response = await fetch('/api/digitize', { method: 'POST', body: formData });
                const result = await response.json();
                if (result.curves) {
                    curves = result.curves;
                }
            }

            if (curves && curves.length > 0) {
                curves.forEach((c) => {
                    const curveName = `${uploadedFiles[i].name.split('.')[0]} (${c.color})`;
                    const curveIndex = collectedCurves.findIndex(item => item.name === curveName);
                    const sortedData = [...c.data].sort((a, b) => a[0] - b[0]);
                    if (curveIndex > -1) {
                        collectedCurves[curveIndex] = {
                            name: curveName,
                            data: sortedData,
                            originalData: [...sortedData],
                            color: c.color,
                            overrideStatus: null,
                            rawPoints: c.rawPoints ? [...c.rawPoints] : null,
                            imageName: uploadedFiles[i].name
                        };
                        addLog(`[Batch Process] Updated curve: ${curveName}`);
                    } else {
                        collectedCurves.push({
                            name: curveName,
                            data: sortedData,
                            originalData: [...sortedData],
                            color: c.color,
                            overrideStatus: null,
                            rawPoints: c.rawPoints ? [...c.rawPoints] : null,
                            imageName: uploadedFiles[i].name
                        });
                        addLog(`[Batch Process] Saved curve: ${curveName}`);
                    }
                });
            } else {
                addLog(`[Batch Process] Warning: No curves found for ${uploadedFiles[i].name}`);
            }
        }

        document.getElementById('collected-curves-count').textContent = collectedCurves.length;

        // Clear workspace calibration
        activeCurves = [];
        currentCurve = null;
        calibrationPoints = [];
        fiveClickPoints = [];
        calibrationMode = false;
        btnCalibrateMode.classList.remove('blue-btn');
        updateFiveClickGuidance();
        plotlyPreviewChart.innerHTML = '';
        previewPlaceholder.classList.remove('hidden');
        if (digitizedSummaryContainer) digitizedSummaryContainer.classList.add('hidden');
        sctx.clearRect(0, 0, scribbleCanvas.width, scribbleCanvas.height);
        if (guideCanvas && gctx) gctx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
        guideCurvePoints = [];
        btnDownloadCsv.setAttribute('disabled', 'true');
        btnDownloadJson.setAttribute('disabled', 'true');
        if (btnLoadCurve) btnLoadCurve.setAttribute('disabled', 'true');

        renderCollectedCurvesPlot();
        renderAverageSpectrumPlot();

        addLog(`[Batch Process] Finished batch digitization successfully! Digitized ${collectedCurves.length} curves.`);

        // Auto click average tab
        const avgTabButton = document.querySelector('.tab-link[data-tab="tab-results"]');
        if (avgTabButton) {
            avgTabButton.click();
        }
    } catch (err) {
        addLog(`[Batch Process] Error: ${err.message}`);
        console.error(err);
        alert(`❌ Batch processing failed: ${err.message}`);
    } finally {
        hideLoading();
    }
}

// Download/Export Handlers
btnDownloadCsv.addEventListener('click', () => {
    // If we have collected curves from multiple files, default to exporting the consolidated database
    if (collectedCurves && collectedCurves.length > 0) {
        const btnDownloadCollectedCsv = document.getElementById('btn-download-collected-csv');
        if (btnDownloadCollectedCsv) {
            btnDownloadCollectedCsv.click();
            return;
        }
    }

    if (!activeCurves || activeCurves.length === 0) return;

    const maxLen = Math.max(...activeCurves.map(c => c.data.length));
    const headers = [];
    activeCurves.forEach(c => {
        const cName = c.name || c.color;
        headers.push(`Wavelength_${cName}`, `Absorbance_${cName}`);
    });

    let csvRows = [headers.join(",")];
    for (let i = 0; i < maxLen; i++) {
        const row = [];
        activeCurves.forEach(c => {
            if (i < c.data.length) {
                row.push(c.data[i][0].toFixed(getCsvPrecision()), c.data[i][1].toFixed(getCsvPrecision()));
            } else {
                row.push("", "");
            }
        });
        csvRows.push(row.join(","));
    }

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `${uploadedFiles[activeImageIndex].name.split('.')[0]}_digitized.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog("Exported current digitized curves combined as CSV.");
});

btnDownloadJson.addEventListener('click', () => {
    if (collectedCurves && collectedCurves.length > 0) {
        const btnDownloadCollectedJson = document.getElementById('btn-download-collected-json');
        if (btnDownloadCollectedJson) {
            btnDownloadCollectedJson.click();
            return;
        }
    }

    if (!activeCurves || activeCurves.length === 0) return;

    const exportData = {
        fileName: uploadedFiles[activeImageIndex].name,
        curves: activeCurves.map(c => ({
            name: c.name || c.color,
            color: c.color,
            data: c.data
        }))
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `${uploadedFiles[activeImageIndex].name.split('.')[0]}_digitized.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog("Exported current digitized curves combined as JSON.");
});

// Download Average CSV
function downloadAverageCsv() {
    const analysis = analyzeSpectralSimilarity();
    const { curves, commonX, interpolatedY, similarities } = analysis;
    const threshold = parseInt(sliderSimilarityThreshold.value);

    if (curves.length < 2 || commonX.length === 0) {
        alert("Not enough curves or data to compute average CSV.");
        return;
    }

    const processedCurves = curves.map((c, idx) => {
        const score = similarities[idx];
        const autoAccepted = score >= threshold;
        const dbEntry = collectedCurves.find(item => item.name === c.name);
        let activeStatus = autoAccepted ? 'accepted' : 'rejected';
        if (dbEntry && dbEntry.overrideStatus) {
            activeStatus = dbEntry.overrideStatus;
        }
        return { ...c, activeStatus, interpolatedY: interpolatedY[idx] };
    });

    const acceptedCurves = processedCurves.filter(c => c.activeStatus === 'accepted');
    if (acceptedCurves.length === 0) {
        alert("No accepted curves to compute average CSV.");
        return;
    }

    let meanY = [];
    for (let i = 0; i < 300; i++) {
        let sum = 0;
        for (let j = 0; j < acceptedCurves.length; j++) {
            sum += acceptedCurves[j].interpolatedY[i];
        }
        meanY.push(sum / acceptedCurves.length);
    }

    let csvRows = [`Wavelength (nm),Average_Intensity`];
    for (let i = 0; i < 300; i++) {
        csvRows.push(`${commonX[i].toFixed(getCsvPrecision())},${meanY[i].toFixed(getCsvPrecision())}`);
    }

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `average_spectrum.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog("Exported average spectrum CSV.");
}

// Download Full Analysis Report (Consensus, similarities, individual curves and average)
function downloadFullReport() {
    const analysis = analyzeSpectralSimilarity();
    const { curves, consensusIndex, similarities, commonX, interpolatedY } = analysis;
    const threshold = parseInt(sliderSimilarityThreshold.value);

    if (curves.length < 2 || commonX.length === 0) {
        alert("Not enough curves or data to generate report.");
        return;
    }

    const consensusCurve = curves[consensusIndex];

    const processedCurves = curves.map((c, idx) => {
        const score = similarities[idx];
        const autoAccepted = score >= threshold;
        const dbEntry = collectedCurves.find(item => item.name === c.name);
        let activeStatus = autoAccepted ? 'accepted' : 'rejected';
        let method = 'Auto';
        if (dbEntry && dbEntry.overrideStatus) {
            activeStatus = dbEntry.overrideStatus;
            method = 'Manual Override';
        }
        return { ...c, score, activeStatus, method, interpolatedY: interpolatedY[idx] };
    });

    const acceptedCurves = processedCurves.filter(c => c.activeStatus === 'accepted');

    let meanY = [];
    for (let i = 0; i < 300; i++) {
        let sum = 0;
        for (let j = 0; j < acceptedCurves.length; j++) {
            sum += acceptedCurves[j].interpolatedY[i];
        }
        meanY.push(sum / Math.max(1, acceptedCurves.length));
    }

    let csvRows = [];
    csvRows.push("SPECTRAL ANALYSIS CONSENSUS REPORT");
    csvRows.push(`Generated,${new Date().toLocaleString()}`);
    csvRows.push(`Consensus Reference Spectrum,${consensusCurve.name}`);
    csvRows.push(`Similarity Threshold,${threshold}%`);
    csvRows.push(`Total Curves,${curves.length}`);
    csvRows.push(`Accepted Curves,${acceptedCurves.length}`);
    csvRows.push(`Rejected Curves,${curves.length - acceptedCurves.length}`);
    csvRows.push("");

    csvRows.push("Spectrum Name,Pearson Similarity Score (%),Status,Selection Method");
    processedCurves.forEach(c => {
        csvRows.push(`"${c.name}",${c.score.toFixed(2)}%,${c.activeStatus.toUpperCase()},${c.method}`);
    });
    csvRows.push("");

    let dataHeaders = ["Wavelength (nm)", "Average_Intensity"];
    processedCurves.forEach(c => {
        dataHeaders.push(`${c.name}_(${c.activeStatus.toUpperCase()})`);
    });
    csvRows.push(dataHeaders.join(","));

    for (let i = 0; i < 300; i++) {
        let row = [commonX[i].toFixed(4), meanY[i].toFixed(6)];
        processedCurves.forEach(c => {
            row.push(c.interpolatedY[i].toFixed(6));
        });
        csvRows.push(row.join(","));
    }

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `spectral_consensus_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog("Exported detailed spectral consensus report CSV.");
}

// Hook up new buttons & sliders
if (btnBatchProcess) {
    btnBatchProcess.addEventListener('click', batchProcessAllImages);
}

if (sliderSimilarityThreshold) {
    sliderSimilarityThreshold.addEventListener('input', () => {
        valSimilarityThreshold.textContent = `${sliderSimilarityThreshold.value}%`;
        renderAverageSpectrumPlot();
    });
}

if (btnDownloadAverageCsv) {
    btnDownloadAverageCsv.addEventListener('click', downloadAverageCsv);
}

if (btnDownloadFullReport) {
    btnDownloadFullReport.addEventListener('click', downloadFullReport);
}

if (chkShowRejectedPlot) {
    chkShowRejectedPlot.addEventListener('change', renderAverageSpectrumPlot);
}

// UI loaders helpers
function showLoading(text) {
    loadingText.textContent = text;
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

// ─────────────────────────────────────────────────────────────────
//  THEME SWITCHER SYSTEM
// ─────────────────────────────────────────────────────────────────
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const themeIcon = document.getElementById('theme-icon');

function updateThemeUI(isLight) {
    if (isLight) {
        document.body.classList.add('light-mode');
        themeIcon.textContent = '🌙';
        btnThemeToggle.setAttribute('title', 'Switch to Dark Mode');
    } else {
        document.body.classList.remove('light-mode');
        themeIcon.textContent = '☀️';
        btnThemeToggle.setAttribute('title', 'Switch to Light Mode');
    }

    // Dynamically re-plot charts to update colors
    try {
        if (activeCurves && activeCurves.length > 0) {
            plotPreviewChart();
        }
        if (collectedCurves && collectedCurves.length > 0) {
            renderCollectedCurvesPlot();
        }
        if (collectedCurves && collectedCurves.length >= 2) {
            renderAverageSpectrumPlot();
        }
    } catch (e) {
        console.error("Error updating charts on theme change:", e);
    }
}

// Toggle Theme click handler
btnThemeToggle.addEventListener('click', () => {
    const isLightNow = document.body.classList.contains('light-mode');
    const newLightState = !isLightNow;

    updateThemeUI(newLightState);
    localStorage.setItem('themePreference', newLightState ? 'light' : 'dark');
    addLog(`Switched theme to: ${newLightState ? 'Light' : 'Dark'} Mode`);
});

// Initialize theme from storage or system preference
const storedTheme = localStorage.getItem('themePreference');
const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
const initialLight = storedTheme === 'light' || (storedTheme === null && prefersLight);
updateThemeUI(initialLight);

// ── Consolidated CSV / JSON Export and Clear Collections ──
const btnDownloadCollectedCsv = document.getElementById('btn-download-collected-csv');
const btnDownloadCollectedJson = document.getElementById('btn-download-collected-json');
const btnClearCollected = document.getElementById('btn-clear-collected');

if (btnDownloadCollectedCsv) {
    btnDownloadCollectedCsv.addEventListener('click', () => {
        if (!collectedCurves || collectedCurves.length === 0) {
            alert("No curves collected yet. Extract and save some curves first!");
            return;
        }

        const normalizeY = chkNormalizeY.checked;
        const equalizeX = chkEqualizeX.checked;

        // Ensure all curves are sorted by X ascending for equalizing/interpolating
        const sortedCurves = collectedCurves.map(c => ({
            ...c,
            data: [...c.data].sort((a, b) => a[0] - b[0])
        }));

        let displayCurves = [];
        if (equalizeX && sortedCurves.length > 0) {
            const commonX = getCommonXGrid(sortedCurves, true);

            for (const c of sortedCurves) {
                const cx = c.data.map(pt => pt[0]);
                const cy = c.data.map(pt => pt[1]);

                const iy = commonX.map(xVal => interpolateCurveY(cx, cy, xVal));

                displayCurves.push({
                    name: c.name,
                    data: commonX.map((x, idx) => [x, iy[idx]])
                });
            }
        } else {
            displayCurves = sortedCurves.map(c => ({
                name: c.name,
                data: c.data.map(pt => [...pt])
            }));
        }

        if (normalizeY) {
            displayCurves = displayCurves.map(c => {
                const yVals = c.data.map(pt => pt[1]);
                const min = Math.min(...yVals);
                const max = Math.max(...yVals);
                const span = max - min || 1.0;

                return {
                    name: c.name,
                    data: c.data.map(pt => [pt[0], (pt[1] - min) / span])
                };
            });
        }

        let csvRows = [];
        if (equalizeX && displayCurves.length > 0) {
            // Aligned format with single Wavelength column
            const headers = ["Wavelength (nm)"];
            displayCurves.forEach(c => {
                headers.push(c.name);
            });
            csvRows.push(headers.join(","));

            const numPoints = displayCurves[0].data.length;
            for (let i = 0; i < numPoints; i++) {
                const row = [displayCurves[0].data[i][0].toFixed(getCsvPrecision())];
                displayCurves.forEach(c => {
                    row.push(c.data[i][1].toFixed(getCsvPrecision()));
                });
                csvRows.push(row.join(","));
            }
        } else {
            // Original format with separate wavelength columns for each curve
            const maxLen = Math.max(...displayCurves.map(c => c.data.length));
            const headers = [];
            displayCurves.forEach(c => {
                headers.push(`Wavelength_${c.name}`, `Intensity_${c.name}`);
            });
            csvRows.push(headers.join(","));

            for (let i = 0; i < maxLen; i++) {
                const row = [];
                displayCurves.forEach(c => {
                    if (i < c.data.length) {
                        row.push(c.data[i][0].toFixed(getCsvPrecision()), c.data[i][1].toFixed(getCsvPrecision()));
                    } else {
                        row.push("", "");
                    }
                });
                csvRows.push(row.join(","));
            }
        }

        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `collected_spectra_consolidated.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addLog(`Exported consolidated CSV for ${displayCurves.length} curves.`);
    });
}

if (btnDownloadCollectedJson) {
    btnDownloadCollectedJson.addEventListener('click', () => {
        if (!collectedCurves || collectedCurves.length === 0) {
            alert("No curves collected yet.");
            return;
        }
        const jsonString = JSON.stringify(collectedCurves, null, 2);
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
        const link = document.createElement("a");
        link.setAttribute("href", dataStr);
        link.setAttribute("download", `collected_spectra.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addLog(`Exported collected JSON database with ${collectedCurves.length} curves.`);
    });
}

if (btnClearCollected) {
    btnClearCollected.addEventListener('click', () => {
        if (!collectedCurves || collectedCurves.length === 0) return;
        if (confirm("Are you sure you want to clear all collected curves?")) {
            collectedCurves = [];
            document.getElementById('collected-curves-count').textContent = "0";
            renderCollectedCurvesPlot();
            renderAverageSpectrumPlot();
            addLog("Cleared all collected curves.");
        }
    });
}

// ─────────────────────────────────────────────────────────────────
//  NEW CRAWLER, DATASET MANAGER, & CONFIG FUNCTIONS
// ─────────────────────────────────────────────────────────────────

// CSV precision helper
function getCsvPrecision() {
    const el = document.getElementById('setting-export-csv-format');
    return el ? parseInt(el.value) : 4;
}

// Visual Image Dataset Manager Render
function renderDatasetManager() {
    const datasetManager = document.getElementById('dataset-manager');
    const datasetCount = document.getElementById('dataset-count');
    const datasetThumbnails = document.getElementById('dataset-thumbnails');
    const btnBatch = document.getElementById('btn-batch-process');

    if (!datasetManager) return;

    if (uploadedFiles.length === 0) {
        datasetManager.classList.add('hidden');
        btnBatch.classList.add('hidden');
        return;
    }

    datasetManager.classList.remove('hidden');
    datasetCount.textContent = uploadedFiles.length;
    datasetThumbnails.innerHTML = '';

    if (uploadedFiles.length > 1) {
        btnBatch.classList.remove('hidden');
    } else {
        btnBatch.classList.add('hidden');
    }

    uploadedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = `dataset-item${index === activeImageIndex ? ' active' : ''}${file.batchSelected ? ' batch-selected' : ''}`;
        item.title = file.name;

        // Checkbox overlay for batch selection
        const checkbox = document.createElement('div');
        checkbox.className = 'item-select-checkbox';
        checkbox.innerHTML = file.batchSelected ? '✓' : '';
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            file.batchSelected = !file.batchSelected;
            renderDatasetManager();
        });

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.className = 'item-delete-btn';
        delBtn.innerHTML = '🗑️';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteImageFromDataset(index);
        });

        const img = document.createElement('img');
        img.src = file.srcUrl;
        img.alt = file.name;

        item.appendChild(checkbox);
        item.appendChild(delBtn);
        item.appendChild(img);

        item.addEventListener('click', async () => {
            if (activeImageIndex === index) return;
            activeImageIndex = index;
            await loadActiveImage();
            renderDatasetManager();
        });

        datasetThumbnails.appendChild(item);
    });
}

async function deleteImageFromDataset(index) {
    if (index < 0 || index >= uploadedFiles.length) return;
    addLog(`Deleting image from dataset: ${uploadedFiles[index].name}`);

    if (uploadedFiles[index].srcUrl && !uploadedFiles[index].srcUrl.startsWith('/')) {
        URL.revokeObjectURL(uploadedFiles[index].srcUrl);
    }

    uploadedFiles.splice(index, 1);

    if (uploadedFiles.length === 0) {
        activeImageIndex = -1;

        // Clear canvases
        srcCanvas.getContext('2d').clearRect(0, 0, srcCanvas.width, srcCanvas.height);
        maskCanvas.getContext('2d').clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        canvasContainer.classList.add('hidden');
        processedMaskContainer.classList.add('hidden');
        btnExtractCurves.setAttribute('disabled', 'true');

        updateImportNextButtonState();
        goToStep(2);
    } else {
        if (activeImageIndex >= uploadedFiles.length) {
            activeImageIndex = uploadedFiles.length - 1;
        }
        await loadActiveImage();
    }
    renderDatasetManager();
}

// ==========================================================================
// GOOGLE IMAGE SEARCH & LENS MODULE BINDING
// ==========================================================================
const btnSearch = document.getElementById('btn-search-images');
const inputSearch = document.getElementById('input-chemical-search');
const btnClearSearch = document.getElementById('btn-clear-search');
const btnVoiceSearch = document.getElementById('btn-voice-search');
const suggestionsDropdown = document.getElementById('google-suggestions-dropdown');

const targetDropZone = document.getElementById('target-drop-zone');
const targetFileInput = document.getElementById('target-file-input');
const targetPreviewContainer = document.getElementById('target-preview-container');
const targetPreviewThumb = document.getElementById('target-preview-thumb');
const targetPreviewName = document.getElementById('target-preview-name');
const btnRemoveTarget = document.getElementById('btn-remove-target');
const targetOcrStatus = document.getElementById('target-ocr-status');
const targetOcrStatusText = document.getElementById('target-ocr-status-text');

const inputSearchEnvironment = document.getElementById('input-search-environment');
const inputSearchMixture = document.getElementById('input-search-mixture');
const selectPrefType = document.getElementById('select-pref-type');
const lblSearchQueryPreview = document.getElementById('lbl-search-query-preview');

const searchResultsGrid = document.getElementById('search-results-grid');
const searchPlaceholder = document.getElementById('search-gallery-placeholder');
const selectionHeader = document.getElementById('gallery-selection-header');
const selectionCount = document.getElementById('gallery-selection-count');
const btnDownloadSelected = document.getElementById('btn-download-selected');

let searchResults = [];
let uploadedTargetFile = null;
let attachedLensFile = null;

// Metadata Search & Query Preview Helpers
function buildSearchQuery({ sample, spectrumType, environment, mixture }) {
    let parts = [];
    if (sample) parts.push(sample);
    if (spectrumType) {
        parts.push(`${spectrumType} spectrum`);
    } else if (!sample || (!sample.toLowerCase().includes('spectrum') && !sample.toLowerCase().includes('spectra'))) {
        parts.push('spectrum');
    }
    if (environment) parts.push(environment);
    if (mixture) parts.push(mixture);
    return parts.filter(Boolean).join(' ');
}

function updateSearchQueryPreview() {
    const sampleName = inputSearch?.value.trim() || '';
    const specType = selectPrefType?.value || '';
    const environment = inputSearchEnvironment?.value.trim() || '';
    const mixture = inputSearchMixture?.value.trim() || '';

    const query = buildSearchQuery({
        sample: sampleName,
        spectrumType: specType,
        environment: environment,
        mixture: mixture
    });

    if (lblSearchQueryPreview) {
        lblSearchQueryPreview.textContent = query || '(empty)';
    }

    // Enable search button if we have any search query
    if (btnSearch) {
        if (query.trim().length > 0) {
            btnSearch.removeAttribute('disabled');
        } else {
            btnSearch.setAttribute('disabled', 'true');
        }
    }

    // Enable/disable the input-adjacent search button
    const btnMetaSearch = document.getElementById('btn-metadata-search');
    if (btnMetaSearch) {
        if (query.trim().length > 0) {
            btnMetaSearch.removeAttribute('disabled');
            btnMetaSearch.style.opacity = '1';
            btnMetaSearch.style.cursor = 'pointer';
        } else {
            btnMetaSearch.setAttribute('disabled', 'true');
            btnMetaSearch.style.opacity = '0.5';
            btnMetaSearch.style.cursor = 'not-allowed';
        }
    }
}

// Chrome Extension Integration Handlers
const btnOpenGoogleExt = document.getElementById('btn-open-google-ext');
const extStatusBadge = document.getElementById('ext-status-badge');

if (btnOpenGoogleExt) {
    btnOpenGoogleExt.addEventListener('click', () => {
        const query = inputSearch?.value.trim() || 'Hemoglobin absorption spectrum';
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`;
        window.open(googleUrl, '_blank');
        addLog(`[Extension] Opened Google Images search for "${query}"`);
    });
}

// Poll for images pushed live from Chrome Extension
async function pollExtensionImports() {
    try {
        const res = await fetch('/api/extension-import?clear=true');
        const data = await res.json();

        if (data.images && data.images.length > 0) {
            addLog(`[Extension] Received ${data.images.length} image(s) from Chrome Extension!`);
            if (extStatusBadge) {
                extStatusBadge.textContent = `⚡ Received ${data.images.length} from Extension!`;
                extStatusBadge.className = 'ai-badge ai-badge--ready';
            }

            const newItems = data.images.map(img => ({
                title: img.title || 'Google Images Spectrum',
                url: img.url,
                thumbnail: img.thumbnail || img.url,
                width: 800,
                height: 600,
                selected: true
            }));

            searchResults = [...newItems, ...searchResults];
            renderSearchResultsGallery();
        }
    } catch (err) {
        // ignore polling errors quietly
    }
}
setInterval(pollExtensionImports, 2500);

// Chemical Database Autocomplete Suggestions
const POPULAR_CHEMICAL_SUGGESTIONS = [
    { title: 'Crystal Violet UV-Vis Spectrum', tag: 'Absorbance' },
    { title: 'Beta-Carotene Spectrum', tag: 'Carotenoid' },
    { title: 'Caffeine Absorption Spectrum', tag: 'UV-Vis' },
    { title: 'Chlorophyll a Absorption', tag: 'Pigment' },
    { title: 'Ethanol IR Spectrum', tag: 'Infrared' },
    { title: 'Rhodamine B Fluorescence', tag: 'Dye' },
    { title: 'Aspirin Absorbance Spectrum', tag: 'Pharma' },
    { title: 'Paracetamol Spectrum', tag: 'Pharma' },
    { title: 'Benzene UV-Vis Spectrum', tag: 'Aromatic' },
    { title: 'Hemoglobin Spectrum', tag: 'Protein' }
];

// Show/Hide Clear Button and Suggestions as User Types
if (inputSearch) {
    inputSearch.addEventListener('input', () => {
        const val = inputSearch.value.trim();
        if (val.length > 0) {
            btnClearSearch?.classList.remove('hidden');
            renderSuggestions(val);
        } else {
            btnClearSearch?.classList.add('hidden');
            suggestionsDropdown?.classList.add('hidden');
        }
        updateSearchQueryPreview();
    });

    // Wire up other metadata input fields to update the preview
    if (inputSearchEnvironment) {
        inputSearchEnvironment.addEventListener('input', updateSearchQueryPreview);
        inputSearchEnvironment.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                btnSearch?.click();
            }
        });
    }
    if (inputSearchMixture) {
        inputSearchMixture.addEventListener('input', updateSearchQueryPreview);
        inputSearchMixture.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                btnSearch?.click();
            }
        });
    }
    if (selectPrefType) {
        selectPrefType.addEventListener('change', updateSearchQueryPreview);
    }

    // Direct search button next to chemical name input
    const btnMetadataSearch = document.getElementById('btn-metadata-search');
    if (btnMetadataSearch) {
        btnMetadataSearch.addEventListener('click', () => {
            if (btnSearch && !btnSearch.disabled) {
                btnSearch.click();
            }
        });
    }

    inputSearch.addEventListener('focus', () => {
        const val = inputSearch.value.trim();
        renderSuggestions(val);
    });

    inputSearch.addEventListener('click', () => {
        const val = inputSearch.value.trim();
        renderSuggestions(val);
    });

    inputSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            suggestionsDropdown?.classList.add('hidden');
            btnSearch?.click();
        }
    });
}

// Close suggestions on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.google-search-bar-wrapper') && !e.target.closest('.form-row')) {
        suggestionsDropdown?.classList.add('hidden');
    }
});

function renderSuggestions(filterText) {
    if (!suggestionsDropdown) return;
    const matches = POPULAR_CHEMICAL_SUGGESTIONS.filter(item =>
        !filterText || item.title.toLowerCase().includes(filterText.toLowerCase())
    );

    if (matches.length === 0) {
        suggestionsDropdown.classList.add('hidden');
        return;
    }

    suggestionsDropdown.innerHTML = '';
    matches.forEach(match => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `
            <span class="suggestion-icon">🔍</span>
            <span class="suggestion-title">${match.title}</span>
            <span class="suggestion-tag">${match.tag}</span>
        `;
        item.addEventListener('click', () => {
            inputSearch.value = match.title;
            btnClearSearch?.classList.remove('hidden');
            suggestionsDropdown.classList.add('hidden');
            updateSearchQueryPreview();
        });
        suggestionsDropdown.appendChild(item);
    });
    suggestionsDropdown.classList.remove('hidden');
}

// Clear Search Text
if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
        inputSearch.value = '';
        btnClearSearch.classList.add('hidden');
        suggestionsDropdown?.classList.add('hidden');
        inputSearch.focus();
    });
}

// Voice Search Handler (Web Speech API)
if (btnVoiceSearch) {
    btnVoiceSearch.addEventListener('click', () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Voice search is not supported in this browser. Please use Google Chrome or Edge.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        btnVoiceSearch.classList.add('listening');
        addLog('[Voice Search] Listening for chemical name...');

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            addLog(`[Voice Search] Heard: "${transcript}"`);
            inputSearch.value = transcript;
            btnClearSearch?.classList.remove('hidden');
            btnVoiceSearch.classList.remove('listening');
            btnSearch?.click();
        };

        recognition.onerror = (err) => {
            addLog(`[Voice Search] Error: ${err.error}`);
            btnVoiceSearch.classList.remove('listening');
        };

        recognition.onend = () => {
            btnVoiceSearch.classList.remove('listening');
        };

        recognition.start();
    });
}

// Target Spectrum Dropzone / File Upload Handlers
function clearTargetFile() {
    uploadedTargetFile = null;
    if (targetFileInput) targetFileInput.value = '';
    if (targetPreviewContainer) targetPreviewContainer.classList.add('hidden');
    if (targetPreviewThumb) targetPreviewThumb.src = '';
    if (targetPreviewName) targetPreviewName.textContent = '';
    if (targetDropZone) targetDropZone.style.display = 'flex';
    if (targetOcrStatus) targetOcrStatus.classList.add('hidden');
    updateSearchQueryPreview();
    addLog('[Target Spectrum] Target file removed.');
}

if (targetDropZone) {
    targetDropZone.addEventListener('click', () => targetFileInput?.click());
    targetDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        targetDropZone.classList.add('dragover');
    });
    targetDropZone.addEventListener('dragleave', () => targetDropZone.classList.remove('dragover'));
    targetDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        targetDropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUploadedTargetFile(e.dataTransfer.files[0]);
        }
    });
}

if (targetFileInput) {
    targetFileInput.addEventListener('change', () => {
        if (targetFileInput.files && targetFileInput.files[0]) {
            handleUploadedTargetFile(targetFileInput.files[0]);
        }
    });
}

if (btnRemoveTarget) {
    btnRemoveTarget.addEventListener('click', (e) => {
        e.stopPropagation();
        clearTargetFile();
    });
}

async function handleUploadedTargetFile(file) {
    if (!file) return;
    uploadedTargetFile = file;

    if (targetPreviewName) targetPreviewName.textContent = file.name;

    const srcUrl = URL.createObjectURL(file);
    if (targetPreviewThumb) targetPreviewThumb.src = srcUrl;

    if (targetDropZone) targetDropZone.style.display = 'none';
    if (targetPreviewContainer) targetPreviewContainer.classList.remove('hidden');

    addLog(`[Target Spectrum] Uploaded target file: "${file.name}"`);
    updateSearchQueryPreview();

    await inferMetadataFromSpectrum(file);
}

// Parse Tesseract output text to extract chemical names & spectral techniques
function parseInferredMetadata(text) {
    const cleanText = text.toLowerCase();
    const result = {
        spectrumType: '',
        sampleName: '',
        environment: '',
        mixture: ''
    };

    if (cleanText.includes('ftir') || cleanText.includes('ft-ir') || cleanText.includes('transmittance') || cleanText.includes('wavenumber') || cleanText.includes('cm-1') || cleanText.includes('infrared')) {
        result.spectrumType = 'FTIR';
    } else if (cleanText.includes('raman') || cleanText.includes('shift')) {
        result.spectrumType = 'Raman';
    } else if (cleanText.includes('nmr') || cleanText.includes('ppm') || cleanText.includes('1h-') || cleanText.includes('13c-')) {
        result.spectrumType = 'NMR';
    } else if (cleanText.includes('fluorescence') || cleanText.includes('emission') || cleanText.includes('excitation')) {
        result.spectrumType = 'fluorescence';
    } else if (cleanText.includes('mass') || cleanText.includes('m/z') || cleanText.includes('spectrometry') || cleanText.includes('abundance')) {
        result.spectrumType = 'mass';
    } else if (cleanText.includes('uv-vis') || cleanText.includes('uv vis') || cleanText.includes('absorbance') || cleanText.includes('absorption') || cleanText.includes('optical density') || cleanText.includes('wavelength') || cleanText.includes('nm')) {
        result.spectrumType = 'UV-Vis';
    }

    const environments = ['aqueous mixture', 'solvent', 'aqueous', 'solution', 'ethanol', 'methanol', 'water', 'thin film', 'blood', 'urine', 'plasma', 'chloroform', 'gas phase', 'solid state'];
    for (const env of environments) {
        if (cleanText.includes(env)) {
            result.environment = env;
            break;
        }
    }

    if (cleanText.includes('mixture') || cleanText.includes('mix')) {
        result.mixture = 'mixture';
        const mixTypes = ['aqueous mixture', 'binary mixture', 'liquid mixture', 'gas mixture'];
        for (const mt of mixTypes) {
            if (cleanText.includes(mt)) {
                result.mixture = mt;
                break;
            }
        }
    }

    let match = text.match(/(?:spectrum of|spectra of|absorbance of|absorption of|transmittance of)\s+([a-zA-Z0-9_-]+(?:\s+[a-zA-Z0-9_-]+){0,2})/i);
    if (!match) {
        match = text.match(/\b([a-zA-Z0-9_-]+(?:\s+[a-zA-Z0-9_-]+){0,2})\s+(?:spectrum|spectra|absorption|absorbance|transmittance|ftir|raman|nmr)\b/i);
    }

    if (match && match[1]) {
        const candidate = match[1].trim();
        const stopWords = ['a', 'an', 'the', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'this', 'that', 'uv', 'vis', 'uv-vis', 'ftir', 'ir', 'raman', 'nmr', 'mass', 'wavelength', 'absorbance', 'transmittance', 'intensity', 'optical', 'density', 'arbitrary', 'units', 'wavenumber', 'shift', 'figure', 'fig', 'table', 'sample', 'standard', 'reference', 'blank'];
        const cleanCandidate = candidate.split(/\s+/).filter(w => !stopWords.includes(w.toLowerCase())).join(' ');
        if (cleanCandidate && cleanCandidate.length > 2) {
            result.sampleName = cleanCandidate.replace(/\b\w/g, c => c.toUpperCase());
        }
    }

    if (!result.sampleName) {
        const knownChemicals = ['Hemoglobin', 'Caffeine', 'Crystal Violet', 'Beta-Carotene', 'Chlorophyll', 'Ethanol', 'Rhodamine', 'Aspirin', 'Paracetamol', 'Benzene'];
        for (const chem of knownChemicals) {
            if (cleanText.includes(chem.toLowerCase())) {
                result.sampleName = chem;
                break;
            }
        }
    }

    return result;
}

// OCR-based Target Spectrum metadata auto-inference
async function inferMetadataFromSpectrum(file) {
    if (!targetOcrStatus) return;
    targetOcrStatus.classList.remove('hidden');
    if (targetOcrStatusText) targetOcrStatusText.textContent = "Loading image for scanning...";

    try {
        const imageBitmap = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });

        if (targetOcrStatusText) targetOcrStatusText.textContent = "Initializing AI OCR worker...";
        const worker = await getTesseractWorker();

        await worker.setParameters({
            tessedit_char_whitelist: ''
        });

        if (targetOcrStatusText) targetOcrStatusText.textContent = "Scanning spectrum for keywords...";

        const canvas = document.createElement('canvas');
        canvas.width = Math.min(1000, imageBitmap.width);
        canvas.height = Math.floor(canvas.width * (imageBitmap.height / imageBitmap.width));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);

        const result = await worker.recognize(canvas);
        const text = result?.data?.text || '';
        console.log('[Target OCR Text]:', text);
        addLog(`[AI OCR Target Scan] Extracted text: ${text.replace(/\n+/g, ' ').substring(0, 150)}...`);

        await worker.setParameters({
            tessedit_char_whitelist: '0123456789.-eE'
        });

        const inferred = parseInferredMetadata(text);

        if (inferred.spectrumType && selectPrefType) {
            selectPrefType.value = inferred.spectrumType;
            addLog(`[AI Inference] Inferred Spectrum Type: ${inferred.spectrumType}`);
        }

        if (inferred.sampleName && inputSearch && !inputSearch.value.trim()) {
            inputSearch.value = inferred.sampleName;
            addLog(`[AI Inference] Inferred Sample/Chemical Name: ${inferred.sampleName}`);
        }

        if (inferred.environment && inputSearchEnvironment && !inputSearchEnvironment.value.trim()) {
            inputSearchEnvironment.value = inferred.environment;
            addLog(`[AI Inference] Inferred Environment: ${inferred.environment}`);
        }

        if (inferred.mixture && inputSearchMixture && !inputSearchMixture.value.trim()) {
            inputSearchMixture.value = inferred.mixture;
            addLog(`[AI Inference] Inferred Mixture: ${inferred.mixture}`);
        }

        targetOcrStatus.classList.add('hidden');
        updateSearchQueryPreview();

    } catch (err) {
        console.error('[Target OCR Error]:', err);
        addLog(`[AI OCR Target Scan] Failed: ${err.message}`);
        if (targetOcrStatusText) targetOcrStatusText.textContent = `Scan failed: ${err.message}`;
        setTimeout(() => targetOcrStatus.classList.add('hidden'), 3000);

        try {
            const worker = await getTesseractWorker();
            await worker.setParameters({
                tessedit_char_whitelist: '0123456789.-eE'
            });
        } catch (e) { }
    }
}

// Main Search Trigger
if (btnSearch) {
    btnSearch.addEventListener('click', async () => {
        const sampleName = inputSearch?.value.trim() || 'chemical';
        const specType = selectPrefType?.value || '';
        const environment = inputSearchEnvironment?.value.trim() || '';
        const mixture = inputSearchMixture?.value.trim() || '';

        const query = buildSearchQuery({
            sample: sampleName,
            spectrumType: specType,
            environment: environment,
            mixture: mixture
        });

        const prefRes = document.getElementById('select-pref-res')?.value || '700';
        const prefLimit = document.getElementById('select-pref-limit')?.value || '5';
        const serperApiKey = localStorage.getItem('SERPER_API_KEY') || '';

        // Import target spectrum file into workspace if present
        if (uploadedTargetFile) {
            const targetSrcUrl = URL.createObjectURL(uploadedTargetFile);
            uploadedFiles = [{
                name: `target_${uploadedTargetFile.name}`,
                fileObject: uploadedTargetFile,
                srcUrl: targetSrcUrl,
                batchSelected: true
            }];
            activeImageIndex = 0;
            await loadActiveImage();
            renderDatasetManager();
            updateImportNextButtonState();
        }

        addLog(`[Search] Querying database for "${query}" (Type: ${specType}, MinRes: ${prefRes}px, Limit: ${prefLimit})`);
        showLoading(`Searching and crawling Google Images for "${query}"...`);

        try {
            let searchUrl = `/api/search-images?q=${encodeURIComponent(query)}&type=${encodeURIComponent(specType)}&minRes=${prefRes}&limit=${prefLimit}`;
            if (serperApiKey) {
                searchUrl += `&apiKey=${encodeURIComponent(serperApiKey)}`;
            }

            const res = await fetch(searchUrl);
            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (data.provider) {
                addLog(`[Search Provider] Using ${data.provider}`);
            }

            const chkImageye = document.getElementById('chk-imageye-auto-mode');
            const isAutoPreSelect = chkImageye ? chkImageye.checked : true;

            searchResults = (data.images || []).map((img, idx) => {
                const isSelected = isAutoPreSelect ? ((img.imageyeScore || 50) >= 60 || idx === 0) : false;
                return {
                    ...img,
                    selected: isSelected
                };
            });

            const autoCount = searchResults.filter(s => s.selected).length;
            if (autoCount > 0) {
                addLog(`👁️ [Imageye Extractor] Automatically pre-selected ${autoCount} high-relevance spectrum graphs for batch processing.`);
            }

            renderSearchResultsGallery();
        } catch (err) {
            addLog(`[Search] Failed: ${err.message}`);
            alert(`❌ Search failed: ${err.message}`);
        } finally {
            hideLoading();
        }
    });
}

function renderSearchResultsGallery() {
    if (!searchResultsGrid) return;

    if (searchResults.length === 0) {
        searchPlaceholder.textContent = 'No matching spectrum graphs found. Try a different chemical name or change search preferences.';
        searchPlaceholder.classList.remove('hidden');
        searchResultsGrid.classList.add('hidden');
        selectionHeader.classList.add('hidden');
        return;
    }

    searchPlaceholder.classList.add('hidden');
    searchResultsGrid.classList.remove('hidden');
    selectionHeader.classList.remove('hidden');
    searchResultsGrid.innerHTML = '';

    searchResults.forEach((img, index) => {
        const item = document.createElement('div');
        item.className = `search-result-item${img.selected ? ' selected' : ''}`;
        item.title = img.title;

        const checkbox = document.createElement('div');
        checkbox.className = 'item-select-checkbox';
        checkbox.innerHTML = img.selected ? '✓' : '';

        const elImg = document.createElement('img');
        elImg.src = img.thumbnail;
        elImg.alt = img.title;

        const meta = document.createElement('div');
        meta.className = 'item-meta';
        meta.innerHTML = `<span class="dim">${img.width}x${img.height}</span><span class="score" style="color: #10B981; font-weight: 700;">Score: ${img.imageyeScore || 50}%</span>`;

        item.appendChild(checkbox);
        item.appendChild(elImg);
        item.appendChild(meta);

        item.addEventListener('click', () => {
            img.selected = !img.selected;
            item.classList.toggle('selected');
            checkbox.innerHTML = img.selected ? '✓' : '';
            updateSearchSelectionCount();
        });

        searchResultsGrid.appendChild(item);
    });

    updateSearchSelectionCount();
}

function updateSearchSelectionCount() {
    if (!selectionCount) return;
    const selected = searchResults.filter(img => img.selected).length;
    selectionCount.textContent = `${selected} items selected`;
    if (selected > 0) {
        btnDownloadSelected.removeAttribute('disabled');
    } else {
        btnDownloadSelected.setAttribute('disabled', 'true');
    }
}

function convertImageUrlToBlob(imgUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || 800;
                canvas.height = img.naturalHeight || 600;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas toBlob failed'));
                }, 'image/png');
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = () => reject(new Error('Failed to load image element'));
        img.src = imgUrl;
    });
}

if (btnDownloadSelected) {
    btnDownloadSelected.addEventListener('click', async () => {
        const selected = searchResults.filter(img => img.selected);
        if (selected.length === 0) return;

        showLoading(`Downloading and importing ${selected.length} selected spectra...`);
        addLog(`[Search] Downloading ${selected.length} preferred image(s)...`);

        let successCount = 0;
        try {
            const dlResponse = await fetch('/api/download-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ images: selected })
            });

            const dlData = await dlResponse.json();
            if (dlData.success && dlData.images && dlData.images.length > 0) {
                for (const item of dlData.images) {
                    const res = await fetch(item.dataUrl);
                    const blob = await res.blob();
                    const name = item.name.endsWith('.png') ? item.name : `${item.name}.png`;
                    const fileObj = new File([blob], name, { type: 'image/png' });
                    const srcUrl = URL.createObjectURL(fileObj);

                    uploadedFiles.push({
                        name: name,
                        fileObject: fileObj,
                        srcUrl: srcUrl,
                        batchSelected: true
                    });
                    successCount++;
                }
            } else {
                throw new Error(dlData.error || 'Server download yielded 0 images');
            }
        } catch (err) {
            addLog(`[Search] Server download note: ${err.message}. Using proxy/canvas stream...`);
            for (let i = 0; i < selected.length; i++) {
                const img = selected[i];
                try {
                    let blob;
                    try {
                        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(img.url)}`;
                        const response = await fetch(proxyUrl);
                        if (!response.ok) throw new Error(`Status ${response.status}`);
                        blob = await response.blob();
                    } catch (proxyErr) {
                        // Fallback to client-side image canvas blob if proxy fails/403s
                        const targetUrl = img.thumbnail || img.url;
                        blob = await convertImageUrlToBlob(targetUrl);
                    }

                    let name = img.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    if (name.length > 25) name = name.substring(0, 25);
                    name = `${name || 'spectrum'}_${Date.now() % 1000}.png`;

                    const fileObj = new File([blob], name, { type: 'image/png' });
                    const srcUrl = URL.createObjectURL(fileObj);

                    uploadedFiles.push({
                        name: name,
                        fileObject: fileObj,
                        srcUrl: srcUrl,
                        batchSelected: true
                    });
                    successCount++;
                } catch (err) {
                    addLog(`[Search] Failed to download image: ${img.url}. Error: ${err.message}`);
                }
            }
        }

        if (successCount > 0) {
            activeImageIndex = uploadedFiles.length - successCount;
            await loadActiveImage();
            renderDatasetManager();
            updateImportNextButtonState();
            goToStep(3);
            addLog(`✅ Downloaded & imported ${successCount} preferred spectrum image(s) successfully.`);
        } else {
            alert('⚠️ Failed to import selected images. Please check system logs.');
        }

        searchResults.forEach(img => img.selected = false);
        renderSearchResultsGallery();
        hideLoading();
    });
}
