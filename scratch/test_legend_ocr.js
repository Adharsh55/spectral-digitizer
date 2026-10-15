const Jimp = require('jimp');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

async function testOCR(imgPath) {
    console.log(`\n=== Testing OCR on: ${path.basename(imgPath)} ===`);
    const img = await Jimp.read(imgPath);
    const buf = await img.getBufferAsync(Jimp.MIME_PNG);
    const res = await Tesseract.recognize(buf, 'eng', { logger: () => {} });
    console.log('--- Extracted Text ---');
    console.log(res.data.text.trim());
    console.log('--- Extracted Words Count:', res.data.words ? res.data.words.length : 0);
}

async function main() {
    const testFiles = [
        path.join(__dirname, '..', 'crystalvoilet', 'The absorbance of crystal violetAOTwaterhexane at X 3, X 8, X 15.png'),
        path.join(__dirname, '..', 'crystalvoilet', 'crystal voilet (1).png'),
        path.join(__dirname, '..', 'crystalvoilet', 'gpt.jpg'),
        path.join(__dirname, '..', 'uploads', 'spectrum_1784711204298_1.png')
    ];

    for (const f of testFiles) {
        if (fs.existsSync(f)) {
            await testOCR(f);
        } else {
            console.log('File not found:', f);
        }
    }
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
