/**
 * Spectral AI Module — Spectral Curve Identifier
 *
 * Core inference and disambiguation engine for multi-curve spectral graphs.
 *
 * Given:
 * 1. A spectral graph image OR an array of candidate curves (structured input)
 * 2. A target molecule / chemical name
 *
 * Performs:
 * 1. Multi-dimensional, color-invariant feature extraction for every curve
 * 2. Hybrid evaluation (Domain Spectroscopic Heuristics + Trained ML Classifier)
 * 3. Curve ranking and target isolation
 * 4. Transparent scientific explanation generation
 * 5. Returns the selected target curve formatted for seamless integration
 *    into the existing curve-digitization pipeline.
 */

const Jimp = require('jimp');
const { resolveTargetMolecule } = require('./reference_library');
const { extractCurveFeatures } = require('./feature_extractor');
const ModelTrainer = require('./model_trainer');

class SpectralCurveIdentifier {
  constructor(options = {}) {
    this.modelTrainer = options.modelTrainer || new ModelTrainer();
    this.modelArtifact = this.modelTrainer.loadModel();
  }

  /**
   * Reloads model weights from disk (e.g. after retraining).
   */
  reloadModel() {
    this.modelArtifact = this.modelTrainer.loadModel();
  }

  /**
   * Sigmoid function for probability scoring.
   */
  sigmoid(z) {
    const clamped = Math.max(-20, Math.min(20, z));
    return 1.0 / (1.0 + Math.exp(-clamped));
  }

  /**
   * Evaluates candidate curves against the target molecule.
   *
   * @param {Array<Object>} candidateCurves - array of { name, color, data: [[x, y], ...] }
   * @param {string|Object} targetMolecule - chemical query or target profile
   * @param {Object} options - additional parameters (thresholds, weights)
   * @returns {Object} complete decomposition and target curve selection
   */
  identifyFromCandidateCurves(candidateCurves, targetMolecule, options = {}) {
    const target = typeof targetMolecule === 'string'
      ? resolveTargetMolecule(targetMolecule)
      : (targetMolecule || resolveTargetMolecule('Hemoglobin'));

    if (!candidateCurves || !Array.isArray(candidateCurves) || candidateCurves.length === 0) {
      return {
        targetMolecule: target.name,
        targetId: target.id,
        totalCurvesConsidered: 0,
        rankedCurves: [],
        selectedTargetCurve: null,
        targetCurve: null,
        confidencePercent: '0.0%',
        rationale: 'No candidate curves were provided for identification.'
      };
    }

    const { weights, bias } = this.modelArtifact;

    const evaluatedCurves = candidateCurves.map((crv, idx) => {
      const curveId = crv.name || crv.curveId || `Curve ${idx + 1}`;
      const data = crv.data || [];

      // Extract color-invariant features
      const { featureVector, featureDetails } = extractCurveFeatures(data, target);

      // 1. Model Score via learned weights
      let z = bias;
      for (let f = 0; f < Math.min(weights.length, featureVector.length); f++) {
        z += weights[f] * featureVector[f];
      }
      const mlProbability = this.sigmoid(z);

      // 2. Spectroscopic Domain Score (Rule-Based Expert Validation)
      const primaryProx = featureDetails.primaryProximityScore || 0;
      const coverage = featureDetails.targetCoverage || 0;
      const cosineSim = featureDetails.cosineSimilarity || 0;
      const baselinePen = featureDetails.baselinePenalty || 1.0;
      const ratioScore = featureDetails.ratioComplianceScore || 1.0;

      // Composite heuristic: Primary peak presence is essential in spectroscopy
      let heuristicScore = (0.45 * primaryProx) + (0.30 * coverage) + (0.25 * cosineSim);
      heuristicScore = heuristicScore * baselinePen * Math.min(1.2, ratioScore);

      // If primary peak is completely missed (> 25nm delta), apply strong penalty
      if (featureDetails.primaryPeakDeltaNm && featureDetails.primaryPeakDeltaNm > 25) {
        heuristicScore *= 0.20;
      }

      // 3. Ensemble Fusion (60% Spectroscopic Physics + 40% ML Discriminative Score)
      let ensembleScore = (0.55 * heuristicScore) + (0.45 * mlProbability);
      if (baselinePen < 0.1) {
        ensembleScore = 0.01; // Force flat baseline / solvent blank to near-zero
      }
      ensembleScore = Math.max(0.0, Math.min(1.0, ensembleScore));

      const confidencePercent = (ensembleScore * 100).toFixed(1) + '%';

      // Build explanatory details
      const matchedBandsStr = (featureDetails.bandMatches || [])
        .filter(b => b.isMatched)
        .map(b => `${b.expectedName} (obs: ${b.closestWavelength.toFixed(1)} nm, Δ = ${b.delta.toFixed(1)} nm)`)
        .join('; ');

      const peakListStr = (featureDetails.detectedPeaks || [])
        .slice(0, 3)
        .map(p => `${p.wavelength.toFixed(1)} nm`)
        .join(', ') || 'none';

      let curveRationale = '';
      if (baselinePen < 0.1) {
        curveRationale = `Classified as solvent baseline / buffer blank (absorbance < 0.2, dynamic range < 0.12).`;
      } else if (ensembleScore >= 0.70) {
        curveRationale = `High-confidence match for ${target.name}. Strong peak alignment: [${matchedBandsStr}]. Envelope cosine similarity: ${featureDetails.cosineSimilarity.toFixed(2)}.`;
      } else if (ensembleScore >= 0.40) {
        curveRationale = `Partial match. Detected peaks at [${peakListStr}], but significant peak shifts or missing signature bands observed.`;
      } else {
        curveRationale = `Low match. Detected peaks at [${peakListStr}] do not correspond to ${target.name} reference bands.`;
      }

      return {
        curveId,
        name: curveId,
        color: crv.color || 'blue',
        originalIndex: idx,
        isTarget: false, // will be assigned to top ranked
        confidenceScore: ensembleScore,
        confidencePercent,
        mlProbability: Number(mlProbability.toFixed(4)),
        heuristicScore: Number(heuristicScore.toFixed(4)),
        featureVector,
        featureDetails,
        curveRationale,
        detectedPeaks: featureDetails.detectedPeaks || [],
        data: data // Full digitized coordinates preserved for downstream digitization pipeline
      };
    });

    // Rank curves descending by ensemble confidence score
    const rankedCurves = [...evaluatedCurves].sort((a, b) => b.confidenceScore - a.confidenceScore);

    // Select the best matching curve
    const bestCurve = rankedCurves[0] || null;
    const isTargetFound = bestCurve && bestCurve.confidenceScore >= (options.confidenceThreshold || 0.35);

    if (bestCurve) {
      bestCurve.isTarget = isTargetFound;
    }

    // Assign rank positions
    rankedCurves.forEach((c, idx) => {
      c.rank = idx + 1;
      if (c.curveId === bestCurve?.curveId) {
        c.isTarget = isTargetFound;
      }
    });

    // Generate comprehensive disambiguation summary
    const summaryLines = [
      `Target Molecule: ${target.name}`,
      `Total Candidates Analyzed: ${candidateCurves.length}`,
      `Selected Curve: ${bestCurve ? bestCurve.curveId : 'None'} (${bestCurve ? bestCurve.confidencePercent : '0%'})`,
      `--- Detailed Comparison ---`
    ];

    for (const c of rankedCurves) {
      summaryLines.push(
        `• ${c.curveId} [${c.color}] → Confidence: ${c.confidencePercent} | ${c.curveRationale}`
      );
    }

    const rationale = summaryLines.join('\n');

    // The target curve object formatted directly for the existing digitization pipeline
    const targetCurve = bestCurve ? {
      curveId: bestCurve.curveId,
      name: bestCurve.name,
      color: bestCurve.color,
      isTarget: bestCurve.isTarget,
      confidenceScore: bestCurve.confidenceScore,
      confidencePercent: bestCurve.confidencePercent,
      data: bestCurve.data,
      detectedPeaks: bestCurve.detectedPeaks,
      featureDetails: bestCurve.featureDetails,
      explanation: bestCurve.curveRationale
    } : null;

    return {
      status: 'success',
      success: true,
      target_curve: bestCurve ? bestCurve.curveId : null,
      confidence: bestCurve ? Number((bestCurve.confidenceScore).toFixed(4)) : 0,
      confidencePercent: bestCurve ? bestCurve.confidencePercent : '0.0%',
      targetMolecule: target.name,
      molecule_name: target.name,
      targetId: target.id,
      totalCurvesConsidered: candidateCurves.length,
      selectedTargetCurve: targetCurve,
      targetCurve: targetCurve, // Alias for direct compatibility with existing routes
      rankedCurves,
      confidenceScore: bestCurve ? bestCurve.confidenceScore : 0,
      rationale
    };
  }

