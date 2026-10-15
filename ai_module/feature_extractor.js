/**
 * Spectral AI Module — Feature Extractor
 *
 * Extracts multi-dimensional, color-invariant spectroscopic and mathematical
 * features from digitized curve points.
 *
 * Strict requirement: Does NOT assume that curve color identifies the molecule.
 * All features are derived from:
 * 1. Physical peak wavelengths and prominences
 * 2. Multi-band spectroscopic signatures
 * 3. Full-profile envelope shape correlation (cosine similarity / Pearson r)
 * 4. Dynamic range, spectral centroid, and area under curve
 * 5. Multi-peak ratio compliance
 * 6. Solvent baseline / noise discrimination
 */

const { generateReferenceVector } = require('./reference_library');

/**
 * Detects local extrema/peaks from [x, y] curve coordinates with noise smoothing.
 * @param {Array<[number, number]>} data - sorted [x, y] coordinates
 * @param {Object} options
 * @returns {Array<Object>} peaks sorted descending by absorbance
 */
function detectPeaks(data, options = {}) {
  if (!data || data.length < 5) return [];

  const sorted = [...data].sort((a, b) => a[0] - b[0]);
  const n = sorted.length;

  // 1. Moving average smoothing
  const win = Math.max(3, options.smoothingWindow || 5);
  const half = Math.floor(win / 2);
  const smoothedY = new Array(n);

  for (let i = 0; i < n; i++) {
    let sum = 0, count = 0;
    for (let w = -half; w <= half; w++) {
      const idx = i + w;
      if (idx >= 0 && idx < n) {
        sum += sorted[idx][1];
        count++;
      }
    }
    smoothedY[i] = sum / count;
  }

  const minY = Math.min(...smoothedY);
  const maxY = Math.max(...smoothedY);
  const rangeY = maxY - minY;

  if (rangeY <= 1e-5) return [];

  // Minimum prominence threshold (e.g. 7% of dynamic range)
  const minProminence = options.minProminence || (rangeY * 0.07);
  const neighborSpan = options.neighborSpan || Math.max(2, Math.floor(n * 0.015));
  const peaks = [];

  for (let i = neighborSpan; i < n - neighborSpan; i++) {
    const curY = smoothedY[i];
    let isMax = true;

    for (let d = 1; d <= neighborSpan; d++) {
      if (smoothedY[i - d] > curY || smoothedY[i + d] > curY) {
        isMax = false;
        break;
      }
    }

    if (isMax) {
      // Find left valley minimum
      let leftMin = curY;
      for (let li = i - 1; li >= 0; li--) {
        if (smoothedY[li] < leftMin) leftMin = smoothedY[li];
        if (smoothedY[li] > curY) break;
      }

      // Find right valley minimum
      let rightMin = curY;
      for (let ri = i + 1; ri < n; ri++) {
        if (smoothedY[ri] < rightMin) rightMin = smoothedY[ri];
        if (smoothedY[ri] > curY) break;
      }

      const valley = Math.max(leftMin, rightMin);
      const prominence = curY - valley;

      if (prominence >= minProminence) {
        peaks.push({
          wavelength: sorted[i][0],
          absorbance: sorted[i][1],
          smoothedAbsorbance: curY,
          prominence: prominence,
          index: i
        });
      }
    }
  }

  // If no peak met the prominence threshold, pick the global maximum
  if (peaks.length === 0) {
    let maxIdx = 0;
    for (let i = 1; i < n; i++) {
      if (smoothedY[i] > smoothedY[maxIdx]) maxIdx = i;
    }
    peaks.push({
      wavelength: sorted[maxIdx][0],
      absorbance: sorted[maxIdx][1],
      smoothedAbsorbance: smoothedY[maxIdx],
      prominence: rangeY,
      index: maxIdx
    });
  }

  // Sort descending by absorbance
  peaks.sort((a, b) => b.absorbance - a.absorbance);
  return peaks;
}

/**
 * Resamples a curve onto a uniform wavelength grid and computes correlation with the reference profile.
 */
