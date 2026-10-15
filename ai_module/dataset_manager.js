/**
 * Spectral AI Module — Dataset Manager
 *
 * Manages the training dataset of labeled multi-curve spectral graphs.
 * Associates:
 * - Graph image path / reference
 * - Target molecule name
 * - All candidate curves present in the graph (data points, detected peaks, color, species)
 * - Ground truth target curve identification
 * - Graph metadata (xRange, yRange, plot bounds)
 *
 * Supports adding new labeled samples to continuously improve the model as more data is acquired.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_DATASET_FILE = path.join(__dirname, '..', 'dataset', 'labeled_mixed_curves.json');

class DatasetManager {
  constructor(datasetFilePath = DEFAULT_DATASET_FILE) {
    this.datasetFilePath = datasetFilePath;
    const dir = path.dirname(datasetFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Loads the current dataset from disk.
   */
  loadDataset() {
    if (fs.existsSync(this.datasetFilePath)) {
      try {
        const raw = fs.readFileSync(this.datasetFilePath, 'utf8');
        return JSON.parse(raw);
      } catch (err) {
        console.warn('[DatasetManager] Warning: Failed to parse dataset file:', err.message);
      }
    }
    return {
      version: '1.1.0',
      description: 'Spectral AI System: Multi-Curve Ground Truth Dataset for Target Molecule Identification',
      updatedAt: new Date().toISOString(),
      totalSamples: 0,
      samples: []
    };
  }

  /**
   * Validates a sample object to ensure it meets the schema requirements.
   * @param {Object} sampleData
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateSample(sampleData) {
    const errors = [];
    if (!sampleData) {
      return { valid: false, errors: ['Sample data cannot be null or undefined.'] };
    }

    if (!sampleData.targetMolecule || typeof sampleData.targetMolecule !== 'string') {
      errors.push('Field "targetMolecule" is required (string).');
    }

    if (!sampleData.curves || !Array.isArray(sampleData.curves) || sampleData.curves.length === 0) {
      errors.push('Field "curves" must be a non-empty array of candidate curves.');
    } else {
      const targetCurves = sampleData.curves.filter(c => c.isTarget === true || c.curveId === sampleData.correctCurveId || c.name === sampleData.correctCurveId);
      if (targetCurves.length === 0 && !sampleData.correctCurveId) {
        errors.push('At least one candidate curve must be designated as the target (isTarget: true or matching correctCurveId).');
      }
    }

    if (!sampleData.imagePath && !sampleData.imageFile) {
      // Optional for purely structured datasets, but recommended
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Adds a new labeled training sample to the dataset.
   *
   * @param {Object} sampleData - { imagePath, targetMolecule, curves, correctCurveId, metadata }
   * @returns {Object} the newly created and saved sample record
   */
  addSample(sampleData) {
    const validation = this.validateSample(sampleData);
    if (!validation.valid) {
      throw new Error(`Dataset validation failed: ${validation.errors.join('; ')}`);
    }

    const dataset = this.loadDataset();
    const correctCurveIdentifier = sampleData.correctCurveId || sampleData.correctCurveName ||
      (sampleData.curves.find(c => c.isTarget)?.curveId || 'Curve 1');

    const sampleRecord = {
      sampleId: sampleData.sampleId || ('sample_' + Date.now() + '_' + Math.floor(Math.random() * 10000)),
      timestamp: new Date().toISOString(),
      imagePath: sampleData.imagePath || 'unknown.png',
      targetMolecule: sampleData.targetMolecule.trim(),
      totalCurves: sampleData.curves.length,
      correctCurveId: correctCurveIdentifier,
      curves: sampleData.curves.map((crv, idx) => {
        const id = crv.curveId || crv.name || `Curve ${idx + 1}`;
        const isTarget = (id === correctCurveIdentifier) || (crv.isTarget === true);
        return {
          curveId: id,
          color: crv.color || 'blue',
          species: crv.species || (isTarget ? `${sampleData.targetMolecule} [Target]` : 'Interferent/Background'),
          isTarget: isTarget,
          dataPointsCount: (crv.data || []).length,
          data: crv.data || [],
          detectedPeaks: crv.detectedPeaks || crv.peaks || []
        };
      }),
      metadata: {
        title: sampleData.metadata?.title || `Mixed Spectrum (${sampleData.targetMolecule})`,
        xRange: sampleData.metadata?.xRange || [300, 700],
        yRange: sampleData.metadata?.yRange || [0, 1.2],
        instrument: sampleData.metadata?.instrument || 'UV-Vis Spectrophotometer',
        notes: sampleData.metadata?.notes || ''
      }
    };

    dataset.samples.push(sampleRecord);
    dataset.totalSamples = dataset.samples.length;
    dataset.updatedAt = new Date().toISOString();

    fs.writeFileSync(this.datasetFilePath, JSON.stringify(dataset, null, 2), 'utf8');
    console.log(`[DatasetManager] Successfully recorded sample ${sampleRecord.sampleId} for ${sampleRecord.targetMolecule}. Total samples: ${dataset.totalSamples}`);
    return sampleRecord;
  }

  /**
   * Retrieves a training sample by its sampleId.
   */
  getSampleById(sampleId) {
    const dataset = this.loadDataset();
    return dataset.samples.find(s => s.sampleId === sampleId) || null;
  }

  /**
   * Returns all training samples in the dataset.
   */
  getAllSamples() {
    return this.loadDataset().samples || [];
  }

  /**
   * Returns analytical statistics on the current dataset composition.
   */
  getDatasetStatistics() {
    const dataset = this.loadDataset();
    const moleculeCounts = {};
    let totalTargetPositive = 0;
    let totalBackgroundCurves = 0;

    for (const sample of dataset.samples) {
      const mol = sample.targetMolecule;
      moleculeCounts[mol] = (moleculeCounts[mol] || 0) + 1;
      for (const crv of sample.curves) {
        if (crv.isTarget) totalTargetPositive++;
        else totalBackgroundCurves++;
      }
    }

    return {
      totalSamples: dataset.totalSamples || dataset.samples.length,
      updatedAt: dataset.updatedAt,
      uniqueMoleculesCount: Object.keys(moleculeCounts).length,
      samplesPerMolecule: moleculeCounts,
      curveInstances: {
        targetPositive: totalTargetPositive,
        backgroundInterferents: totalBackgroundCurves,
        totalCurves: totalTargetPositive + totalBackgroundCurves
      }
    };
  }

  /**
   * Bulk imports training samples.
   */
  importSamples(samplesList) {
    if (!Array.isArray(samplesList)) return 0;
    let added = 0;
    for (const s of samplesList) {
      try {
        this.addSample(s);
        added++;
      } catch (e) {
        console.warn(`[DatasetManager] Skipped invalid sample during import:`, e.message);
      }
    }
    return added;
  }
}

module.exports = DatasetManager;
