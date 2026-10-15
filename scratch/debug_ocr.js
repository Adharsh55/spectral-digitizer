const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

async function debugImageOCR(imgPath) {
    const filename = path.basename(imgPath);
    console.log(`\n========================================`);
    console.log(`DEBUG OCR ON: ${filename}`);
    console.log(`========================================`);

    const img = await Jimp.read(imgPath);
    // preprocess
    if (img.bitmap.width < 1000 || img.bitmap.height < 700) {
        img.resize(img.bitmap.width * 2, img.bitmap.height * 2, Jimp.RESIZE_BICUBIC);
    }
    img.normalize();

    // Vertices detection
    // Let's import detectPlotVertices or inspect what vertices are found
    const serverModule = require('./server'); // or require functions
}
