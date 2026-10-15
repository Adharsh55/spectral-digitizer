const Jimp = require('jimp');
const Tesseract = require('tesseract.js');
const path = require('path');

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

function classifyColor(r, g, b) {
  if (r > 220 && g > 220 && b > 220) return null; // white/bg
  const { h, s, v } = rgbToHsv(r, g, b);
  if (v < 0.25 && s < 0.25) return 'black';
  if (s < 0.20) return 'gray';
  if (h >= 345 || h <= 15) return 'red';
  if (h > 15 && h <= 38) return 'orange';
  if (h > 38 && h <= 75) return 'yellow';
  if (h > 75 && h <= 165) return 'green';
  if (h > 165 && h <= 205) return 'cyan';
  if (h > 205 && h <= 265) return 'blue';
  if (h > 265 && h <= 310) return 'purple';
  if (h > 310 && h < 345) return 'magenta';
  return null;
}

async function testWordColors(imgPath) {
  console.log(`\nAnalyzing word colors for: ${path.basename(imgPath)}`);
  const img = await Jimp.read(imgPath);
  const buf = await img.getBufferAsync(Jimp.MIME_PNG);
  const res = await Tesseract.recognize(buf, 'eng', { logger: () => {} });

  for (const line of res.data.lines) {
    const text = line.text.trim();
    if (!text || text.length < 3) continue;

    const bbox = line.bbox;
    // 1. Check text pixel colors
    const textColors = {};
    for (let y = bbox.y0; y <= bbox.y1; y++) {
      for (let x = bbox.x0; x <= bbox.x1; x++) {
        const idx = (y * img.bitmap.width + x) * 4;
        const col = classifyColor(img.bitmap.data[idx], img.bitmap.data[idx+1], img.bitmap.data[idx+2]);
        if (col && col !== 'gray') {
          textColors[col] = (textColors[col] || 0) + 1;
        }
      }
    }

    // 2. Check swatch pixels to the left of the text (e.g. 5px to 45px left)
    const swatchColors = {};
    const leftStart = Math.max(0, bbox.x0 - 45);
    const leftEnd = Math.max(0, bbox.x0 - 4);
    for (let y = bbox.y0; y <= bbox.y1; y++) {
      for (let x = leftStart; x <= leftEnd; x++) {
        const idx = (y * img.bitmap.width + x) * 4;
        const col = classifyColor(img.bitmap.data[idx], img.bitmap.data[idx+1], img.bitmap.data[idx+2]);
        if (col && col !== 'gray') {
          swatchColors[col] = (swatchColors[col] || 0) + 1;
        }
      }
    }

    console.log(`Line: "${text}" at (${bbox.x0},${bbox.y0})`);
    console.log(`   Text dominant colors:`, textColors);
    console.log(`   Swatch (left) dominant colors:`, swatchColors);
  }
}

async function run() {
  await testWordColors(path.join(__dirname, '..', 'uploads', 'spectrum_1784711204298_1.png'));
  await testWordColors(path.join(__dirname, '..', 'crystalvoilet', 'gpt.jpg'));
}
run();
