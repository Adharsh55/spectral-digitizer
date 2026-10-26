/**
 * Spectral AI Module — Legend and Molecule Extractor
 *
 * Dedicated multi-modal intelligence for graph images:
 * 1. Robust Chemical & Molecule Name Extraction from File Name, Chart Title, and In-plot Text.
 * 2. Visual Legend & Swatch Detection: Maps line/swatch colors to exact species, condition, and concentration labels.
 * 3. Curve-to-Legend Binding: Renames generic digitized curves (e.g. 'red_curve_1') to true human-readable labels (e.g. 'Hb oxygenated (Red)').
 * 4. Multi-Evidence Consensus Scoring: Prevents false fallbacks (never blindly defaults to Hemoglobin).
 */

const Jimp = require('jimp');
const path = require('path');
const https = require('https');
const fs = require('fs');
const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}

function loadEnvIfNeeded() {
  if (process.env.GEMINI_API_KEY) return;
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const clean = line.trim();
        if (clean && !clean.startsWith('#')) {
          const parts = clean.split('=');
          if (parts.length >= 2) {
            const k = parts[0].trim();
            const v = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
            if (!process.env[k]) process.env[k] = v;
          }
        }
      });
    } catch (e) {
      // ignore
    }
  }
}

let Tesseract = null;
try {
  Tesseract = require('tesseract.js');
} catch (e) {
  Tesseract = null;
}

// Comprehensive registry of target molecules and their aliases
const MOLECULE_KNOWLEDGE = [
  {
    id: 'crystal_violet',
    name: 'Crystal Violet',
    aliases: ['crystal violet', 'crystal voilet', 'crystalviolet', 'cv', 'gentian violet', 'basic violet 3', 'hexamethylpararosaniline'],
    typicalPeaks: [590, 545]
  },
  {
    id: 'hemoglobin',
    name: 'Hemoglobin',
    aliases: ['hemoglobin', 'haemoglobin', 'oxyhemoglobin', 'oxyhaemoglobin', 'hbo2', 'hb', 'deoxyhemoglobin', 'deoxyhaemoglobin', 'methaemoglobin', 'methemoglobin', 'carboxyhemoglobin', 'carboxyhaemoglobin', 'human hemoglobin'],
    typicalPeaks: [415, 542, 576]
  },
  {
    id: 'cytochrome_c',
    name: 'Cytochrome C',
    aliases: ['cytochrome c', 'cytochrome-c', 'cyt c', 'cyt-c', 'cytochromec', 'ferrocytochrome', 'ferricytochrome'],
    typicalPeaks: [415, 521, 550]
  },
  {
    id: 'methylene_blue',
    name: 'Methylene Blue',
    aliases: ['methylene blue', 'methylene-blue', 'bleu de méthylène', 'bleu de methylene', 'methylthioninium chloride', 'mb'],
    typicalPeaks: [664, 610, 290]
  },
  {
    id: 'rhodamine_b',
    name: 'Rhodamine B',
    aliases: ['rhodamine b', 'rhodamine-b', 'rhodamine', 'rhb', 'basic violet 10'],
    typicalPeaks: [552, 518]
  },
  {
    id: 'bsa_protein',
    name: 'Bovine Serum Albumin',
    aliases: ['bsa', 'bovine serum albumin', 'serum albumin', 'albumin standard', 'plasma'],
    typicalPeaks: [279]
  },
  {
    id: 'beta_carotene',
    name: 'Beta-Carotene',
    aliases: ['beta carotene', 'beta-carotene', 'b-carotene', 'provitamin a', 'lycopene'],
    typicalPeaks: [450, 425, 478]
  },
  {
    id: 'chlorophyll_a',
    name: 'Chlorophyll a',
    aliases: ['chlorophyll a', 'chlorophyll-a', 'chla', 'chl a', 'chlorophyll'],
    typicalPeaks: [430, 662]
  },
  {
    id: 'chlorophyll_b',
    name: 'Chlorophyll b',
    aliases: ['chlorophyll b', 'chlorophyll-b', 'chlb', 'chl b'],
    typicalPeaks: [453, 642]
  },
  {
    id: 'caffeine',
    name: 'Caffeine',
    aliases: ['caffeine', '1,3,7-trimethylxanthine', 'guaranine', 'caffein'],
    typicalPeaks: [273]
  },
  {
    id: 'paracetamol',
    name: 'Paracetamol',
    aliases: ['paracetamol', 'acetaminophen', 'tylenol', 'apap', '4-acetamidophenol'],
    typicalPeaks: [245]
  },
  {
    id: 'aspirin',
    name: 'Aspirin',
    aliases: ['aspirin', 'acetylsalicylic acid', 'asa'],
    typicalPeaks: [278, 226]
  },
  {
    id: 'ibuprofen',
    name: 'Ibuprofen',
    aliases: ['ibuprofen', 'advil', 'motrin'],
    typicalPeaks: [264, 273]
  },
  {
    id: 'fluorescein',
    name: 'Fluorescein',
    aliases: ['fluorescein', 'uranine', 'acid yellow 73'],
    typicalPeaks: [490, 460]
  },
  {
    id: 'curcumin',
    name: 'Curcumin',
    aliases: ['curcumin', 'turmeric yellow', 'diferuloylmethane'],
    typicalPeaks: [425, 260]
  },
  {
    id: 'riboflavin',
    name: 'Riboflavin',
    aliases: ['riboflavin', 'vitamin b2', 'vit b2'],
    typicalPeaks: [445, 373, 266]
  },
  {
    id: 'coomassie_blue',
    name: 'Coomassie Brilliant Blue',
    aliases: ['coomassie', 'coomassie blue', 'coomassie brilliant blue', 'g-250', 'bradford dye'],
    typicalPeaks: [595, 465]
  },
  {
    id: 'dna',
    name: 'DNA',
    aliases: ['dna', 'deoxyribonucleic acid', 'genomic dna', 'plasmid dna'],
    typicalPeaks: [260]
  },
  {
    id: 'rna',
    name: 'RNA',
    aliases: ['rna', 'ribonucleic acid'],
    typicalPeaks: [260]
  },
  {
    id: 'nadh',
    name: 'NADH',
    aliases: ['nadh', 'reduced nad'],
    typicalPeaks: [340, 260]
  }
];

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else                h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s, v };
}

