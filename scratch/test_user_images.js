const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

// Import server helpers
// We can test auto-detect logic directly or call the running server endpoints
const http = require('http');

async function testImageAutoDetect(imgPath) {
    const filename = path.basename(imgPath);
    console.log(`\n========================================`);
    console.log(`Testing image: ${filename}`);
    console.log(`========================================`);

    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const fileBuffer = fs.readFileSync(imgPath);

    let body = [];
    body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`));
    body.push(fileBuffer);
    body.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const payload = Buffer.concat(body);

    const postData = (endpoint) => new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3001,
            path: endpoint,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': payload.length
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ raw: data });
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });

    try {
        const autoRes = await postData('/api/auto-detect');
        console.log(`[Auto-Detect Result]`);
        console.log(`xRange:`, autoRes.xRange);
        console.log(`yRange:`, autoRes.yRange);
        console.log(`xLabel:`, autoRes.xLabel);
        console.log(`yLabel:`, autoRes.yLabel);
        console.log(`vertices:`, autoRes.vertices);
        if (autoRes.quality) {
            console.log(`quality score:`, autoRes.quality.score, `warnings:`, autoRes.quality.warnings);
        }

        // Now test digitize with detected vertices and ranges
        if (autoRes.vertices && autoRes.vertices.length >= 3) {
            const digitizeBoundary = '----WebKitFormBoundaryDigitize';
            const digBody = [];
            digBody.push(Buffer.from(`--${digitizeBoundary}\r\nContent-Disposition: form-data; name="files"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`));
            digBody.push(fileBuffer);
            digBody.push(Buffer.from(`\r\n--${digitizeBoundary}\r\nContent-Disposition: form-data; name="vertices"\r\n\r\n${JSON.stringify(autoRes.vertices)}`));
            digBody.push(Buffer.from(`\r\n--${digitizeBoundary}\r\nContent-Disposition: form-data; name="xRange"\r\n\r\n${JSON.stringify(autoRes.xRange || [200, 800])}`));
            digBody.push(Buffer.from(`\r\n--${digitizeBoundary}\r\nContent-Disposition: form-data; name="yRange"\r\n\r\n${JSON.stringify(autoRes.yRange || [0, 1])}`));
            digBody.push(Buffer.from(`\r\n--${digitizeBoundary}\r\nContent-Disposition: form-data; name="configs"\r\n\r\n${JSON.stringify({ targetMolecule: 'Crystal Violet' })}`));
            digBody.push(Buffer.from(`\r\n--${digitizeBoundary}--\r\n`));
            const digPayload = Buffer.concat(digBody);

            const digRes = await new Promise((resolve, reject) => {
                const req = http.request({
                    hostname: 'localhost',
                    port: 3001,
                    path: '/api/digitize',
                    method: 'POST',
                    headers: {
                        'Content-Type': `multipart/form-data; boundary=${digitizeBoundary}`,
                        'Content-Length': digPayload.length
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            resolve({ raw: data });
                        }
                    });
                });
                req.on('error', reject);
                req.write(digPayload);
                req.end();
            });

            console.log(`[Digitize Result] Curves found:`, digRes.curves ? digRes.curves.length : 0);
            if (digRes.curves) {
                digRes.curves.forEach((c, idx) => {
                    const minX = Math.min(...c.data.map(p => p[0]));
                    const maxX = Math.max(...c.data.map(p => p[0]));
                    const minY = Math.min(...c.data.map(p => p[1]));
                    const maxY = Math.max(...c.data.map(p => p[1]));
                    console.log(`  Curve ${idx + 1} (${c.name || c.color}): ${c.data.length} points, X: [${minX.toFixed(1)}, ${maxX.toFixed(1)}], Y: [${minY.toFixed(2)}, ${maxY.toFixed(2)}]`);
                });
            }
            if (digRes.error) {
                console.log(`  Error:`, digRes.error);
            }
            return { autoRes, digRes };
        }
    } catch (err) {
        console.error(`Failed on ${filename}:`, err.message);
    }
}

async function run() {
    const dir = path.join(__dirname, '..', 'crystalvoilet');
    const files = [
        'Screenshot 2026-07-06 185921.png',
        'Screenshot 2026-07-06 185948.png',
        'Screenshot 2026-07-06 190038.png',
        'Screenshot 2026-07-06 190147.png'
    ];

    const results = [];
    for (const f of files) {
        const p = path.join(dir, f);
        if (fs.existsSync(p)) {
            const res = await testImageAutoDetect(p);
            results.push({ file: f, res });
        } else {
            console.log('File not found:', p);
        }
    }
}

run();
