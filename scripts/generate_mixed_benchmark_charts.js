const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'test_data', 'mixed_charts');
const GROUND_TRUTH_FILE = path.join(__dirname, '..', 'test_data', 'mixed_charts_ground_truth.json');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Gaussian peak helper: A * exp( -((x - center) / width)^2 )
function peak(x, center, width, amp) {
    return amp * Math.exp(-Math.pow((x - center) / width, 2));
}

// 8 Benchmark Mixed Charts Definitions
const BENCHMARK_CASES = [
    {
        id: 1,
        filename: 'mixed_01_hemoglobin_3curves.png',
        title: 'Mixed Hemoglobin Species Absorbance Spectrum',
        targetMolecule: 'Hemoglobin',
        xRange: [350, 650],
        yRange: [0, 1.2],
        xLabel: 'Wavelength (nm)',
        yLabel: 'Absorbance (a.u.)',
        numCurves: 3,
        correctCurve: 'Curve 2',
        correctCurveIndex: 1,
        curves: [
            {
                name: 'Curve 1',
                species: 'Methemoglobin',
                colorHex: '#3B82F6', // Blue
                colorName: 'blue',
                fn: (x) => 0.08 + peak(x, 406, 16, 0.72) + peak(x, 500, 18, 0.28) + peak(x, 630, 20, 0.35)
            },
            {
                name: 'Curve 2',
                species: 'Oxyhemoglobin (HbO2) [Target]',
                colorHex: '#EF4444', // Red
                colorName: 'red',
                fn: (x) => 0.08 + peak(x, 415, 14, 1.05) + peak(x, 542, 12, 0.38) + peak(x, 576, 12, 0.42)
            },
            {
                name: 'Curve 3',
                species: 'Deoxyhemoglobin (Hb)',
                colorHex: '#10B981', // Green
                colorName: 'green',
                fn: (x) => 0.08 + peak(x, 430, 22, 0.85) + peak(x, 556, 30, 0.32)
            }
        ]
    },
    {
        id: 2,
        filename: 'mixed_02_hemoglobin_4curves.png',
        title: 'Blood Hemoglobin Derivations & Baseline Assay',
        targetMolecule: 'Hemoglobin',
        xRange: [360, 640],
        yRange: [0, 1.3],
        xLabel: 'Wavelength (nm)',
        yLabel: 'Absorbance',
        numCurves: 4,
        correctCurve: 'Curve 1',
        correctCurveIndex: 0,
        curves: [
            {
                name: 'Curve 1',
                species: 'Oxyhemoglobin (HbO2) [Target]',
                colorHex: '#EF4444', // Red
                colorName: 'red',
                fn: (x) => 0.08 + peak(x, 415, 13, 1.15) + peak(x, 542, 11, 0.39) + peak(x, 576, 11, 0.43)
            },
            {
                name: 'Curve 2',
                species: 'Carboxyhemoglobin (HbCO)',
                colorHex: '#FF6D00', // Orange
                colorName: 'orange',
                fn: (x) => 0.08 + peak(x, 419, 14, 1.10) + peak(x, 540, 11, 0.35) + peak(x, 569, 12, 0.38)
            },
            {
                name: 'Curve 3',
                species: 'Methemoglobin',
                colorHex: '#3B82F6', // Blue
                colorName: 'blue',
                fn: (x) => 0.08 + peak(x, 406, 17, 0.70) + peak(x, 630, 22, 0.34)
            },
            {
                name: 'Curve 4',
                species: 'Buffer Blank / Baseline',
                colorHex: '#06B6D4', // Cyan
                colorName: 'cyan',
                fn: (x) => 0.10 + 0.015 * Math.sin(x / 40)
            }
        ]
    },
    {
        id: 3,
        filename: 'mixed_03_cytochrome_c_3curves.png',
        title: 'Cytochrome C Redox State Absorbance Chart',
        targetMolecule: 'Cytochrome C',
        xRange: [380, 580],
        yRange: [0, 1.4],
        xLabel: 'Wavelength (nm)',
        yLabel: 'Absorbance (a.u.)',
        numCurves: 3,
        correctCurve: 'Curve 3',
        correctCurveIndex: 2,
        curves: [
            {
                name: 'Curve 1',
                species: 'Apo-protein Blank',
                colorHex: '#06B6D4', // Cyan
                colorName: 'cyan',
                fn: (x) => 0.10 + peak(x, 400, 40, 0.18)
            },
            {
                name: 'Curve 2',
                species: 'Oxidized Cytochrome C (Ferricytochrome)',
                colorHex: '#EAB308', // Yellow
                colorName: 'yellow',
                fn: (x) => 0.08 + peak(x, 409, 16, 0.95) + peak(x, 530, 25, 0.22)
            },
            {
                name: 'Curve 3',
                species: 'Reduced Cytochrome C (Ferrocytochrome) [Target]',
                colorHex: '#EF4444', // Red
                colorName: 'red',
                fn: (x) => 0.08 + peak(x, 415, 14, 1.25) + peak(x, 521, 10, 0.36) + peak(x, 550, 8, 0.52)
            }
        ]
    },
    {
        id: 4,
        filename: 'mixed_04_crystal_violet_4curves.png',
        title: 'Crystal Violet Solvation and Decolorization Series',
        targetMolecule: 'Crystal Violet',
        xRange: [420, 680],
        yRange: [0, 1.2],
        xLabel: 'Wavelength (nm)',
        yLabel: 'Absorbance',
        numCurves: 4,
        correctCurve: 'Curve 2',
        correctCurveIndex: 1,
        curves: [
            {
                name: 'Curve 1',
                species: 'Degradation / Hydrolysis Intermediate',
                colorHex: '#3B82F6', // Blue
                colorName: 'blue',
                fn: (x) => 0.08 + peak(x, 510, 28, 0.25) + peak(x, 470, 24, 0.18)
            },
            {
                name: 'Curve 2',
                species: 'Crystal Violet Standard [Target]',
                colorHex: '#D946EF', // Magenta
                colorName: 'magenta',
                fn: (x) => 0.08 + peak(x, 590, 24, 1.05) + peak(x, 545, 20, 0.42)
            },
            {
                name: 'Curve 3',
                species: 'Solvent Shifted Micellar Complex',
                colorHex: '#10B981', // Green
                colorName: 'green',
                fn: (x) => 0.08 + peak(x, 615, 26, 0.65) + peak(x, 560, 22, 0.28)
            },
            {
                name: 'Curve 4',
                species: 'Surfactant / Solvent Baseline',
                colorHex: '#06B6D4', // Cyan
                colorName: 'cyan',
                fn: (x) => 0.10 + 0.01 * Math.sin(x / 30)
            }
        ]
    },
    {
        id: 5,
        filename: 'mixed_05_chlorophyll_3curves.png',
        title: 'Plant Pigment Extract: Chlorophyll a & b with Carotenoids',
        targetMolecule: 'Chlorophyll a',
        xRange: [380, 720],
        yRange: [0, 1.2],
        xLabel: 'Wavelength (nm)',
        yLabel: 'Absorbance (a.u.)',
        numCurves: 3,
        correctCurve: 'Curve 2',
        correctCurveIndex: 1,
        curves: [
            {
                name: 'Curve 1',
                species: 'Lutein / Total Carotenoids',
                colorHex: '#FF6D00', // Orange
                colorName: 'orange',
                fn: (x) => 0.08 + peak(x, 445, 18, 0.65) + peak(x, 474, 18, 0.62)
            },
            {
                name: 'Curve 2',
                species: 'Chlorophyll a [Target]',
                colorHex: '#10B981', // Green
                colorName: 'green',
                fn: (x) => 0.08 + peak(x, 430, 16, 0.95) + peak(x, 662, 14, 0.85) + peak(x, 615, 18, 0.18)
            },
            {
                name: 'Curve 3',
                species: 'Chlorophyll b',
                colorHex: '#EAB308', // Yellow
                colorName: 'yellow',
                fn: (x) => 0.08 + peak(x, 453, 16, 0.80) + peak(x, 642, 14, 0.62)
            }
        ]
    },
    {
        id: 6,
        filename: 'mixed_06_caffeine_paracetamol_3curves.png',
        title: 'Pharmaceutical Formulation: Caffeine and Paracetamol UV Spectra',
        targetMolecule: 'Caffeine',
        xRange: [210, 320],
        yRange: [0, 1.3],
        xLabel: 'Wavelength (nm)',
        yLabel: 'Absorbance',
        numCurves: 3,
        correctCurve: 'Curve 1',
        correctCurveIndex: 0,
        curves: [
            {
                name: 'Curve 1',
                species: 'Caffeine Standard [Target]',
                colorHex: '#3B82F6', // Blue
                colorName: 'blue',
                fn: (x) => 0.08 + peak(x, 273, 14, 1.10)
            },
            {
                name: 'Curve 2',
                species: 'Paracetamol',
                colorHex: '#EF4444', // Red
                colorName: 'red',
                fn: (x) => 0.08 + peak(x, 245, 15, 1.18)
            },
            {
                name: 'Curve 3',
                species: 'Excipient / Binder Residuals',
                colorHex: '#10B981', // Green
                colorName: 'green',
                fn: (x) => 0.08 + 0.12 * Math.exp(-(x - 210) / 30)
            }
        ]
    },
    {
        id: 7,
        filename: 'mixed_07_bsa_protein_3curves.png',
        title: 'Serum Albumin and Aromatic Amino Acids UV Profile',
        targetMolecule: 'Bovine Serum Albumin',
        xRange: [230, 330],
        yRange: [0, 1.2],
        xLabel: 'Wavelength (nm)',
        yLabel: 'Absorbance',
        numCurves: 3,
        correctCurve: 'Curve 2',
        correctCurveIndex: 1,
        curves: [
            {
                name: 'Curve 1',
                species: 'Phosphate Buffer Saline Blank',
                colorHex: '#06B6D4', // Cyan
                colorName: 'cyan',
                fn: (x) => 0.10 + 0.01 * Math.sin(x / 20)
            },
            {
                name: 'Curve 2',
                species: 'BSA Standard (279 nm Aromatic) [Target]',
                colorHex: '#3B82F6', // Blue
                colorName: 'blue',
                fn: (x) => 0.08 + peak(x, 279, 14, 1.05) + 0.18 * Math.exp(-(x - 230) / 25)
            },
            {
                name: 'Curve 3',
                species: 'Free Tyrosine Amino Acid',
                colorHex: '#FF6D00', // Orange
                colorName: 'orange',
                fn: (x) => 0.08 + peak(x, 274, 10, 0.72) + peak(x, 222, 12, 0.85)
            }
        ]
    },
    {
        id: 8,
        filename: 'mixed_08_beta_carotene_3curves.png',
        title: 'Carotenoid Fractionation: Lycopene vs Beta-Carotene',
        targetMolecule: 'Beta-Carotene',
        xRange: [380, 540],
        yRange: [0, 1.2],
        xLabel: 'Wavelength (nm)',
        yLabel: 'Absorbance (a.u.)',
        numCurves: 3,
        correctCurve: 'Curve 3',
        correctCurveIndex: 2,
        curves: [
            {
                name: 'Curve 1',
                species: 'Hexane-Acetone Solvent Blank',
                colorHex: '#06B6D4', // Cyan
                colorName: 'cyan',
                fn: (x) => 0.10 + 0.01 * Math.cos(x / 30)
            },
            {
                name: 'Curve 2',
                species: 'Lycopene Extract',
                colorHex: '#EF4444', // Red
                colorName: 'red',
                fn: (x) => 0.08 + peak(x, 444, 12, 0.70) + peak(x, 471, 12, 0.95) + peak(x, 502, 12, 0.85)
            },
            {
                name: 'Curve 3',
                species: 'Beta-Carotene Standard [Target]',
                colorHex: '#FF6D00', // Orange
                colorName: 'orange',
                fn: (x) => 0.08 + peak(x, 425, 11, 0.55) + peak(x, 450, 12, 1.02) + peak(x, 478, 12, 0.88)
            }
        ]
    }
];