function classifyPixelColor(r, g, b) {
  // Ignore white/paper background
  if (r > 220 && g > 220 && b > 220) return null;
  const { h, s, v } = rgbToHsv(r, g, b);
  if (v < 0.22 && s < 0.22) return 'black';
  if (s < 0.20) return 'gray';

  if (h >= 345 || h <= 15) return 'red';
  if (h > 15 && h <= 38) return 'orange';
  if (h > 38 && h <= 75) return 'yellow';
  if (h > 75 && h <= 165) return 'green';
  if (h > 165 && h <= 205) return 'cyan';
  if (h > 205 && h <= 265) return 'blue';
  if (h > 265 && h <= 305) return 'purple';
  if (h > 305 && h < 345) return 'magenta';

  return null;
}

/**
 * Normalizes and extracts molecule name from a raw filename.
 */
function extractMoleculeFromFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') return null;

  // Clean filename: remove extensions, paths, random timestamps/hashes
  let clean = path.basename(fileName);
  clean = clean.replace(/\.[a-zA-Z0-9]+$/, ''); // extension
  clean = clean.replace(/spectrum_\d+_\d+/i, '');
  clean = clean.replace(/Screenshot\s*\d{4}-\d{2}-\d{2}\s*\d+/i, '');
  clean = clean.replace(/[\(\)\[\]_,\-]/g, ' ');
  clean = clean.replace(/\s+/g, ' ').trim().toLowerCase();

  for (const mol of MOLECULE_KNOWLEDGE) {
    for (const alias of mol.aliases) {
      const aliasClean = alias.toLowerCase();
      // Match whole words or clean boundaries
      const regex = new RegExp(`\\b${aliasClean.replace('-', '[- ]?')}\\b`, 'i');
      if (regex.test(clean) || clean.includes(aliasClean)) {
        return {
          molecule: mol.name,
          moleculeId: mol.id,
          matchedAlias: alias,
          source: 'filename',
          confidence: 0.90
        };
      }
    }
  }

  return null;
}

/**
 * Extracts molecule names and spectroscopy metadata from OCR text.
 */
function extractMoleculeFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  // Normalize diacritics (e.g. 'méthylène' -> 'methylene')
  const normText = rawText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanText = normText.toLowerCase();

  // 1. Check title/header patterns:
  // e.g. "UV-Vis Absorption Spectrum of Crystal Violet", "Spectre d'absorption du bleu de methylene"
  const titlePatterns = [
    /(?:absorption|absorbance|extinction|fluorescence|emission|spectrum|spectra|spectre\s+d'absorption)\s+(?:of|du|de|for)\s+([a-zA-Z0-9\s\-]+?)(?:\s+(?:in|at|under|with|\(|$|\n))/i,
    /([a-zA-Z0-9\s\-]+?)\s+(?:absorption|absorbance|emission|fluorescence|spectrum|spectra|series|profile)\b/i
  ];

  for (const pattern of titlePatterns) {
    const match = normText.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const candClean = candidate.toLowerCase();
      for (const mol of MOLECULE_KNOWLEDGE) {
        if (mol.aliases.some(a => {
          const aNorm = a.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          return candClean.includes(aNorm) || aNorm.includes(candClean);
        })) {
          return {
            molecule: mol.name,
            moleculeId: mol.id,
            matchedAlias: candidate,
            source: 'title_ocr',
            confidence: 0.95
          };
        }
      }
    }
  }

  // 2. Direct keyword / alias lookup in the normalized text
  for (const mol of MOLECULE_KNOWLEDGE) {
    for (const alias of mol.aliases) {
      const aliasNorm = alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const regex = new RegExp(`\\b${aliasNorm.replace('-', '[- ]?')}\\b`, 'i');
      if (regex.test(cleanText) || cleanText.includes(aliasNorm)) {
        return {
          molecule: mol.name,
          moleculeId: mol.id,
          matchedAlias: alias,
          source: 'text_ocr',
          confidence: 0.85
        };
      }
    }
  }

  // 3. OCR error-tolerant regexes for distorted words
  const fuzzyPatterns = [
    { regex: /r[ho0]+damine?[\s_-]*b?/i, id: 'rhodamine_b', name: 'Rhodamine B' },
    { regex: /bleu\s+de\s+m[e3]thyl[e3]n/i, id: 'methylene_blue', name: 'Methylene Blue' },
    { regex: /cryst[aeio]+l\s*v[oie]+let/i, id: 'crystal_violet', name: 'Crystal Violet' },
    { regex: /h[aae]+moglob/i, id: 'hemoglobin', name: 'Hemoglobin' },
    { regex: /cyto?chrom[e\s_-]*c/i, id: 'cytochrome_c', name: 'Cytochrome C' },
    { regex: /\b1?:?20\s*plasma\b/i, id: 'bsa_protein', name: 'Bovine Serum Albumin' }
  ];

  for (const fp of fuzzyPatterns) {
    if (fp.regex.test(cleanText)) {
      return {
        molecule: fp.name,
        moleculeId: fp.id,
        matchedAlias: fp.name,
        source: 'fuzzy_ocr_match',
        confidence: 0.88
      };
    }
  }

  return null;
}

/**
 * Semantic entity parser for legend text.
 * Extracts individual words, chemical states, concentrations, conditions, and canonical molecule names.
 */
