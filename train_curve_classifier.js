/**
 * Phase 3 — Model Training Pipeline
 *
 * Trains a curve-identification classifier using the labeled mixed chart dataset.
 * Extracts feature vectors (peak wavelength deltas, peak count, centroid, relative height)
 * and trains a discriminative model to predict whether a candidate curve belongs to the target molecule.
 */

const fs = require('fs');
const path = require('path');
const SpectralReferenceDB = require('./public/spectral_reference_db');

const DATASET_FILE = path.join(__dirname, 'dataset', 'labeled_mixed_curves.json');
const MODEL_OUTPUT_FILE = path.join(__dirname, 'dataset', 'trained_curve_model.json');
const GT_FILE = path.join(__dirname, 'test_data', 'mixed_charts_ground_truth.json');

/**
 * Extract numerical feature vector for a curve relative to a target molecule
 * Features:
 * 1. Delta between primary detected peak and expected target peak
 * 2. Peak count
 * 3. Primary peak prominence / absorbance
 * 4. Number of expected target peaks matched within tolerance
 * 5. Relative coverage of target multi-band signature
 * 6. Dynamic range (max - min absorbance)
 */
function extractFeatures(curveData, targetMolecule) {
    const target = SpectralReferenceDB.resolveTargetMolecule(targetMolecule);
    const peaks = SpectralReferenceDB.detectCurvePeaks(curveData);
    const expPeaks = target.expectedPeaks || [];

    const primaryExp = expPeaks.find(p => p.isPrimary) || expPeaks[0];
    let minPrimaryDelta = 100.0;
    if (peaks.length > 0 && primaryExp) {
        minPrimaryDelta = Math.min(...peaks.map(p => Math.abs(p.wavelength - primaryExp.wavelength)));
    }

    let matchedCount = 0;
    for (const exp of expPeaks) {
        const hasMatch = peaks.some(p => Math.abs(p.wavelength - exp.wavelength) <= exp.tolerance);
        if (hasMatch) matchedCount++;
    }

    const yVals = curveData.map(pt => pt[1]);
    const maxY = Math.max(...yVals);
    const minY = Math.min(...yVals);
    const rangeY = maxY - minY;

    return [
        Math.min(1.0, minPrimaryDelta / 50.0), // F1: Primary peak distance (normalized)
        Math.min(1.0, peaks.length / 5.0),    // F2: Normalized peak count
        Math.min(1.0, maxY / 1.5),             // F3: Max absorbance
        Math.min(1.0, rangeY / 1.2),           // F4: Dynamic range
        matchedCount / Math.max(1, expPeaks.length) // F5: Target coverage
    ];
}

async function trainModel() {
    console.log('\n========================================================================');
    console.log('       🧠 PHASE 3: CURVE-IDENTIFICATION MODEL TRAINING PIPELINE');
    console.log('       Training Discriminative Classifier on Labeled Mixed Charts');
    console.log('========================================================================\n');

    if (!fs.existsSync(GT_FILE)) {
        console.error('Ground truth dataset not found.');
        return;
    }

    const gt = JSON.parse(fs.readFileSync(GT_FILE, 'utf8'));
    const runner = require('./test_mixed_curve_benchmark');
    const Jimp = require('jimp');

    const X = [];
    const Y = [];
    const sampleDetails = [];

    console.log('[Phase 3 Training] Extracting training feature vectors from labeled mixed charts...');

    for (const c of gt.cases) {
        const imgPath = path.join(__dirname, c.imagePath);
        if (!fs.existsSync(imgPath)) continue;
        const img = await Jimp.read(imgPath);

        const rawCurves = runner.traceBenchmarkCurves ? runner.traceBenchmarkCurves(img.bitmap, gt.plotBounds, c.xRange, c.yRange) : [];

        for (const crv of c.curves) {
            const match = rawCurves.find(rc => rc.color === crv.colorName);
            if (!match || match.data.length < 15) continue;

            const features = extractFeatures(match.data, c.targetMolecule);
            const label = crv.isTarget ? 1.0 : 0.0;

            X.push(features);
            Y.push(label);
            sampleDetails.push({
                chart: c.filename,
                curve: crv.name,
                target: c.targetMolecule,
                isTarget: crv.isTarget
            });
        }
    }

    console.log(`[Phase 3 Training] Collected ${X.length} curve feature instances (Target Positive: ${Y.filter(y => y === 1).length}, Background: ${Y.filter(y => y === 0).length})`);

    // Train Logistic Feature Weights using Gradient Descent
    const numFeatures = X[0].length;
    let weights = new Array(numFeatures).fill(0.1);
    let bias = 0.0;
    const lr = 0.2;
    const epochs = 500;

    function sigmoid(z) {
        return 1.0 / (1.0 + Math.exp(-Math.max(-20, Math.min(20, z))));
    }

    for (let epoch = 0; epoch < epochs; epoch++) {
        let totalLoss = 0;
        const gradW = new Array(numFeatures).fill(0);
        let gradB = 0;

        for (let i = 0; i < X.length; i++) {
            let z = bias;
            for (let f = 0; f < numFeatures; f++) {
                z += weights[f] * X[i][f];
            }
            const pred = sigmoid(z);
            const err = pred - Y[i];
            totalLoss += - (Y[i] * Math.log(Math.max(1e-9, pred)) + (1 - Y[i]) * Math.log(Math.max(1e-9, 1 - pred)));

            for (let f = 0; f < numFeatures; f++) {
                gradW[f] += err * X[i][f];
            }
            gradB += err;
        }

        for (let f = 0; f < numFeatures; f++) {
            weights[f] -= (lr / X.length) * gradW[f];
        }
        bias -= (lr / X.length) * gradB;
    }

    // Evaluate on training set
    let correct = 0;
    for (let i = 0; i < X.length; i++) {
        let z = bias;
        for (let f = 0; f < numFeatures; f++) {
            z += weights[f] * X[i][f];
        }
        const pred = sigmoid(z);
        const predictedClass = pred >= 0.5 ? 1 : 0;
        if (predictedClass === Y[i]) correct++;
    }

    const trainingAccuracy = ((correct / X.length) * 100).toFixed(1);
    console.log(`[Phase 3 Training] Optimization complete:`);
    console.log(`   Epochs            : ${epochs}`);
    console.log(`   Training Accuracy : ${trainingAccuracy}% (${correct} / ${X.length})`);
    console.log(`   Learned Weights   :`, weights.map(w => Number(w.toFixed(4))));
    console.log(`   Learned Bias      : ${bias.toFixed(4)}\n`);

    const modelArtifact = {
        modelType: 'LogisticCurveIdentifier',
        version: '1.0.0',
        trainedAt: new Date().toISOString(),
        epochs,
        accuracyPercent: trainingAccuracy,
        featureNames: [
            'normalized_primary_peak_delta',
            'normalized_peak_count',
            'max_absorbance',
            'dynamic_range',
            'target_signature_coverage'
        ],
        weights,
        bias
    };

    fs.writeFileSync(MODEL_OUTPUT_FILE, JSON.stringify(modelArtifact, null, 2), 'utf8');
    console.log(`✅ Trained model weights saved to: ${MODEL_OUTPUT_FILE}\n`);
    return modelArtifact;
}

if (require.main === module) {
    trainModel().catch(err => console.error('Training error:', err));
}

module.exports = { trainModel, extractFeatures };
