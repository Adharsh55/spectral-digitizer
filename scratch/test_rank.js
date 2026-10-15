const SpectralReferenceDB = require('../public/spectral_reference_db');

const target = SpectralReferenceDB.resolveTargetMolecule('Crystal Violet');

// Real curve: 1500 points spanning 400 to 800 nm, peak at 588 nm (abs 0.82)
const realData = [];
for (let x = 400; x <= 800; x += 0.25) {
    const y = 0.82 * Math.exp(-Math.pow((x - 588) / 35, 2)) + 0.15 * Math.exp(-Math.pow((x - 545) / 25, 2));
    realData.push([x, y]);
}
const realCurve = { name: 'Real Spectrum (red)', color: 'red', data: realData };

// Fragment: 100 points spanning 570 to 600 nm, peak at 590 nm (abs 0.95)
const fragmentData = [];
for (let x = 570; x <= 600; x += 0.3) {
    fragmentData.push([x, 0.95]);
}
const fragmentCurve = { name: 'Text Fragment (orange)', color: 'orange', data: fragmentData };

const result = SpectralReferenceDB.decomposeAndClassifyCurves([fragmentCurve, realCurve], target);
console.log('Best match:', result.bestMatchCurve.name, 'score:', result.bestMatchConfidence);