function parseLegendWordsAndEntities(legendText, swatchColor = 'unknown') {
  if (!legendText || typeof legendText !== 'string') {
    return {
      rawText: '',
      cleanedLabel: '',
      words: [],
      matchedMolecule: null,
      matchedMoleculeId: null,
      chemicalState: null,
      concentration: null,
      timeCondition: null,
      phCondition: null,
      swatchColor,
      suggestedCurveName: `Curve (${swatchColor})`
    };
  }

  // 1. Clean raw line text from leading/trailing swatch markers, symbols, and punctuation
  let clean = legendText.replace(/^[|~.:;,\s—–\-•*+=_/\\]+/, '').trim();
  clean = clean.replace(/[|~—–\-•*+=_/\\]+$/, '').trim();

  // 2. OCR typo normalization for spectroscopic and chemical terms
  let normalized = clean;
  normalized = normalized.replace(/\bToe\s+Ro[o0]damina\s*B\b/gi, 'Rhodamine B');
  normalized = normalized.replace(/\bRo[o0]damina?[\s_-]*B\b/gi, 'Rhodamine B');
  normalized = normalized.replace(/\bOxyh[aae]+moglob[a-z]*\b/gi, 'Oxyhemoglobin');
  normalized = normalized.replace(/\bDeoxyh[aae]+moglob[a-z]*\b/gi, 'Deoxyhemoglobin');
  normalized = normalized.replace(/\bCarboxyh[aae]+moglob[a-z]*\b/gi, 'Carboxyhemoglobin');
  normalized = normalized.replace(/\bMeth[aae]+moglob[a-z]*\b/gi, 'Methemoglobin');
  normalized = normalized.replace(/\bH[aae]+moglob[a-z]*\b/gi, 'Hemoglobin');
  normalized = normalized.replace(/\bHb\s+oxy[a-z]*\b/gi, 'Hb Oxygenated');
  normalized = normalized.replace(/\bHb\s+deoxy[a-z]*\b/gi, 'Hb Deoxygenated');
  normalized = normalized.replace(/\bCyto?chrom[e\s_-]*c\b/gi, 'Cytochrome C');
  normalized = normalized.replace(/\bConc\s+of\s+CV\b/gi, 'Concentration of Crystal Violet');
  normalized = normalized.replace(/\bamg\/mL\b/gi, '4 mg/mL');
  normalized = normalized.replace(/\b\\ater\b/gi, 'Water');

  // 3. Extract Concentration (e.g. 1 mg/mL, 8 mg/mL, 10 µM, 50 ppm, 1:20 Plasma)
  const concRegex = /(\b\d+(?:\.\d+)?\s*(?:mg\/mL|µg\/mL|ug\/mL|mg\/L|g\/L|µM|uM|mM|M|ppm|ppb|%|wt%|vol%)\b|\b1\s*:\s*\d+\s*(?:plasma|dilution|serum)?\b)/i;
  const concMatch = normalized.match(concRegex);
  const concentration = concMatch ? concMatch[0].trim() : null;

  // 4. Extract Chemical State / Derivative (e.g. oxy, deoxy, carboxy, met, ferro, ferri, oxidized, reduced)
  const stateRegex = /\b(oxygenated|deoxygenated|oxy|deoxy|carboxy|met|ferro|ferri|ferric|ferrous|oxidized|reduced|native|denatured|cis|trans|protonated|deprotonated)\b/i;
  const stateMatch = normalized.match(stateRegex);
  const chemicalState = stateMatch ? (stateMatch[0].charAt(0).toUpperCase() + stateMatch[0].slice(1).toLowerCase()) : null;

  // 5. Extract Time Condition (e.g. 5 min, 10 min, 2 h)
  const timeRegex = /\b(\d+\s*(?:min|mins|minute|minutes|h|hr|hrs|hour|hours|s|sec|seconds|days|d))\b/i;
  const timeMatch = normalized.match(timeRegex);
  const timeCondition = timeMatch ? timeMatch[0].trim() : null;

  // 6. Extract pH Condition (e.g. pH 7.4)
  const phRegex = /\b(pH\s*\d+(?:\.\d+)?)\b/i;
  const phMatch = normalized.match(phRegex);
  const phCondition = phMatch ? phMatch[0].trim() : null;

  // 7. Match Canonical Target Molecule from extensive knowledge base
  let matchedMolecule = null;
  let matchedMoleculeId = null;
  const lowerNorm = normalized.toLowerCase();

  for (const mol of MOLECULE_KNOWLEDGE) {
    for (const alias of mol.aliases) {
      const aliasClean = alias.toLowerCase();
      const regex = new RegExp(`\\b${aliasClean.replace('-', '[- ]?')}\\b`, 'i');
      if (regex.test(lowerNorm) || lowerNorm.includes(aliasClean)) {
        matchedMolecule = mol.name;
        matchedMoleculeId = mol.id;
        break;
      }
    }
    if (matchedMolecule) break;
  }

  // Solvent / Baseline detection
  const isSolvent = /\b(solvent|baseline|blank|water|hexane|buffer|control|reference)\b/i.test(normalized);
  if (!matchedMolecule && isSolvent) {
    matchedMolecule = 'Solvent / Baseline';
    matchedMoleculeId = 'solvent_baseline';
  }

  // 8. Tokenize Words
  const words = normalized
    .split(/[\s,;:|~/\\]+/)
    .map(w => w.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ''))
    .filter(w => w.length > 0);

  // 9. Build Human-Readable Suggested Curve Name
  let suggestedCurveName = normalized;
  const colCapitalized = swatchColor ? swatchColor.charAt(0).toUpperCase() + swatchColor.slice(1) : '';

  if (matchedMolecule && matchedMolecule !== 'Solvent / Baseline') {
    if (chemicalState && !normalized.toLowerCase().includes(chemicalState.toLowerCase())) {
      suggestedCurveName = `${chemicalState} ${matchedMolecule}`;
    } else if (concentration && !normalized.toLowerCase().includes(concentration.toLowerCase())) {
      suggestedCurveName = `${concentration} ${matchedMolecule}`;
    } else if (normalized.length <= 40) {
      suggestedCurveName = normalized;
    } else {
      suggestedCurveName = matchedMolecule;
    }
  } else if (isSolvent) {
    suggestedCurveName = 'Solvent Baseline';
  }

  // Add color suffix for clarity if not already in string
  if (colCapitalized && !suggestedCurveName.toLowerCase().includes(swatchColor.toLowerCase())) {
    suggestedCurveName = `${suggestedCurveName} (${colCapitalized})`;
  }

  return {
    rawText: legendText,
    cleanedLabel: normalized,
    words,
    matchedMolecule,
    matchedMoleculeId,
    chemicalState,
    concentration,
    timeCondition,
    phCondition,
    swatchColor,
    suggestedCurveName
  };
}

