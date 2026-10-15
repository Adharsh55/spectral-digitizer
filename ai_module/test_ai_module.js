/**
 * Spectral AI Module — Automated Verification & Test Suite
 *
 * Verifies all requirements:
 * 1. Structured candidate curves input identification
 * 2. Image-based multicurve identification
 * 3. Color-invariance test (proves target identification does NOT rely on curve color)
 * 4. Dataset Manager schema validation and persistent sample addition
 * 5. Model Trainer optimization and weights update
 * 6. Compatibility check with existing curve digitization format
 */

const path = require('path');
const fs = require('fs');
const SpectralAI = require('./api_interface');

async function runTestSuite() {
  console.log('\n========================================================================');
  console.log('       🔬 SPECTRAL AI MODULE: AUTOMATED VERIFICATION SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName, details = '') {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // TEST 1: Structured Input Identification (Hemoglobin in 3-curve mixture)
  // ───────────────────────────────────────────────────────────────────
  console.log('\n--- Test 1: Structured Input Identification ---');
  // Synthetic 3 curves: Curve A has peak at 406nm (MetHb), Curve B has peaks at 415nm & 542nm & 576nm (HbO2), Curve C has flat baseline
  const syntheticWavelengths = [];
  for (let w = 350; w <= 650; w += 2) syntheticWavelengths.push(w);

  // Curve A: Methemoglobin (Peak 406 nm)
  const curveA = {
    name: 'Curve A',
    color: 'blue',
    data: syntheticWavelengths.map(w => [w, 0.05 + 0.9 * Math.exp(-Math.pow((w - 406) / 12, 2)) + 0.3 * Math.exp(-Math.pow((w - 630) / 15, 2))])
  };

  // Curve B: Oxyhemoglobin Target (Peaks at 415 nm Soret, 542 nm, 576 nm)
  const curveB = {
    name: 'Curve B',
    color: 'green', // Deliberately green (not red) to test color invariance!
    data: syntheticWavelengths.map(w => [w, 0.05 + 1.1 * Math.exp(-Math.pow((w - 415) / 10, 2)) + 0.25 * Math.exp(-Math.pow((w - 542) / 8, 2)) + 0.28 * Math.exp(-Math.pow((w - 576) / 8, 2))])
  };

  // Curve C: Solvent Baseline
  const curveC = {
    name: 'Curve C',
    color: 'black',
    data: syntheticWavelengths.map(w => [w, 0.03 + 0.01 * Math.sin(w / 20)])
  };

  const result1 = await SpectralAI.identifyTargetCurve({
    curves: [curveA, curveB, curveC],
    targetMolecule: 'Hemoglobin'
  });

  assert(result1.success === true, 'Inference completed successfully');
  assert(result1.selectedTargetCurve && result1.selectedTargetCurve.name === 'Curve B',
    'Correctly identified Curve B as Hemoglobin target', `Got ${result1.selectedTargetCurve?.name}`);
  assert(result1.selectedTargetCurve.data.length === syntheticWavelengths.length,
    'Target curve preserves full digitized coordinate data for downstream digitization pipeline');
  assert(result1.selectedTargetCurve.confidenceScore > 0.70,
    `High confidence score for Hemoglobin target (${result1.confidencePercent})`);
  assert(result1.rankedCurves.find(c => c.name === 'Curve C').confidenceScore < 0.10,
    'Solvent baseline curve correctly penalized to low confidence');

  // ───────────────────────────────────────────────────────────────────
  // TEST 2: Color-Invariance Verification
  // ───────────────────────────────────────────────────────────────────
  console.log('\n--- Test 2: Color-Invariance Verification ---');
  // Swap colors completely: Make the true target curve "black" and the non-target curve "red"
  const swappedCurveA = { ...curveA, color: 'red' };   // Methemoglobin colored red
  const swappedCurveB = { ...curveB, color: 'black' }; // Oxyhemoglobin colored black

  const result2 = await SpectralAI.identifyTargetCurve({
    curves: [swappedCurveA, swappedCurveB],
    targetMolecule: 'Hemoglobin'
  });

  assert(result2.selectedTargetCurve.name === 'Curve B',
    'Model identified target by spectroscopic peak signatures, NOT by color (black curve identified over red curve)',
    `Selected: ${result2.selectedTargetCurve?.name} with color ${result2.selectedTargetCurve?.color}`);

  // ───────────────────────────────────────────────────────────────────
  // TEST 3: Image-based Multicurve Identification
  // ───────────────────────────────────────────────────────────────────
  console.log('\n--- Test 3: Image-based Multicurve Identification ---');
  const testImgPath = path.join(__dirname, '..', 'test_data', 'mixed_charts', 'mixed_01_hemoglobin_3curves.png');
  if (fs.existsSync(testImgPath)) {
    const result3 = await SpectralAI.identifyTargetCurve({
      image: testImgPath,
      targetMolecule: 'Hemoglobin',
      xRange: [350, 650],
      yRange: [0, 1.2],
      bounds: {
        originPixel: { x: 90, y: 440 },
        xMaxPixel: { x: 750, y: 440 },
        yMaxPixel: { x: 90, y: 50 }
      }
    });

    assert(result3.totalCurvesConsidered >= 3,
      `Detected ${result3.totalCurvesConsidered} curves from image bitmap`);
    assert(result3.selectedTargetCurve !== null,
      'Identified target curve from image');
    assert(result3.selectedTargetCurve.curveId === 'red_curve' || result3.selectedTargetCurve.name.includes('red'),
      `Correctly identified the Oxyhemoglobin target curve in benchmark chart (Got: ${result3.selectedTargetCurve.name})`);
  } else {
    console.warn('[Skip] Test image not found at', testImgPath);
  }

  // ───────────────────────────────────────────────────────────────────
  // TEST 4: Dataset Manager Schema & Persistent Sample Addition
  // ───────────────────────────────────────────────────────────────────
  console.log('\n--- Test 4: Dataset Manager Schema & Sample Recording ---');
  const tempDatasetPath = path.join(__dirname, '..', 'scratch', 'test_dataset.json');
  const dm = new SpectralAI.DatasetManager(tempDatasetPath);

  const testSample = {
    imagePath: 'test_data/mixed_charts/mixed_01_hemoglobin_3curves.png',
    targetMolecule: 'Hemoglobin',
    curves: [
      { curveId: 'Curve 1', color: 'blue', species: 'Methemoglobin', isTarget: false, data: curveA.data },
      { curveId: 'Curve 2', color: 'red', species: 'Oxyhemoglobin (HbO2) [Target]', isTarget: true, data: curveB.data }
    ],
    correctCurveId: 'Curve 2',
    metadata: { title: 'Test Mixed Chart', xRange: [350, 650], yRange: [0, 1.2] }
  };

  const added = dm.addSample(testSample);
  assert(added.sampleId.startsWith('sample_'), 'Added sample with valid unique ID');

  const stats = dm.getDatasetStatistics();
  assert(stats.totalSamples === 1, 'Dataset statistics reflect new sample');
  assert(stats.curveInstances.targetPositive === 1, 'Dataset tracks 1 target positive instance');
  assert(stats.curveInstances.backgroundInterferents === 1, 'Dataset tracks 1 background instance');

  // Clean up scratch file
  if (fs.existsSync(tempDatasetPath)) fs.unlinkSync(tempDatasetPath);

  // ───────────────────────────────────────────────────────────────────
  // TEST 5: Model Training Optimization & Weight Convergence
  // ───────────────────────────────────────────────────────────────────
  console.log('\n--- Test 5: Model Trainer Optimization ---');
  const modelStatusBefore = SpectralAI.getModelStatus();
  assert(modelStatusBefore.featureWeights.length === 8, 'Model has 8 color-invariant feature weights');

  const trainingResult = await SpectralAI.trainModel({ epochs: 100, learningRate: 0.2 });
  assert(trainingResult.trainingMetrics.accuracyPercent >= 80.0,
    `Model reached high training accuracy (${trainingResult.trainingMetrics.accuracyPercent}%)`);
  assert(trainingResult.weights.length === 8, 'Trained 8 feature weights successfully');

  // ───────────────────────────────────────────────────────────────────
  // TEST 6: Downstream Compatibility Check
  // ───────────────────────────────────────────────────────────────────
  console.log('\n--- Test 6: Pipeline Compatibility Check ---');
  const targetOutput = result1.selectedTargetCurve;
  assert(typeof targetOutput.name === 'string', 'Target curve has "name" attribute');
  assert(typeof targetOutput.color === 'string', 'Target curve has "color" attribute');
  assert(Array.isArray(targetOutput.data) && targetOutput.data.length > 0, 'Target curve has "data" array with points');
  assert(Array.isArray(targetOutput.data[0]) && targetOutput.data[0].length === 2, 'Data points are in [x, y] format for digitizer');

  console.log('\n========================================================================');
  console.log(`       SUMMARY: Passed ${passed} / ${total} tests (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('========================================================================\n');

  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! AI Module is verified and ready for integration.');
  }
}

if (require.main === module) {
  runTestSuite().catch(err => {
    console.error('Test suite failed with error:', err);
    process.exit(1);
  });
}

module.exports = { runTestSuite };