function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16)
    };
}

async function generateAllCharts() {
    console.log('[Benchmark Generator] Rendering 8 high-fidelity mixed spectrum charts...');

    const W = 800;
    const H = 520;
    const plotLeft = 90;
    const plotRight = 750;
    const plotTop = 50;
    const plotBottom = 440;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;

    for (const bCase of BENCHMARK_CASES) {
        const img = new Jimp(W, H, 0xFFFFFFFF);

        const xMin = bCase.xRange[0];
        const xMax = bCase.xRange[1];
        const yMin = bCase.yRange[0];
        const yMax = bCase.yRange[1];

        // Light background grid
        const gridColor = Jimp.rgbaToInt(238, 242, 246, 255);
        for (let gx = 0; gx <= 6; gx++) {
            const px = Math.round(plotLeft + (gx / 6) * plotW);
            for (let py = plotTop; py <= plotBottom; py++) {
                img.setPixelColor(gridColor, px, py);
            }
        }
        for (let gy = 0; gy <= 5; gy++) {
            const py = Math.round(plotTop + (gy / 5) * plotH);
            for (let px = plotLeft; px <= plotRight; px++) {
                img.setPixelColor(gridColor, px, py);
            }
        }

        // Axes borders (2px dark slate)
        const axisColor = Jimp.rgbaToInt(15, 23, 42, 255);
        for (let px = plotLeft; px <= plotRight; px++) {
            img.setPixelColor(axisColor, px, plotBottom);
            img.setPixelColor(axisColor, px, plotBottom + 1);
            img.setPixelColor(axisColor, px, plotTop);
        }
        for (let py = plotTop; py <= plotBottom; py++) {
            img.setPixelColor(axisColor, plotLeft, py);
            img.setPixelColor(axisColor, plotLeft - 1, py);
            img.setPixelColor(axisColor, plotRight, py);
        }

        // Tick marks along axes
        for (let gx = 0; gx <= 6; gx++) {
            const px = Math.round(plotLeft + (gx / 6) * plotW);
            for (let t = 0; t <= 6; t++) {
                img.setPixelColor(axisColor, px, plotBottom + t);
            }
        }
        for (let gy = 0; gy <= 5; gy++) {
            const py = Math.round(plotTop + (gy / 5) * plotH);
            for (let t = 0; t <= 6; t++) {
                img.setPixelColor(axisColor, plotLeft - t, py);
            }
        }

        // Render Curves
        for (const curve of bCase.curves) {
            const rgb = hexToRgb(curve.colorHex);
            const curveColor = Jimp.rgbaToInt(rgb.r, rgb.g, rgb.b, 255);
            let prevPy = null;

            for (let px = plotLeft + 1; px < plotRight; px++) {
                const fracX = (px - plotLeft) / plotW;
                const wavelength = xMin + fracX * (xMax - xMin);
                const absVal = curve.fn(wavelength);

                const fracY = (absVal - yMin) / (yMax - yMin);
                const py = Math.round(plotBottom - fracY * plotH);

                if (py >= plotTop && py <= plotBottom) {
                    img.setPixelColor(curveColor, px, py);
                    img.setPixelColor(curveColor, px, py - 1);
                    img.setPixelColor(curveColor, px, py + 1);

                    if (prevPy !== null && Math.abs(py - prevPy) > 1) {
                        const step = py > prevPy ? 1 : -1;
                        for (let yInter = prevPy; yInter !== py; yInter += step) {
                            if (yInter >= plotTop && yInter <= plotBottom) {
                                img.setPixelColor(curveColor, px, yInter);
                                img.setPixelColor(curveColor, px - 1, yInter);
                            }
                        }
                    }
                    prevPy = py;
                }
            }
        }

        const targetPath = path.join(OUTPUT_DIR, bCase.filename);
        await img.writeAsync(targetPath);
        console.log(`[Benchmark Generator] Rendered: ${bCase.filename} (${bCase.numCurves} curves -> Target: ${bCase.targetMolecule} -> ${bCase.correctCurve})`);
    }

    const groundTruthData = {
        generatedAt: new Date().toISOString(),
        totalCases: BENCHMARK_CASES.length,
        plotBounds: {
            originPixel: { x: plotLeft, y: plotBottom },
            xMaxPixel: { x: plotRight, y: plotBottom },
            yMaxPixel: { x: plotLeft, y: plotTop }
        },
        cases: BENCHMARK_CASES.map(c => ({
            id: c.id,
            filename: c.filename,
            imagePath: `test_data/mixed_charts/${c.filename}`,
            title: c.title,
            targetMolecule: c.targetMolecule,
            xRange: c.xRange,
            yRange: c.yRange,
            xLabel: c.xLabel,
            yLabel: c.yLabel,
            numCurves: c.numCurves,
            correctCurve: c.correctCurve,
            correctCurveIndex: c.correctCurveIndex,
            curves: c.curves.map((crv, idx) => ({
                name: crv.name,
                species: crv.species,
                colorHex: crv.colorHex,
                colorName: crv.colorName,
                isTarget: idx === c.correctCurveIndex
            }))
        }))
    };

    fs.writeFileSync(GROUND_TRUTH_FILE, JSON.stringify(groundTruthData, null, 2), 'utf8');
    console.log(`[Benchmark Generator] Ground truth saved: ${GROUND_TRUTH_FILE}`);
}

generateAllCharts().catch(err => {
    console.error('[Benchmark Generator] Error:', err);
});