/**
 * Detects legend items and matches their visual colors (swatch or colored text).
 */
function detectLegends(bitmap, ocrData) {
  if (!ocrData || !ocrData.lines || !Array.isArray(ocrData.lines)) {
    return [];
  }

  const detectedLegends = [];
  const W = bitmap.width;
  const H = bitmap.height;

  // Words or phrases to exclude from legends (axes, ticks, common UI labels)
  const stopWords = ['wavelength', 'absorbance', 'intensity', 'optical', 'density', 'arbitrary', 'units', 'nm', 'a.u', 'cm-1', 'wavenumber', 'x-axis', 'y-axis'];

  // Keep track of colors already paired with non-black labels to prevent duplicate black-text entries
  const matchedNonBlackColors = new Set();

  for (const line of ocrData.lines) {
    const rawLineText = (line.text || '').trim();
    if (!rawLineText || rawLineText.length < 2) continue;

    const lower = rawLineText.toLowerCase();
    if (stopWords.some(sw => lower === sw || lower.startsWith(sw + ' '))) continue;
    // Skip pure numbers or axis ticks
    if (/^[\d\s.,\-+eE]+$/.test(rawLineText)) continue;

    // Check each word in line or whole line
    const words = line.words || [line];
    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const word = words[wIdx];
      const wordText = (word.text || '').trim();
      if (!wordText || wordText.length < 2) continue;

      const bbox = word.bbox;
      if (!bbox) continue;

      // Skip words that are clearly bottom x-axis ticks or left y-axis ticks
      if (bbox.y0 > H * 0.85 && /^\d+$/.test(wordText)) continue;
      if (bbox.x1 < W * 0.15 && /^\d+([.]\d+)?$/.test(wordText)) continue;

      // Filter out single/double character OCR noise artifacts
      const cleanAlphaWord = wordText.replace(/[^a-zA-Z0-9]/g, '');
      if (cleanAlphaWord.length < 2 && !['cv', 'hb', 'mb', 'ph'].includes(cleanAlphaWord.toLowerCase())) {
        continue;
      }

      // 1. Text Pixel Colors
      const textColors = {};
      let totalTextPixels = 0;
      for (let y = Math.max(0, bbox.y0); y <= Math.min(H - 1, bbox.y1); y++) {
        for (let x = Math.max(0, bbox.x0); x <= Math.min(W - 1, bbox.x1); x++) {
          const idx = (y * W + x) * 4;
          const col = classifyPixelColor(bitmap.data[idx], bitmap.data[idx+1], bitmap.data[idx+2]);
          if (col && col !== 'gray') {
            textColors[col] = (textColors[col] || 0) + 1;
            totalTextPixels++;
          }
        }
      }

      // 2. Swatch Pixel Colors immediately to the left of the word (5px to 55px left)
      const swatchColors = {};
      let totalSwatchPixels = 0;
      const leftStart = Math.max(0, bbox.x0 - 55);
      const leftEnd = Math.max(0, bbox.x0 - 3);
      for (let y = Math.max(0, bbox.y0 - 2); y <= Math.min(H - 1, bbox.y1 + 2); y++) {
        for (let x = leftStart; x <= leftEnd; x++) {
          const idx = (y * W + x) * 4;
          const col = classifyPixelColor(bitmap.data[idx], bitmap.data[idx+1], bitmap.data[idx+2]);
          if (col && col !== 'gray') {
            swatchColors[col] = (swatchColors[col] || 0) + 1;
            totalSwatchPixels++;
          }
        }
      }

      // 3. Check if preceding word was a swatch token (e.g. '—', '-', '•', etc.)
      let prevWordColor = null;
      if (wIdx > 0) {
        const prevW = words[wIdx - 1];
        const prevText = (prevW.text || '').trim();
        if (/^[-—–•*+=|~/\\]+$/.test(prevText)) {
          const prevColors = {};
          for (let y = Math.max(0, prevW.bbox.y0); y <= Math.min(H - 1, prevW.bbox.y1); y++) {
            for (let x = Math.max(0, prevW.bbox.x0); x <= Math.min(W - 1, prevW.bbox.x1); x++) {
              const idx = (y * W + x) * 4;
              const col = classifyPixelColor(bitmap.data[idx], bitmap.data[idx+1], bitmap.data[idx+2]);
              if (col && col !== 'gray' && col !== 'black') {
                prevColors[col] = (prevColors[col] || 0) + 1;
              }
            }
          }
          const sorted = Object.entries(prevColors).sort((a, b) => b[1] - a[1]);
          if (sorted.length > 0 && sorted[0][1] >= 12) {
            prevWordColor = sorted[0][0];
          }
        }
      }

      // Determine dominant non-black/non-gray color
      let detectedColor = null;

      // Priority A: Preceding symbol swatch color
      if (prevWordColor) {
        detectedColor = prevWordColor;
      }

      // Priority B: Left swatch line/marker
      if (!detectedColor) {
        const nonBlackSwatch = Object.entries(swatchColors)
          .filter(([c]) => c !== 'black')
          .sort((a, b) => b[1] - a[1]);
        if (nonBlackSwatch.length > 0 && nonBlackSwatch[0][1] >= 12) {
          detectedColor = nonBlackSwatch[0][0];
        }
      }

      // Priority C: Colored text itself (like 'Haemoglobin' in blue, 'Oxyhaemoglobin' in red)
      if (!detectedColor) {
        const nonBlackText = Object.entries(textColors)
          .filter(([c]) => c !== 'black')
          .sort((a, b) => b[1] - a[1]);
        if (nonBlackText.length > 0 && nonBlackText[0][1] >= 20) {
          detectedColor = nonBlackText[0][0];
        }
      }

      // If text is black and line swatch is explicitly black (e.g. true black curve in legend)
      if (!detectedColor && swatchColors['black'] >= 25 && !matchedNonBlackColors.has('black')) {
        detectedColor = 'black';
      }

      if (detectedColor) {
        // Build candidate label: if part of a multi-word line, clean it up
        let labelText = rawLineText;
        labelText = labelText.replace(/^[\d\s—–\-•*+=|~/\\]+/, '').trim();

        // Suppress very short noise words (e.g. "As", "jy", "pa", "Fa", "[I")
        const cleanLetters = labelText.replace(/[^a-zA-Z]/g, '');
        if (cleanLetters.length < 3 && !['cv', 'hb', 'mb', 'ph'].includes(cleanLetters.toLowerCase())) {
          continue;
        }

        // Semantic entity decomposition & curve name suggestion
        const parsed = parseLegendWordsAndEntities(labelText, detectedColor);

        // Deduplication: Avoid duplicate colors with identical labels
        const exists = detectedLegends.find(l =>
          (l.color === detectedColor && l.label.toLowerCase() === parsed.cleanedLabel.toLowerCase()) ||
          (l.label.toLowerCase() === parsed.cleanedLabel.toLowerCase() && l.color !== 'black' && detectedColor === 'black')
        );

        if (!exists && parsed.cleanedLabel.length >= 2) {
          if (detectedColor !== 'black') {
            matchedNonBlackColors.add(detectedColor);
          }
          detectedLegends.push({
            color: detectedColor,
            label: parsed.cleanedLabel,
            rawText: rawLineText,
            words: parsed.words,
            matchedMolecule: parsed.matchedMolecule,
            matchedMoleculeId: parsed.matchedMoleculeId,
            chemicalState: parsed.chemicalState,
            concentration: parsed.concentration,
            timeCondition: parsed.timeCondition,
            phCondition: parsed.phCondition,
            suggestedCurveName: parsed.suggestedCurveName,
            bbox: bbox
          });
        }
      }
    }
  }

  return detectedLegends;
}

