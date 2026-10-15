/**
 * Spectral AI Module — Public API Interface
 *
 * Clean, decoupled facade providing programmatic, CLI, and HTTP interfaces
 * for the target curve identification AI module.
 *
 * Can be used:
 * 1. As a standard Node.js module:
 *    const SpectralAI = require('./ai_module/api_interface');
 *    const result = await SpectralAI.identifyTargetCurve({ curves, targetMolecule: 'Hemoglobin' });
 *
 * 2. As an Express router (mounted cleanly without touching existing endpoints):
 *    app.use('/api/ai', SpectralAI.createExpressRouter());
 *
 * 3. As a standalone CLI:
 *    node ai_module/api_interface.js --target "Hemoglobin" --image "path/to/chart.png"
 */

const path = require('path');
const SpectralCurveIdentifier = require('./spectral_curve_identifier');
const DatasetManager = require('./dataset_manager');
const ModelTrainer = require('./model_trainer');
const {
  listAvailableMolecules,
  resolveTargetMolecule,
  resolveTargetMoleculeAsync,
  registerCustomMolecule
} = require('./reference_library');
const {
  extractMetadataAndLegends,
  parseLegendWordsAndEntities,
  detectLegends,
  bindLegendsToCurves
} = require('./legend_and_molecule_extractor');

// Singleton instances for persistent in-memory caching and thread safety
const datasetManager = new DatasetManager();
const modelTrainer = new ModelTrainer({ datasetManager });
const identifier = new SpectralCurveIdentifier({ modelTrainer });

/**
 * Main inference API to identify the target curve corresponding to a molecule name.
 * Accepts either:
 * - Structured candidate curves: { curves: [...], targetMolecule: "..." }
 * - Graph image: { image: Buffer|path, targetMolecule: "...", xRange, yRange }
 *
 * Automatically resolves ANY molecule name via local library, custom cache, or online lookup.
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function identifyTargetCurve(params = {}) {
  const {
    image,
    curves,
    targetMolecule,
    xRange = [300, 700],
    yRange = [0, 1.2],
    bounds,
    configs = {}
  } = params;

  if (!targetMolecule) {
    throw new Error('Missing parameter: targetMolecule is required.');
  }

  // Resolve target molecule profile dynamically (handles ANY molecule name)
  let resolvedTarget = targetMolecule;
  if (typeof targetMolecule === 'string') {
    try {
      const resolution = await resolveTargetMoleculeAsync(targetMolecule);
      if (resolution && resolution.molecule) {
        resolvedTarget = resolution.molecule;
      }
    } catch (e) {
      resolvedTarget = resolveTargetMolecule(targetMolecule);
    }
  }

  // Path 1: Candidate curves provided (e.g. from existing curve tracing or test data)
  if (curves && Array.isArray(curves) && curves.length > 0) {
    return identifier.identifyFromCandidateCurves(curves, resolvedTarget, configs);
  }

  // Path 2: Graph image provided (file path or Buffer)
  if (image) {
    return await identifier.identifyFromImage(image, resolvedTarget, {
      xRange,
      yRange,
      bounds,
      configs
    });
  }

  throw new Error('Either "curves" (array of candidate curves) or "image" (path/buffer) must be provided.');
}

/**
 * Adds a new labeled spectral graph sample to the training dataset.
 *
 * @param {Object} sampleData - { imagePath, targetMolecule, curves, correctCurveId, metadata }
 * @returns {Object} saved sample record
 */
function addTrainingSample(sampleData) {
  return datasetManager.addSample(sampleData);
}

/**
 * Triggers model retraining across all current dataset samples.
 * Automatically reloads the new weights into the active AI inference engine.
 *
 * @param {Object} options - { epochs, learningRate, l2Reg }
 * @returns {Promise<Object>} trained model artifact
 */
async function trainModel(options = {}) {
  const artifact = await modelTrainer.train(options);
  identifier.reloadModel();
  return artifact;
}

/**
 * Returns diagnostic metadata, accuracy, and learned feature weights of the active model.
 */
function getModelStatus() {
  const model = identifier.modelArtifact;
  const stats = datasetManager.getDatasetStatistics();
  return {
    modelType: model.modelType,
    version: model.version,
    trainedAt: model.trainedAt,
    metrics: model.trainingMetrics || {},
    featureWeights: model.featureNames.map((name, i) => ({
      feature: name,
      weight: model.weights[i]
    })),
    bias: model.bias,
    dataset: stats
  };
}

/**
 * Returns the list of supported chemical target molecules and diagnostic bands.
 */
function getSupportedMolecules() {
  return listAvailableMolecules();
}

/**
 * Creates an isolated Express Router that can be mounted at /api/ai.
 * Keeps existing application routes 100% untouched.
 */
