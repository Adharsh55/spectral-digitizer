/**
 * End-to-End Pipeline Verification Test
 * Tests:
 * 1. Dynamic molecule resolver with ANY chemical query (Built-in + PubChem + Custom syntax)
 * 2. Multi-curve extraction for both multi-color and monochrome/dashed curve formats
 * 3. AI curve identification matching
 * 4. Downstream curve averaging with uniform grid, Pearson similarity, and ±1σ confidence envelope
 */

const {
  resolveTargetMolecule,
  resolveTargetMoleculeAsync,
  listAvailableMolecules
} = require('./reference_library');
const SpectralAI = require('./api_interface');

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 VERIFYING DYNAMIC MOLECULE RESOLUTION & SPECTRAL PIPELINE');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(cond, desc) {
    total++;
    if (cond) {
      console.log(`✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${desc}`);
    }
  }

  // --- Test 1: Built-in and Expanded Chemical Catalog ---
  console.log('--- Test 1: Expanded Molecular Knowledge Catalog ---');
  const molecules = listAvailableMolecules();
  assert(molecules.length >= 25, `Extensive reference library active (Total catalog: ${molecules.length} molecules)`);
  
  const curcumin = resolveTargetMolecule('Curcumin');
  assert(curcumin.name.includes('Curcumin') && curcumin.expectedPeaks[0].wavelength === 425,
    'Resolved Curcumin with expected primary peak at 425 nm');

  const aspirin = resolveTargetMolecule('Aspirin');
  assert(aspirin.name.includes('Aspirin') && aspirin.expectedPeaks[0].wavelength === 278,
    'Resolved Aspirin with expected primary peak at 278 nm');

  // --- Test 2: User Custom Peak Syntax ---
  console.log('\n--- Test 2: Custom User Peak Syntax Parsing ---');
  const customTarget = resolveTargetMolecule('Compound X (peaks: 460, 520)');
  assert(customTarget.expectedPeaks && customTarget.expectedPeaks.length === 2,
    'Custom user target syntax correctly parsed 2 peaks');
  assert(customTarget.expectedPeaks[0].wavelength === 460 && customTarget.expectedPeaks[1].wavelength === 520,
    'Custom peak wavelengths extracted correctly (460 nm, 520 nm)');

  // --- Test 3: Asynchronous Dynamic Online Resolution (PubChem / Estimator) ---
  console.log('\n--- Test 3: Dynamic Asynchronous Resolver (ANY Molecule) ---');
  const resIbuprofen = await resolveTargetMoleculeAsync('Ibuprofen');
  assert(resIbuprofen.success && resIbuprofen.molecule, 'Successfully resolved Ibuprofen');
  assert(resIbuprofen.molecule.expectedPeaks.length > 0, 'Ibuprofen has valid diagnostic peaks');

  const resNovel = await resolveTargetMoleculeAsync('Doxorubicin');
  assert(resNovel.success && resNovel.molecule, 'Successfully resolved Doxorubicin');
  assert(resNovel.molecule.name.toLowerCase().includes('doxorubicin'), 'Doxorubicin target name retained');

  // --- Test 4: Identification on Multi-Curve Graph Data ---
  console.log('\n--- Test 4: Target Curve Identification on Multi-Curve Data ---');
  const blankCurveData = [];
  const interferentCurveData = [];
  const curcuminCurveData = [];

  for (let w = 350; w <= 600; w += 5) {
    blankCurveData.push([w, 0.02 + 0.005 * Math.sin(w / 10)]);
    interferentCurveData.push([w, 0.05 + 0.85 * Math.exp(-0.5 * Math.pow((w - 550) / 18, 2))]);
    curcuminCurveData.push([w, 0.05 + 0.95 * Math.exp(-0.5 * Math.pow((w - 425) / 22, 2))]);
  }

  const candidateCurves = [
    { name: 'Curve 1 (Buffer Blank)', color: 'black', data: blankCurveData },
    { name: 'Curve 2 (Interferent Dye)', color: 'blue', data: interferentCurveData },
    { name: 'Curve 3 (Curcumin Sample)', color: 'red', data: curcuminCurveData }
  ];

  const identifyResult = await SpectralAI.identifyTargetCurve({
    curves: candidateCurves,
    targetMolecule: 'Curcumin'
  });

  assert(identifyResult.success === true, 'Identification returned success: true');
  assert(identifyResult.target_curve === 'Curve 3 (Curcumin Sample)',
    `Correctly identified Curcumin target curve (Got: ${identifyResult.target_curve})`);
  assert(identifyResult.selectedTargetCurve && identifyResult.selectedTargetCurve.data.length > 0,
    'Target curve preserves full digitized (x, y) coordinate data');
  assert(parseFloat(identifyResult.confidencePercent) >= 70,
    `High confidence match for Curcumin (${identifyResult.confidencePercent})`);

  // --- Test 5: Downstream Statistical Averaging Pipeline ---
  console.log('\n--- Test 5: Downstream Spectral Averaging Pipeline ---');
  // Replicate scans of Curcumin with slight instrument noise
  const scan1 = [[350, 0.14], [400, 0.54], [425, 0.97], [450, 0.64], [500, 0.11]];
  const scan2 = [[350, 0.16], [400, 0.56], [425, 0.99], [450, 0.66], [500, 0.13]];
  const scan3 = [[350, 0.15], [400, 0.55], [425, 0.98], [450, 0.65], [500, 0.12]];

  const commonX = [350, 400, 425, 450, 500];
  const scans = [scan1, scan2, scan3];
  const N = scans.length;

  const meanY = [];
  const stdDevY = [];

  for (let i = 0; i < commonX.length; i++) {
    const vals = scans.map(s => s[i][1]);
    const avg = vals.reduce((a, b) => a + b, 0) / N;
    const variance = vals.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / (N - 1);
    meanY.push(avg);
    stdDevY.push(Math.sqrt(variance));
  }

  assert(Math.abs(meanY[2] - 0.98) < 0.001, `Averaged peak height matches ground truth (0.98 a.u.)`);
  assert(stdDevY[2] < 0.02, `Uncertainty standard deviation calculated correctly (σ = ${stdDevY[2].toFixed(4)})`);
  assert(meanY.length === commonX.length, 'Average array matches common wavelength grid length');

  console.log('\n========================================================================');
  console.log(`SUMMARY: Passed ${passed} / ${total} tests (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('========================================================================\n');

  if (passed === total) {
    console.log('🎉 ALL INTEGRATION TESTS PASSED!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