/**
 * Multimodal Gemini Vision API Call for pristine molecule name diagnosis & legend OCR.
 */
async function callGeminiVisionLegendExtractor(imageBuffer, apiKey) {
  if (!apiKey || !imageBuffer) return null;

  const base64 = imageBuffer.toString('base64');
  const prompt = `You are an expert analytical chemist and spectroscopic graph digitizer assistant.
Your ONLY task is to diagnose the molecular identities, chemical species, legend labels, and metadata from this graph image to assist curve digitizing.
Do NOT attempt to output (x, y) plot coordinates. Focus solely on:
1. Chart title and overall target molecule / analyte family (e.g. Hemoglobin, Crystal Violet, Cytochrome C, Rhodamine B, Chlorophyll, etc.).
2. Legend items and curve color / pattern associations:
   Carefully examine the legend box or text keys. Look at the exact color swatch, line marker, and dash/dot style next to each species name:
   For each curve, detect:
   - color: exact primary visual color of the line/swatch (use lowercase: 'red', 'blue', 'green', 'cyan', 'purple', 'magenta', 'orange', 'yellow', 'black')
   - alternateColors: optional array of secondary or ambiguous color names (e.g. ['purple', 'black'] or ['magenta', 'orange', 'pink'] or ['cyan', 'blue'])
   - linePattern: visual style/pattern of the curve line (use lowercase: 'solid', 'dashed', 'dotted', 'dash-dot')
   - rawLabel: the exact text appearing in the legend beside the swatch
   - moleculeName: standard canonical scientific molecule name
   - species: specific chemical state/derivative (e.g. 'Oxyhaemoglobin', 'Deoxyhaemoglobin', 'Carboxyhaemoglobin', 'Methaemoglobin', etc.)
   - chemicalState: state descriptor ('Oxy', 'Deoxy', 'Carboxy', 'Met', 'Oxidized', 'Reduced', etc. or null)
   - concentration: concentration if specified or null
   - suggestedCurveName: a clean human-friendly name (e.g. 'Oxyhaemoglobin (Red)')
   Note: Scientific graphs can distinguish curves by color, by line patterns (dashed, dotted, solid), or even in all black with different line styles. Identify both color and pattern accurately.
3. Axis metadata & Plot bounding box:
   - plotBox: percentage (0-100) coordinates of the plot frame enclosing the curve data
     - leftPercent: horizontal % where vertical Y-axis line sits (usually 8-20)
     - rightPercent: horizontal % where X-axis ends on the right (usually 80-96)
     - topPercent: vertical % where highest Y-axis boundary or top frame sits (usually 5-25)
     - bottomPercent: vertical % where bottom horizontal X-axis line sits (usually 75-92)
   - xAxis: label, min numeric value, max numeric value, unit, scaleType ('linear' or 'log')
   - yAxis: label, min numeric value, max numeric value, unit, scaleType ('linear' or 'log')

Return strictly valid JSON with this exact schema:
{
  "plotBox": {
    "leftPercent": 12.0,
    "rightPercent": 92.0,
    "topPercent": 8.0,
    "bottomPercent": 82.0
  },
  "chartTitle": "string",
  "targetMolecule": "string",
  "targetMoleculeId": "string",
  "curves": [
    {
      "color": "red, blue, green, cyan, purple, magenta, orange, yellow, or black",
      "alternateColors": ["string"],
      "linePattern": "solid, dashed, dotted, or dash-dot",
      "rawLabel": "string",
      "moleculeName": "string",
      "species": "string",
      "chemicalState": "string or null",
      "concentration": "string or null",
      "suggestedCurveName": "string"
    }
  ],
  "xAxis": { "label": "string", "min": 0, "max": 0, "unit": "string", "scaleType": "linear" },
  "yAxis": { "label": "string", "min": 0, "max": 0, "unit": "string", "scaleType": "linear" }
}`;

  const payload = JSON.stringify({
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: 'image/png', data: base64 } }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json'
    }
  });

  const models = ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];

  for (const model of models) {
    try {
      const res = await new Promise(resolve => {
        const req = https.request({
          hostname: 'generativelanguage.googleapis.com',
          path: `/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: 25000
        }, r => {
          let body = '';
          r.on('data', chunk => body += chunk);
          r.on('end', () => {
            if (r.statusCode >= 200 && r.statusCode < 300) {
              try {
                const parsed = JSON.parse(body);
                let text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  text = text.trim();
                  if (text.startsWith('```')) {
                    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
                  }
                  let diagnosis = null;
                  try {
                    diagnosis = JSON.parse(text);
                  } catch (e1) {
                    try {
                      const fixed = text.replace(/,\s*([\]}])/g, '$1');
                      diagnosis = JSON.parse(fixed);
                    } catch (e2) {
                      const start = text.indexOf('{');
                      const end = text.lastIndexOf('}');
                      if (start !== -1 && end !== -1 && end > start) {
                        const sub = text.slice(start, end + 1).replace(/,\s*([\]}])/g, '$1');
                        diagnosis = JSON.parse(sub);
                      } else {
                        throw e1;
                      }
                    }
                  }
                  if (diagnosis) return resolve(diagnosis);
                }
              } catch (err) {
                console.warn(`[Gemini Vision ${model}] JSON parse error:`, err.message);
              }
            } else {
              console.warn(`[Gemini Vision ${model}] Status ${r.statusCode}:`, body.slice(0, 200));
            }
            resolve(null);
          });
        });

        req.on('error', err => {
          console.warn(`[Gemini Vision ${model}] Network error:`, err.message);
          resolve(null);
        });
        req.on('timeout', () => {
          req.destroy();
          console.warn(`[Gemini Vision ${model}] Request timed out (25s).`);
          resolve(null);
        });

        req.write(payload);
        req.end();
      });

      if (res && res.curves && res.curves.length > 0) {
        console.log(`[Gemini Vision] Successfully diagnosed graph with model ${model}.`);
        return res;
      }
    } catch (e) {
      console.warn(`[Gemini Vision ${model}] Exception:`, e.message);
    }
  }

  return null;
}

