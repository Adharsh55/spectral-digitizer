const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

let SpectralAI;
try {
  SpectralAI = require('../../ai_module/api_interface');
} catch (e1) {
  try {
    SpectralAI = require('./ai_module/api_interface');
  } catch (e2) {
    console.error('[Netlify AI Function] Could not require ai_module:', e2.message);
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

if (SpectralAI && typeof SpectralAI.createExpressRouter === 'function') {
  const router = SpectralAI.createExpressRouter();
  app.use('/api/ai', router);
  app.use('/.netlify/functions/ai', router);
  app.use('/', router);
} else {
  app.all('*', (req, res) => {
    res.status(500).json({ error: 'Spectral AI module not initialized.' });
  });
}

const handler = serverless(app, {
  binary: ['*/*']
});

module.exports.handler = async (event, context) => {
  return await handler(event, context);
};
