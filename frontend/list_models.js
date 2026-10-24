const https = require('https');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not found in .env.local');
    process.exit(1);
}

const listModels = (version) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/${version}/models?key=${apiKey}`,
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ version, status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ version, status: res.statusCode, error: 'Failed to parse JSON', raw: data });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
};

async function run() {
    console.log('Checking model availability for API Key...');
    try {
        const v1Result = await listModels('v1');
        console.log('\n--- v1 Models ---');
        console.log('Status:', v1Result.status);
        if (v1Result.data?.models) {
            v1Result.data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(' - ' + m.name);
                }
            });
        } else {
            console.log('No models found or error:', v1Result.data?.error?.message || v1Result.error || 'Unknown error');
        }

        const v1betaResult = await listModels('v1beta');
        console.log('\n--- v1beta Models ---');
        console.log('Status:', v1betaResult.status);
        if (v1betaResult.data?.models) {
            v1betaResult.data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(' - ' + m.name);
                }
            });
        } else {
            console.log('No models found or error:', v1betaResult.data?.error?.message || v1betaResult.error || 'Unknown error');
        }
    } catch (err) {
        console.error('Diagnostic failed:', err.message);
    }
}

run();
