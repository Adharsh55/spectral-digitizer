const fs = require('fs');
const path = require('path');
const http = require('http');

async function testSingle(filename) {
    const p = path.join(__dirname, '..', 'crystalvoilet', filename);
    const boundary = '----WebKitFormBoundaryTest';
    const fileBuffer = fs.readFileSync(p);

    let body = [];
    body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`));
    body.push(fileBuffer);
    body.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const payload = Buffer.concat(body);

    const resData = await new Promise((resolve, reject) => {
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

    console.log(filename, '-> xRange:', resData.xRange, 'yRange:', resData.yRange, 'vertices:', resData.vertices);
}

async function main() {
    await testSingle('crystal voilet (1).png');
    await testSingle('crystal voilet (2).png');
    await testSingle('crystal voilet.png');
    await testSingle('The absorbance of crystal violetAOTwaterhexane at X 3, X 8, X 15.png');
}

main().catch(console.error);