function computeSpectralEnvelopeCorrelation(sortedData, targetProfile, numGridPoints = 50) {
  if (sortedData.length < 5) return { cosineSimilarity: 0, pearsonR: 0 };

  const xMin = sortedData[0][0];
  const xMax = sortedData[sortedData.length - 1][0];
  const range = xMax - xMin;
  if (range <= 0) return { cosineSimilarity: 0, pearsonR: 0 };

  const gridX = [];
  const step = range / (numGridPoints - 1);
  for (let i = 0; i < numGridPoints; i++) {
    gridX.push(xMin + i * step);
  }

  // Linear interpolation of curve onto gridX
  const curveY = [];
  let curDataIdx = 0;
  for (const gx of gridX) {
    while (curDataIdx < sortedData.length - 2 && sortedData[curDataIdx + 1][0] < gx) {
      curDataIdx++;
    }
    const p1 = sortedData[curDataIdx];
    const p2 = sortedData[curDataIdx + 1] || p1;
    const dx = p2[0] - p1[0];
    const t = dx === 0 ? 0 : Math.max(0, Math.min(1, (gx - p1[0]) / dx));
    curveY.push(p1[1] + t * (p2[1] - p1[1]));
  }

  // Idealized reference vector on the same grid
  const refY = generateReferenceVector(targetProfile, gridX);

  // 1. Cosine similarity
  let dot = 0, magC = 0, magR = 0;
  for (let i = 0; i < numGridPoints; i++) {
    dot += curveY[i] * refY[i];
    magC += curveY[i] * curveY[i];
    magR += refY[i] * refY[i];
  }
  const cosineSimilarity = (magC > 0 && magR > 0) ? (dot / (Math.sqrt(magC) * Math.sqrt(magR))) : 0;

  // 2. Pearson correlation r
  const meanC = curveY.reduce((a, b) => a + b, 0) / numGridPoints;
  const meanR = refY.reduce((a, b) => a + b, 0) / numGridPoints;
  let num = 0, denC = 0, denR = 0;
  for (let i = 0; i < numGridPoints; i++) {
    const dc = curveY[i] - meanC;
    const dr = refY[i] - meanR;
    num += dc * dr;
    denC += dc * dc;
    denR += dr * dr;
  }
  const pearsonR = (denC > 0 && denR > 0) ? (num / (Math.sqrt(denC) * Math.sqrt(denR))) : 0;

  return {
    cosineSimilarity: Math.max(0, Math.min(1, cosineSimilarity)),
    pearsonR: Math.max(-1, Math.min(1, pearsonR))
  };
}

/**
 * Extracts a complete feature vector and structural analysis of a curve against a target molecule profile.
 *
 * @param {Array<[number, number]>} curveData - array of [x, y] coordinates
 * @param {Object} targetProfile - target molecule reference profile
 * @returns {Object} { featureVector: number[], featureDetails: Object }
 */
