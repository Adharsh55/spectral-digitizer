const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();
app.use(cors());

app.get(['/api/reference-targets', '/.netlify/functions/reference-targets', '*'], (req, res) => {
  try {
    const SpectralReferenceDB = require('../../public/spectral_reference_db');
    res.json({ targets: SpectralReferenceDB.listAvailableTargets() });
  } catch (err) {
    console.error('reference-targets error:', err);
    res.status(500).json({ error: err.message });
  }
});

const handler = serverless(app);
module.exports.handler = async (event, context) => {
  if (event.path && event.path.startsWith('/.netlify/functions/reference-targets')) {
    event.path = event.path.replace('/.netlify/functions/reference-targets', '/api/reference-targets');
  }
  return await handler(event, context);
};
