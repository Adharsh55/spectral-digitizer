const fs = require('fs');
const path = require('path');
const http = require('http');

async function testDigitizeOnCleanFiles() {
    const files = [
        'crystal voilet (1).png'
    ];

    for (const f of files) {
        console.log(`\n========================================`);
        console.log(`Processing: ${f}`);
        console.log(`========================================`);
        const p = path.join(__dirname, '..', 'crystalvoilet', f);
        const boundary = '----WebKitFormBoundaryTest';
        const fileBuffer = fs.readFileSync(p);

        let body = [];
        body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${f}"\r\nContent-Type: image/png\r\n\r\n`));
        body.push(fileBuffer);
        body.push(Buffer.from(`\r\n--${boundary}--\r\n`));
        const payload = Buffer.concat(body);

        // 1. Auto detect
        const autoRes = await new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3001,
                path: '/api/auto-detect',
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': payload.length
                }
            }, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => resolve(JSON.parse(data)));
            });
            req.on('error', reject);
            req.write(payload);
            req.end();
        });

        console.log('xRange:', autoRes.xRange, 'yRange:', autoRes.yRange, 'vertices:', autoRes.vertices);

        // 2. Digitize
        const digBoundary = '----WebKitFormBoundaryDig';
        let digBody = [];
        digBody.push(Buffer.from(`--${digBoundary}\r\nContent-Disposition: form-data; name="files"; filename="${f}"\r\nContent-Type: image/png\r\n\r\n`));
        digBody.push(fileBuffer);
        digBody.push(Buffer.from(`\r\n--${digBoundary}\r\nContent-Disposition: form-data; name="vertices"\r\n\r\n${JSON.stringify(autoRes.vertices)}`));
        digBody.push(Buffer.from(`\r\n--${digBoundary}\r\nContent-Disposition: form-data; name="xRange"\r\n\r\n${JSON.stringify(autoRes.xRange)}`));
        digBody.push(Buffer.from(`\r\n--${digBoundary}\r\nContent-Disposition: form-data; name="yRange"\r\n\r\n${JSON.stringify(autoRes.yRange)}`));
        digBody.push(Buffer.from(`\r\n--${digBoundary}\r\nContent-Disposition: form-data; name="targetMolecule"\r\n\r\nCrystal Violet`));
        digBody.push(Buffer.from(`\r\n--${digBoundary}--\r\n`));
        const digPayload = Buffer.concat(digBody);

        const digRes = await new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3001,
                path: '/api/digitize',
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${digBoundary}`,
                    'Content-Length': digPayload.length
                }
            }, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => resolve(JSON.parse(data)));
            });
            req.on('error', reject);
            req.write(digPayload);
            req.end();
        });

        if (digRes.curves) {
            console.log(`Curves found: ${digRes.curves.length}`);
            digRes.curves.forEach((c, idx) => {
                let peakX = 0, peakY = -Infinity;
                c.data.forEach(pt => {
                    if (pt[1] > peakY) { peakY = pt[1]; peakX = pt[0]; }
                });
                console.log(`  Curve ${idx+1} (${c.color || c.name}): ${c.data.length} pts, Peak at ${peakX.toFixed(1)} nm (Y=${peakY.toFixed(3)})`);
            });
        if (digRes.decomposition && digRes.decomposition.curveAnalyses) {
            console.log('--- Ranked Analyses ---');
            digRes.decomposition.curveAnalyses.slice(0, 10).forEach(a => {
                console.log(`  ${a.curveId}: score=${a.confidencePercent} (isTarget=${a.isTarget}, pts=${a.curveRef?.data?.length}, peaks=${a.features?.peaks?.map(p => p.wavelength.toFixed(1)).join(',')})`);
            });
        }

        } else {
            console.log('Error:', digRes.error);
        }
    }
}

testDigitizeOnCleanFiles().catch(console.error);