  /**
   * Identifies the target curve directly from an input image.
   *
   * @param {string|Buffer|Object} imageInput - image path, buffer, or Jimp instance
   * @param {string} targetMolecule - target molecule name
   * @param {Object} options - { bounds, xRange, yRange, configs }
   */
  async identifyFromImage(imageInput, targetMolecule, options = {}) {
    let img;
    if (typeof imageInput === 'string') {
      img = await Jimp.read(imageInput);
    } else if (Buffer.isBuffer(imageInput)) {
      img = await Jimp.read(imageInput);
    } else if (imageInput.bitmap) {
      img = imageInput;
    } else {
      throw new Error('Unsupported image input format. Provide a file path, Buffer, or Jimp image.');
    }

    const xRange = options.xRange || [300, 700];
    const yRange = options.yRange || [0, 1.2];

    // Isolate curves using plot boundaries (non-invasive curve detection)
    const bounds = options.bounds || {
      originPixel: { x: Math.round(img.bitmap.width * 0.1125), y: Math.round(img.bitmap.height * 0.88) },
      xMaxPixel: { x: Math.round(img.bitmap.width * 0.9375), y: Math.round(img.bitmap.height * 0.88) },
      yMaxPixel: { x: Math.round(img.bitmap.width * 0.1125), y: Math.round(img.bitmap.height * 0.10) }
    };

    const { traceBenchmarkCurves } = require('../test_mixed_curve_benchmark');
    const tracedCurves = traceBenchmarkCurves(img.bitmap, bounds, xRange, yRange);

    if (tracedCurves.length === 0) {
      return {
        success: false,
        error: 'No curves could be detected in the spectral plot region.',
        targetMolecule,
        totalCurvesConsidered: 0,
        rankedCurves: [],
        selectedTargetCurve: null,
        targetCurve: null
      };
    }

    // Pass the traced candidate curves to the core identification engine
    return this.identifyFromCandidateCurves(tracedCurves, targetMolecule, options);
  }
}

module.exports = SpectralCurveIdentifier;