function createExpressRouter() {
  const express = require('express');
  const multer = require('multer');
  const upload = multer({ storage: multer.memoryStorage() }).single('image');
  const router = express.Router();

  // 1. Identify Target Curve
  router.post('/identify-curve', upload, async (req, res) => {
    try {
      const targetMolecule = req.body.molecule_name || req.body.targetMolecule || req.query.molecule_name || req.query.targetMolecule || 'Hemoglobin';
      let curves = null;
      if (req.body.curves) {
        curves = typeof req.body.curves === 'string' ? JSON.parse(req.body.curves) : req.body.curves;
      }

      let xRange = [300, 700], yRange = [0, 1.2];
      if (req.body.xRange) {
        xRange = typeof req.body.xRange === 'string' ? JSON.parse(req.body.xRange) : req.body.xRange;
      }
      if (req.body.yRange) {
        yRange = typeof req.body.yRange === 'string' ? JSON.parse(req.body.yRange) : req.body.yRange;
      }

      let imageInput = req.file ? req.file.buffer : null;
      if (!imageInput && req.body.image) {
        if (typeof req.body.image === 'string' && req.body.image.startsWith('data:image/')) {
          const base64Data = req.body.image.split(',')[1];
          imageInput = Buffer.from(base64Data, 'base64');
        } else if (typeof req.body.image === 'string') {
          imageInput = req.body.image; // file path or URL
        }
      }

      const result = await identifyTargetCurve({
        image: imageInput,
        curves: curves,
        targetMolecule,
        xRange,
        yRange
      });

      res.json(result);
    } catch (err) {
      console.error('[Spectral AI API Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Add Labeled Training Sample
  router.post('/dataset/sample', (req, res) => {
    try {
      const sample = addTrainingSample(req.body);
      res.json({ success: true, sample });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // 3. Trigger Retraining
  router.post('/train', async (req, res) => {
    try {
      const artifact = await trainModel(req.body || {});
      res.json({ success: true, artifact });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Model Status & Dataset Statistics
  router.get('/status', (req, res) => {
    try {
      res.json(getModelStatus());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Supported Molecules
  router.get('/molecules', (req, res) => {
    try {
      res.json({ molecules: getSupportedMolecules() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Dynamic Molecule Resolution (Handles ANY chemical name via local DB or PubChem)
  router.get('/resolve-molecule', async (req, res) => {
    try {
      const query = req.query.name || req.query.q || req.query.molecule;
      if (!query) {
        return res.status(400).json({ error: 'Query parameter "name" or "q" is required.' });
      }
      const result = await resolveTargetMoleculeAsync(query);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/resolve-molecule', async (req, res) => {
    try {
      const query = req.body.name || req.body.molecule || req.body.q;
      if (!query) {
        return res.status(400).json({ error: 'Body field "name" is required.' });
      }
      const result = await resolveTargetMoleculeAsync(query);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Save / Update Custom Molecule Profile
  router.post('/save-custom-molecule', (req, res) => {
    try {
      const profile = req.body;
      if (!profile || !profile.name) {
        return res.status(400).json({ error: 'Invalid profile data. "name" is required.' });
      }
      registerCustomMolecule(profile);
      res.json({
        success: true,
        message: `Saved custom spectroscopic profile for ${profile.name}`,
        profile
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  // 8. Extract Legends & Molecule Words from Graph Image
  router.post('/extract-legends', upload, async (req, res) => {
    try {
      let imageInput = req.file ? req.file.buffer : null;
      if (!imageInput && req.body.image) {
        if (typeof req.body.image === 'string' && req.body.image.startsWith('data:image/')) {
          const base64Data = req.body.image.split(',')[1];
          imageInput = Buffer.from(base64Data, 'base64');
        } else if (typeof req.body.image === 'string') {
          imageInput = req.body.image; // file path or URL
        }
      }

      const fileName = req.body.fileName || req.body.name || (req.file ? req.file.originalname : '');
      if (!imageInput) {
        return res.status(400).json({ error: 'Image file or dataUrl is required.' });
      }

      const result = await extractMetadataAndLegends(imageInput, fileName);
      res.json({
        success: true,
        ...result
      });
    } catch (err) {
      console.error('[Extract Legends API Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Semantic Word & Entity Parser for Text / Legend string
  router.post('/parse-legend-words', (req, res) => {
    try {
      const text = req.body.text || req.body.label || req.query.text;
      const color = req.body.color || req.body.swatchColor || req.query.color || 'unknown';
      if (!text) {
        return res.status(400).json({ error: 'Body field "text" is required.' });
      }
      const parsed = parseLegendWordsAndEntities(text, color);
      res.json({ success: true, parsed });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

// Standalone CLI invocation
if (require.main === module) {
  (async () => {
    console.log('🔬 Spectral AI Module — Standalone CLI');
    const args = process.argv.slice(2);
    let target = 'Hemoglobin';
    let imagePath = null;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--target' && args[i + 1]) target = args[i + 1];
      if (args[i] === '--image' && args[i + 1]) imagePath = args[i + 1];
      if (args[i] === '--train') {
        console.log('Initiating model training...');
        await trainModel();
        process.exit(0);
      }
      if (args[i] === '--status') {
        console.log(JSON.stringify(getModelStatus(), null, 2));
        process.exit(0);
      }
    }

    if (!imagePath) {
      imagePath = path.join(__dirname, '..', 'test_data', 'mixed_charts', 'mixed_01_hemoglobin_3curves.png');
    }

    console.log(`Running identification for Target: "${target}" on image: ${imagePath}`);
    const result = await identifyTargetCurve({ image: imagePath, targetMolecule: target });
    console.log('\n--- Result Summary ---');
    console.log(`Selected Curve : ${result.selectedTargetCurve ? result.selectedTargetCurve.curveId : 'None'}`);
    console.log(`Confidence     : ${result.confidencePercent}`);
    console.log(`Rationale:\n${result.rationale}`);
  })().catch(err => {
    console.error('CLI Execution Error:', err);
  });
}

module.exports = {
  identifyTargetCurve,
  addTrainingSample,
  trainModel,
  getModelStatus,
  getSupportedMolecules,
  createExpressRouter,
  extractMetadataAndLegends,
  parseLegendWordsAndEntities,
  detectLegends,
  bindLegendsToCurves,
  // Export core classes for direct customization
  SpectralCurveIdentifier,
  DatasetManager,
  ModelTrainer,
  resolveTargetMolecule
};
