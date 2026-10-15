/**
 * Phase 2 — Dataset Creation & Annotation Collector
 *
 * Collects mixed spectrum charts, extracts all candidate curves,
 * labels the correct target curve, and stores image + target + curve information
 * for Phase 3 Model Training.
 */

const fs = require('fs');
const path = require('path');

const DATASET_DIR = path.join(__dirname, '..', 'dataset');
const DATASET_FILE = path.join(DATASET_DIR, 'labeled_mixed_curves.json');

if (!fs.existsSync(DATASET_DIR)) {
    fs.mkdirSync(DATASET_DIR, { recursive: true });
}

/**
 * Load all labeled training records
 */
function loadDataset() {
    if (fs.existsSync(DATASET_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(DATASET_FILE, 'utf8'));
        } catch (e) {
            console.warn('[Dataset] Failed to parse dataset file:', e.message);
        }
    }
    return {
        version: '1.0.0',
        description: 'Spectral AI System: Labeled Multi-Curve Dataset for Target Curve Classifier',
        updatedAt: new Date().toISOString(),
        totalSamples: 0,
        samples: []
    };
}

/**
 * Save / append a new labeled mixed chart curve sample
 * @param {Object} sampleData - { imagePath, targetMolecule, curves, correctCurveName, metadata }
 */
function recordLabeledSample(sampleData) {
    const dataset = loadDataset();

    const sample = {
        sampleId: 'sample_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        timestamp: new Date().toISOString(),
        imagePath: sampleData.imagePath || 'unknown.png',
        targetMolecule: sampleData.targetMolecule || 'Hemoglobin',
        totalCurves: (sampleData.curves || []).length,
        correctCurveName: sampleData.correctCurveName || 'Curve 1',
        curves: (sampleData.curves || []).map((c, idx) => ({
            curveId: c.name || `Curve ${idx + 1}`,
            color: c.color || 'blue',
            dataPointsCount: (c.data || []).length,
            detectedPeaks: c.peaks || [],
            isTarget: (c.name === sampleData.correctCurveName)
        })),
        metadata: sampleData.metadata || {}
    };

    dataset.samples.push(sample);
    dataset.totalSamples = dataset.samples.length;
    dataset.updatedAt = new Date().toISOString();

    fs.writeFileSync(DATASET_FILE, JSON.stringify(dataset, null, 2), 'utf8');
    console.log(`[Dataset Collector] Recorded sample ${sample.sampleId} for target ${sample.targetMolecule}. Total: ${dataset.totalSamples}`);
    return sample;
}

/**
 * Seed dataset from benchmark ground truth cases
 */
function seedFromBenchmarkGroundTruth() {
    const gtPath = path.join(__dirname, '..', 'test_data', 'mixed_charts_ground_truth.json');
    if (!fs.existsSync(gtPath)) {
        console.warn('[Dataset] Ground truth file not found for seeding.');
        return;
    }

    const gt = JSON.parse(fs.readFileSync(gtPath, 'utf8'));
    const dataset = loadDataset();

    for (const c of gt.cases) {
        const existing = dataset.samples.find(s => s.imagePath === c.imagePath);
        if (!existing) {
            dataset.samples.push({
                sampleId: 'seed_case_' + c.id,
                timestamp: new Date().toISOString(),
                imagePath: c.imagePath,
                targetMolecule: c.targetMolecule,
                totalCurves: c.numCurves,
                correctCurveName: c.correctCurve,
                curves: c.curves.map(crv => ({
                    curveId: crv.name,
                    color: crv.colorName || crv.colorHex,
                    species: crv.species,
                    isTarget: crv.isTarget
                })),
                metadata: {
                    title: c.title,
                    xRange: c.xRange,
                    yRange: c.yRange
                }
            });
        }
    }

    dataset.totalSamples = dataset.samples.length;
    dataset.updatedAt = new Date().toISOString();
    fs.writeFileSync(DATASET_FILE, JSON.stringify(dataset, null, 2), 'utf8');
    console.log(`[Dataset Collector] Seeded ${dataset.totalSamples} samples from benchmark cases.`);
}

if (require.main === module) {
    seedFromBenchmarkGroundTruth();
}

module.exports = {
    loadDataset,
    recordLabeledSample,
    seedFromBenchmarkGroundTruth
};