/**
 * End-to-end multi-modal extraction coordinator.
 */
async function extractMetadataAndLegends(imageSource, fileName = '') {
  loadEnvIfNeeded();
  const apiKey = process.env.GEMINI_API_KEY;

  let jimpImg = null;
  let imageBuf = null;

  if (Buffer.isBuffer(imageSource)) {
    imageBuf = imageSource;
    try { jimpImg = await Jimp.read(imageSource); } catch(e){}
  } else if (typeof imageSource === 'string') {
    try {
      jimpImg = await Jimp.read(imageSource);
      imageBuf = await jimpImg.getBufferAsync(Jimp.MIME_PNG);
    } catch(e){}
  } else if (imageSource && imageSource.bitmap) {
    jimpImg = imageSource;
    try { imageBuf = await jimpImg.getBufferAsync(Jimp.MIME_PNG); } catch(e){}
  }

  const result = {
    targetMolecule: null,
    targetId: null,
    confidence: 0.0,
    source: 'none',
    inferredTitle: '',
    legends: [],
    curveColorMap: {},
    rawOcrText: '',
    detectedPeaks: []
  };

  // 1. Extract from File Name
  const fnMatch = extractMoleculeFromFileName(fileName);
  if (fnMatch) {
    result.targetMolecule = fnMatch.molecule;
    result.targetId = fnMatch.moleculeId;
    result.confidence = fnMatch.confidence;
    result.source = fnMatch.source;
  }

  // 1b. Gemini Multimodal Vision API for pristine molecular diagnosis & legend OCR
  if (apiKey && imageBuf) {
    try {
      const geminiResult = await callGeminiVisionLegendExtractor(imageBuf, apiKey);
      if (geminiResult && geminiResult.curves && geminiResult.curves.length > 0) {
        const legends = [];
        const curveColorMap = {};
        const moleculeCandidates = new Map();

        const canonicalTarget = geminiResult.targetMolecule || (fnMatch ? fnMatch.molecule : 'Unknown');
        let matchedMol = MOLECULE_KNOWLEDGE.find(m =>
          m.name.toLowerCase() === canonicalTarget.toLowerCase() ||
          m.aliases.some(a => a.toLowerCase() === canonicalTarget.toLowerCase())
        );

        result.targetMolecule = matchedMol ? matchedMol.name : canonicalTarget;
        result.targetId = matchedMol ? matchedMol.id : canonicalTarget.toLowerCase().replace(/[^a-z0-9]/g, '_');
        result.confidence = 0.99;
        result.source = 'gemini_multimodal_vision';
        result.inferredTitle = geminiResult.chartTitle || '';

        // Extract and validate plot bounding box
        if (geminiResult.plotBox && typeof geminiResult.plotBox.leftPercent === 'number' && typeof geminiResult.plotBox.rightPercent === 'number') {
          const pb = geminiResult.plotBox;
          if (pb.leftPercent < pb.rightPercent && pb.topPercent < pb.bottomPercent) {
            result.plotBox = {
              leftPercent: Math.max(0, Math.min(95, pb.leftPercent)),
              rightPercent: Math.max(pb.leftPercent + 10, Math.min(100, pb.rightPercent)),
              topPercent: Math.max(0, Math.min(90, pb.topPercent)),
              bottomPercent: Math.max(pb.topPercent + 10, Math.min(100, pb.bottomPercent))
            };
          }
        }

        // Clean and sanitize axisInfo
        const cleanAxis = (ax, defMin, defMax, defLabel) => {
          if (!ax) return { min: defMin, max: defMax, label: defLabel, unit: '', scaleType: 'linear' };
          let min = (typeof ax.min === 'number' && !isNaN(ax.min)) ? ax.min : defMin;
          let max = (typeof ax.max === 'number' && !isNaN(ax.max) && ax.max > min) ? ax.max : defMax;
          let scaleType = (ax.scaleType === 'log' || (ax.label && /log/i.test(ax.label))) ? 'log' : 'linear';
          return {
            label: ax.label || defLabel,
            min: min,
            max: max,
            unit: ax.unit || '',
            scaleType: scaleType
          };
        };

        result.axisInfo = {
          xAxis: cleanAxis(geminiResult.xAxis, 200, 800, 'Wavelength'),
          yAxis: cleanAxis(geminiResult.yAxis, 0, 1.0, 'Absorbance')
        };

        if (result.targetMolecule && result.targetMolecule !== 'Unknown') {
          moleculeCandidates.set(result.targetMolecule, {
            molecule: result.targetMolecule,
            source: 'gemini_vision_chart_title',
            confidence: 0.99
          });
        }

        geminiResult.curves.forEach((c) => {
          let col = (c.color || 'blue').toLowerCase();
          if (col === 'pink') col = 'magenta';
          const linePattern = (c.linePattern || 'solid').toLowerCase();
          const rawLabel = c.rawLabel || c.species || c.moleculeName || col;
          const cleanSpecies = c.species || c.moleculeName || rawLabel;
          const words = (rawLabel + ' ' + cleanSpecies).split(/[\s,;:|~/\\]+/).filter(w => w.length > 1);

          const legItem = {
            color: col,
            alternateColors: c.alternateColors || [],
            linePattern: linePattern,
            lineStyle: linePattern.charAt(0).toUpperCase() + linePattern.slice(1),
            label: rawLabel,
            rawText: rawLabel,
            words: Array.from(new Set(words)),
            matchedMolecule: c.moleculeName || result.targetMolecule,
            matchedMoleculeId: (c.moleculeName || result.targetMolecule || '').toLowerCase().replace(/[^a-z0-9]/g, '_'),
            chemicalState: c.chemicalState || null,
            concentration: c.concentration || null,
            suggestedCurveName: c.suggestedCurveName || cleanSpecies,
            isTarget: Boolean(
              (cleanSpecies && result.targetMolecule && cleanSpecies.toLowerCase().includes(result.targetMolecule.toLowerCase())) ||
              (c.chemicalState && ['oxy', 'target', 'standard'].includes(c.chemicalState.toLowerCase()))
            )
          };

          legends.push(legItem);

          const colorMapping = {
            name: legItem.suggestedCurveName,
            rawLabel: legItem.label,
            words: legItem.words,
            species: cleanSpecies,
            color: col,
            linePattern: linePattern,
            lineStyle: legItem.lineStyle,
            chemicalState: legItem.chemicalState,
            concentration: legItem.concentration,
            isTarget: legItem.isTarget
          };

          curveColorMap[col] = colorMapping;

          // Store pattern-based lookup keys so dashed/dotted curves match even if monochrome or dark
          if (linePattern && linePattern !== 'solid') {
            curveColorMap[linePattern] = colorMapping;
            curveColorMap[`${col}_${linePattern}`] = colorMapping;
            if (col === 'black' || col === 'dark' || col === 'gray' || col === 'purple') {
              curveColorMap['dashed'] = colorMapping;
            }
          }

          // Map alternate / ambiguous colors (e.g. if purple might be detected as black or magenta by CV)
          if (Array.isArray(c.alternateColors)) {
            c.alternateColors.forEach(alt => {
              let altCol = alt.toLowerCase();
              if (altCol === 'pink') altCol = 'magenta';
              if (!curveColorMap[altCol]) {
                curveColorMap[altCol] = { ...colorMapping, color: altCol };
              }
            });
          }

          if (cleanSpecies) {
            moleculeCandidates.set(cleanSpecies, {
              molecule: cleanSpecies,
              source: 'gemini_vision_legend',
              confidence: 0.99,
              swatchColor: col,
              linePattern: linePattern,
              curveLabel: legItem.suggestedCurveName
            });
          }
        });

        // Add standard color aliases to prevent mismatch between human legend and CV hue buckets
        if (curveColorMap['purple'] && !curveColorMap['magenta']) {
          curveColorMap['magenta'] = { ...curveColorMap['purple'], color: 'magenta' };
        }
        if (curveColorMap['magenta'] && !curveColorMap['purple']) {
          curveColorMap['purple'] = { ...curveColorMap['magenta'], color: 'purple' };
        }
        if (curveColorMap['black'] && !curveColorMap['purple']) {
          curveColorMap['purple'] = { ...curveColorMap['black'], color: 'purple' };
        }
        if (curveColorMap['purple'] && !curveColorMap['black']) {
          curveColorMap['black'] = { ...curveColorMap['purple'], color: 'black' };
        }
        if (curveColorMap['magenta'] && !curveColorMap['orange']) {
          curveColorMap['orange'] = { ...curveColorMap['magenta'], color: 'orange' };
        }
        if (curveColorMap['orange'] && !curveColorMap['magenta']) {
          curveColorMap['magenta'] = { ...curveColorMap['orange'], color: 'magenta' };
        }

        // Methaemoglobin alias handling: Met is frequently plotted as dashed or dark/black/purple
        const metLeg = legends.find(l => (l.species || l.label || '').toLowerCase().includes('met'));
        if (metLeg) {
          const metMap = curveColorMap[metLeg.color] || {
            name: metLeg.suggestedCurveName,
            rawLabel: metLeg.label,
            words: metLeg.words,
            species: metLeg.matchedMolecule || 'Methaemoglobin',
            color: metLeg.color,
            linePattern: metLeg.linePattern,
            lineStyle: metLeg.lineStyle,
            chemicalState: 'Met',
            isTarget: false
          };
          if (!curveColorMap['dashed']) curveColorMap['dashed'] = metMap;
          if (!curveColorMap['black']) curveColorMap['black'] = { ...metMap, color: 'black' };
          if (!curveColorMap['purple']) curveColorMap['purple'] = { ...metMap, color: 'purple' };
        }

        result.legends = legends;
        result.curveColorMap = curveColorMap;
        result.suggestedTargetMolecules = Array.from(moleculeCandidates.values());

        return result;
      }
    } catch (gErr) {
      console.warn('[LegendExtractor] Gemini Vision call failed, falling back to local OCR:', gErr.message);
    }
  }

  if (!jimpImg || !Tesseract) {
    return result;
  }

  // 2. Perform OCR on image
  let ocrData = null;
  try {
    const buf = await jimpImg.getBufferAsync(Jimp.MIME_PNG);
    const ocrRes = await Tesseract.recognize(buf, 'eng', { logger: () => {} });
    ocrData = ocrRes.data;
    result.rawOcrText = ocrData.text || '';
  } catch (ocrErr) {
    console.warn('[LegendExtractor] OCR failed:', ocrErr.message);
  }

  if (!ocrData) return result;

  // 3. Extract from OCR Text (Title, Headers)
  const textMatch = extractMoleculeFromText(result.rawOcrText);
  if (textMatch) {
    // If text match has higher confidence or complements filename
    if (!result.targetMolecule || textMatch.confidence > result.confidence) {
      result.targetMolecule = textMatch.molecule;
      result.targetId = textMatch.moleculeId;
      result.confidence = textMatch.confidence;
      result.source = textMatch.source;
    } else if (result.targetMolecule === textMatch.molecule) {
      // Both filename and OCR agree! Boost confidence
      result.confidence = 0.98;
      result.source = 'consensus_filename_and_ocr';
    }
  }

  // 4. Extract Peak Annotations from Text (e.g. "590 nm", "664 nm", "314 nm")
  const peakMatches = result.rawOcrText.match(/(\b\d{3}\b)\s*nm/gi);
  if (peakMatches) {
    result.detectedPeaks = peakMatches.map(p => parseInt(p.replace(/\D/g, ''), 10));
  }

  // 5. Detect Legends and Color Swatches
  const legends = detectLegends(jimpImg.bitmap, ocrData);
  result.legends = legends;

  // Collect all candidate molecule names discovered from legends, title, and text
  const moleculeCandidates = new Map();

  // If filename found a molecule
  if (fnMatch && fnMatch.molecule) {
    moleculeCandidates.set(fnMatch.molecule, {
      molecule: fnMatch.molecule,
      source: 'filename',
      confidence: fnMatch.confidence
    });
  }

  // If text found a molecule
  if (textMatch && textMatch.molecule) {
    moleculeCandidates.set(textMatch.molecule, {
      molecule: textMatch.molecule,
      source: textMatch.source,
      confidence: textMatch.confidence
    });
  }

  // If legends found molecules
  legends.forEach(leg => {
    if (leg.matchedMolecule && leg.matchedMolecule !== 'Solvent / Baseline') {
      moleculeCandidates.set(leg.matchedMolecule, {
        molecule: leg.matchedMolecule,
        source: 'legend_swatch',
        confidence: 0.99,
        swatchColor: leg.color,
        curveLabel: leg.suggestedCurveName || leg.label
      });
    }
  });

  result.suggestedTargetMolecules = Array.from(moleculeCandidates.values())
    .sort((a, b) => b.confidence - a.confidence);

  // If legend explicitly mentions a molecule, that is our strongest target evidence
  const molFromLegend = legends.find(l => l.matchedMolecule && l.matchedMolecule !== 'Solvent / Baseline');
  if (molFromLegend) {
    result.targetMolecule = molFromLegend.matchedMolecule;
    const molObj = MOLECULE_KNOWLEDGE.find(m => m.name === molFromLegend.matchedMolecule);
    if (molObj) result.targetId = molObj.id;
    result.confidence = 0.99;
    result.source = 'legend_color_swatch';
  }

  // 6. Build Curve Color Mapping for downstream curve renaming
  legends.forEach(leg => {
    const isTarget = (leg.matchedMolecule && leg.matchedMolecule === result.targetMolecule) ||
                     (leg.label.toLowerCase().includes('target') || leg.label.toLowerCase().includes('standard'));
    result.curveColorMap[leg.color] = {
      name: leg.suggestedCurveName || leg.label,
      rawLabel: leg.label,
      words: leg.words || [],
      species: leg.matchedMolecule || leg.label,
      color: leg.color,
      chemicalState: leg.chemicalState,
      concentration: leg.concentration,
      isTarget: Boolean(isTarget)
    };
  });

  return result;
}

