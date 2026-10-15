const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const serverless = require('serverless-http');

const app = express();
app.use(cors());

app.get(['/api/benchmark-suite', '/.netlify/functions/benchmark-suite', '*'], (req, res) => {
  try {
    const candidatePathsResults = [
      path.join(__dirname, '..', '..', 'public', 'test_data', 'benchmark_results.json'),
      path.join(__dirname, '..', '..', 'test_data', 'benchmark_results.json'),
      path.join(process.cwd(), 'public', 'test_data', 'benchmark_results.json'),
      path.join(process.cwd(), 'test_data', 'benchmark_results.json')
    ];

    const candidatePathsGT = [
      path.join(__dirname, '..', '..', 'public', 'test_data', 'mixed_charts_ground_truth.json'),
      path.join(__dirname, '..', '..', 'test_data', 'mixed_charts_ground_truth.json'),
      path.join(process.cwd(), 'public', 'test_data', 'mixed_charts_ground_truth.json'),
      path.join(process.cwd(), 'test_data', 'mixed_charts_ground_truth.json')
    ];

    let resultsJson = null;
    for (const p of candidatePathsResults) {
      if (fs.existsSync(p)) {
        try {
          resultsJson = JSON.parse(fs.readFileSync(p, 'utf8'));
          break;
        } catch (_) {}
      }
    }

    let gtJson = null;
    for (const p of candidatePathsGT) {
      if (fs.existsSync(p)) {
        try {
          gtJson = JSON.parse(fs.readFileSync(p, 'utf8'));
          break;
        } catch (_) {}
      }
    }

    res.json({
      success: true,
      summary: resultsJson,
      groundTruth: gtJson
    });
  } catch (err) {
    console.error('benchmark-suite error:', err);
    res.status(500).json({ error: err.message });
  }
});

const handler = serverless(app);
module.exports.handler = async (event, context) => {
  if (event.path && event.path.startsWith('/.netlify/functions/benchmark-suite')) {
    event.path = event.path.replace('/.netlify/functions/benchmark-suite', '/api/benchmark-suite');
  }
  return await handler(event, context);
};