function extractCurveFeatures(curveData, targetProfile) {
  if (!curveData || curveData.length < 5) {
    return {
      featureVector: [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
      featureDetails: {
        error: 'Insufficient data points',
        peaks: [],
        dynamicRange: 0
      }
    };
  }

  const sorted = [...curveData].sort((a, b) => a[0] - b[0]);
  const peaks = detectPeaks(sorted);
  const expPeaks = targetProfile.expectedPeaks || [];
  const primaryCandidates = expPeaks.filter(p => p.isPrimary);
  const primaryExpList = primaryCandidates.length > 0 ? primaryCandidates : (expPeaks.length > 0 ? [expPeaks[0]] : []);

  // 1. Primary peak proximity
  let minPrimaryDelta = 200.0;
  let primaryProximityScore = 0.0;
  let closestPrimaryPeak = null;

  if (peaks.length > 0 && primaryExpList.length > 0) {
    for (const expP of primaryExpList) {
      for (const p of peaks) {
        const d = Math.abs(p.wavelength - expP.wavelength);
        const tol = expP.tolerance || 10;
        const prox = Math.exp(-Math.pow(d / (tol * 0.9), 2));
        if (prox > primaryProximityScore || d < minPrimaryDelta) {
          if (d < minPrimaryDelta) minPrimaryDelta = d;
          if (prox > primaryProximityScore) primaryProximityScore = prox;
          closestPrimaryPeak = p;
        }
      }
    }
  }

  // 2. Multi-band target coverage
  let matchedBandsCount = 0;
  const bandMatches = [];
  for (const exp of expPeaks) {
    let closestD = Infinity;
    let closestP = null;
    for (const p of peaks) {
      const d = Math.abs(p.wavelength - exp.wavelength);
      if (d < closestD) {
        closestD = d;
        closestP = p;
      }
    }
    const tol = exp.tolerance || 10;
    const isMatched = closestD <= (tol * 1.5);
    if (isMatched) matchedBandsCount++;

    bandMatches.push({
      expectedWavelength: exp.wavelength,
      expectedName: exp.name,
      tolerance: tol,
      closestWavelength: closestP ? closestP.wavelength : null,
      delta: closestD === Infinity ? 999 : closestD,
      isMatched
    });
  }

  const targetCoverage = expPeaks.length > 0 ? (matchedBandsCount / expPeaks.length) : 0;

  // 3. Peak count concordance
  const expectedCount = Math.max(1, expPeaks.length);
  const countRatio = Math.min(peaks.length, expectedCount) / Math.max(peaks.length, expectedCount);

  // 4. Full spectral envelope correlation
  const correlation = computeSpectralEnvelopeCorrelation(sorted, targetProfile);

  // 5. Dynamic range and Area Under Curve (AUC)
  const yVals = sorted.map(pt => pt[1]);
  const maxY = Math.max(...yVals);
  const minY = Math.min(...yVals);
  const dynamicRange = maxY - minY;

  let auc = 0;
  let weightedX = 0;
  let totalY = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const dx = sorted[i + 1][0] - sorted[i][0];
    const avgY = (sorted[i + 1][1] + sorted[i][1]) / 2;
    auc += dx * Math.max(0, avgY);
    weightedX += sorted[i][0] * sorted[i][1];
    totalY += sorted[i][1];
  }
  const centroid = totalY > 0 ? (weightedX / totalY) : 0;

  // 6. Multi-peak ratio compliance
  let ratioComplianceScore = 1.0;
  if (targetProfile.peakRatioSignature && peaks.length >= 2) {
    const sig = targetProfile.peakRatioSignature;
    if (sig.soretToQRatioMin) {
      const soretPeak = peaks.find(p => Math.abs(p.wavelength - 415) <= 15);
      const qPeak = peaks.find(p => (Math.abs(p.wavelength - 542) <= 15 || Math.abs(p.wavelength - 576) <= 15));
      if (soretPeak && qPeak && qPeak.absorbance > 0) {
        const ratio = soretPeak.absorbance / qPeak.absorbance;
        if (ratio >= sig.soretToQRatioMin && ratio <= sig.soretToQRatioMax) {
          ratioComplianceScore = 1.2; // positive boost
        } else {
          ratioComplianceScore = 0.8;
        }
      }
    }
  }

  // 7. Solvent baseline / Noise penalty
  let baselinePenalty = 1.0;
  if (maxY < 0.22 && dynamicRange < 0.12) {
    baselinePenalty = 0.05; // flat negative baseline
  }

  // Centroid delta relative to typical range mid-point
  const typicalMid = (targetProfile.typicalRange[0] + targetProfile.typicalRange[1]) / 2;
  const centroidDeltaNormalized = Math.min(1.0, Math.abs(centroid - typicalMid) / ((targetProfile.typicalRange[1] - targetProfile.typicalRange[0]) / 2));

  // Normalized 8-dimensional Feature Vector (strictly color-independent):
  // [0] Primary peak proximity score (1.0 = exact match, 0.0 = far)
  // [1] Target multi-band coverage (0.0 to 1.0)
  // [2] Peak count concordance (0.0 to 1.0)
  // [3] Spectral envelope cosine similarity (0.0 to 1.0)
  // [4] Pearson r correlation (normalized to 0.0 - 1.0)
  // [5] Dynamic range / peak prominence (normalized)
  // [6] Multi-peak ratio compliance (normalized)
  // [7] Baseline validity (1.0 = true analyte curve, 0.0 = flat blank)
  const featureVector = [
    Number(primaryProximityScore.toFixed(4)),
    Number(targetCoverage.toFixed(4)),
    Number(countRatio.toFixed(4)),
    Number(correlation.cosineSimilarity.toFixed(4)),
    Number(((correlation.pearsonR + 1) / 2).toFixed(4)),
    Number(Math.min(1.0, dynamicRange / 1.2).toFixed(4)),
    Number(Math.min(1.0, ratioComplianceScore / 1.2).toFixed(4)),
    Number(baselinePenalty.toFixed(4))
  ];

  return {
    featureVector,
    featureDetails: {
      primaryPeakDeltaNm: minPrimaryDelta === 200.0 ? null : minPrimaryDelta,
      primaryProximityScore,
      targetCoverage,
      matchedBandsCount,
      totalExpectedBands: expPeaks.length,
      bandMatches,
      detectedPeaksCount: peaks.length,
      detectedPeaks: peaks,
      cosineSimilarity: correlation.cosineSimilarity,
      pearsonR: correlation.pearsonR,
      dynamicRange,
      maxAbsorbance: maxY,
      minAbsorbance: minY,
      centroid,
      ratioComplianceScore,
      baselinePenalty
    }
  };
}

module.exports = {
  detectPeaks,
  computeSpectralEnvelopeCorrelation,
  extractCurveFeatures
};