/**
 * Binds extracted legend names to digitized curves.
 * Transforms generic 'red_curve_1' into 'Hb oxygenated (Red)' or 'Oxyhaemoglobin (Red)'.
 */
function bindLegendsToCurves(curves, legendColorMap) {
  if (!curves || !Array.isArray(curves) || !legendColorMap) return curves;

  const bound = curves.map(curve => {
    const col = (curve.color || '').toLowerCase();
    const style = (curve.lineStyle || '').toLowerCase();

    // 1. Try compound pattern key (e.g. "black_dashed") or direct pattern key (e.g. "dashed")
    let mapping = null;
    if (style && style !== 'solid') {
      mapping = legendColorMap[`${col}_${style}`] || legendColorMap[style];
    }
    // 2. Direct color match
    if (!mapping) {
      mapping = legendColorMap[col];
    }
    // 3. Color and pattern aliases
    if (!mapping) {
      if (col === 'purple') mapping = legendColorMap['magenta'] || legendColorMap['black'] || legendColorMap['violet'];
      else if (col === 'magenta') mapping = legendColorMap['purple'] || legendColorMap['orange'];
      else if (col === 'black') mapping = (style === 'dashed' ? legendColorMap['dashed'] : null) || legendColorMap['purple'] || legendColorMap['blue'];
      else if (col === 'cyan') mapping = legendColorMap['blue'];
      else if (col === 'orange') mapping = legendColorMap['yellow'] || legendColorMap['red'];
    }
    // 4. Style fallback for dashed curves
    if (!mapping && style === 'dashed') {
      mapping = legendColorMap['dashed'] || legendColorMap['black'] || legendColorMap['purple'];
    }

    if (mapping && (mapping.name || mapping.rawLabel)) {
      return {
        ...curve,
        name: mapping.name || mapping.rawLabel,
        legendLabel: mapping.rawLabel || mapping.name,
        species: mapping.species || mapping.name,
        chemicalState: mapping.chemicalState || null,
        concentration: mapping.concentration || null,
        linePattern: mapping.linePattern || curve.lineStyle,
        isTarget: Boolean(mapping.isTarget)
      };
    }
    return curve;
  });

  // Ensure 1 curve per recognized molecular species/name
  const seen = new Map();
  for (const c of bound) {
    const key = (c.species || c.name || '').toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, c);
    } else {
      const existing = seen.get(key);
      if (c.data && existing.data && c.data.length > existing.data.length) {
        seen.set(key, c);
      }
    }
  }
  return Array.from(seen.values());
}

module.exports = {
  MOLECULE_KNOWLEDGE,
  extractMoleculeFromFileName,
  extractMoleculeFromText,
  parseLegendWordsAndEntities,
  detectLegends,
  extractMetadataAndLegends,
  bindLegendsToCurves,
  callGeminiVisionLegendExtractor
};
